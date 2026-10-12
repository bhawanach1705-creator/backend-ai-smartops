import Fee from "../models/Fee.js";
import FeePayment from "../models/FeePayment.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { pick, toDay } from "../utils/validators.js";

export async function createFee(body) {
  const data = pick(body, ["student", "title", "totalAmount", "dueDate"]);
  if (!(await Student.exists({ _id: data.student }))) throw new ApiError(400, "Student not found");
  if (!(Number(data.totalAmount) > 0)) throw new ApiError(400, "totalAmount must be > 0");
  return Fee.create(data);
}

/** status filter is computed (virtual), so we translate it into a Mongo query. */
export async function listFees({ status, student }) {
  const now = new Date();
  const filter = {};
  if (student) filter.student = student;
  const isPaid = { $expr: { $gte: ["$paidAmount", "$totalAmount"] } };
  const notPaid = { $expr: { $lt: ["$paidAmount", "$totalAmount"] } };
  if (status === "PAID") Object.assign(filter, isPaid);
  if (status === "OVERDUE") Object.assign(filter, notPaid, { dueDate: { $lt: now } });
  if (status === "PENDING") Object.assign(filter, notPaid, { dueDate: { $gte: now } });
  return Fee.find(filter).populate("student", "studentId name email mobile").sort({ dueDate: 1 });
}

export async function getFeeSummary() {
  const [agg] = await Fee.aggregate([
    { $group: { _id: null, total: { $sum: "$totalAmount" }, paid: { $sum: "$paidAmount" },
        overdueCount: { $sum: { $cond: [{ $and: [{ $lt: ["$paidAmount", "$totalAmount"] }, { $lt: ["$dueDate", new Date()] }] }, 1, 0] } } } },
  ]);
  const todayStart = toDay();
  const [today] = await FeePayment.aggregate([
    { $match: { paidAt: { $gte: todayStart } } },
    { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return {
    totalFees: agg?.total || 0, paidFees: agg?.paid || 0, pendingFees: (agg?.total || 0) - (agg?.paid || 0),
    overdueCount: agg?.overdueCount || 0, todayCollection: today?.amount || 0, todayPayments: today?.count || 0,
  };
}

/**
 * Records a payment. The conditional $inc guarantees we never overpay even under
 * concurrent requests (no replica-set transaction required).
 */
export async function recordPayment(feeId, { amount, method, reference }, user) {
  const amt = Number(amount);
  if (!(amt > 0)) throw new ApiError(400, "amount must be > 0");
  const fee = await Fee.findOneAndUpdate(
    { _id: feeId, $expr: { $lte: [{ $add: ["$paidAmount", amt] }, "$totalAmount"] } },
    { $inc: { paidAmount: amt } },
    { new: true }
  );
  if (!fee) {
    if (!(await Fee.exists({ _id: feeId }))) throw new ApiError(404, "Fee not found");
    throw new ApiError(400, "Payment exceeds pending amount");
  }
  const payment = await FeePayment.create({ fee: fee._id, student: fee.student, amount: amt, method, reference, receivedBy: user._id });
  return { fee, payment };
}

export const listPayments = ({ student, fee, from }) => {
  const f = {};
  if (student) f.student = student;
  if (fee) f.fee = fee;
  if (from) f.paidAt = { $gte: toDay(from) };
  return FeePayment.find(f).populate("student", "studentId name").populate("fee", "title").sort({ paidAt: -1 }).limit(200);
};

export async function getStudentFees(studentId) {
  const [fees, payments] = await Promise.all([
    Fee.find({ student: studentId }).sort({ dueDate: 1 }),
    FeePayment.find({ student: studentId }).populate("fee", "title").sort({ paidAt: -1 }),
  ]);
  const total = fees.reduce((s, f) => s + f.totalAmount, 0);
  const paid = fees.reduce((s, f) => s + f.paidAmount, 0);
  return { fees, payments, total, paid, pending: total - paid };
}

export async function deleteFee(id) {
  if (await FeePayment.exists({ fee: id })) throw new ApiError(400, "Fee has payments and cannot be deleted");
  const f = await Fee.findByIdAndDelete(id);
  if (!f) throw new ApiError(404, "Fee not found");
  return f;
}
