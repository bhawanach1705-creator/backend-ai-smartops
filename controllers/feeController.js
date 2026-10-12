import { asyncHandler } from "../utils/asyncHandler.js";
import * as svc from "../services/feeService.js";
import { logAudit } from "../services/auditService.js";

export const list = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.listFees(req.query) }));
export const summary = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getFeeSummary() }));
export const payments = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.listPayments(req.query) }));
export const studentFees = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentFees(req.params.studentId) }));
export const myFees = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentFees(req.student._id) }));

export const create = asyncHandler(async (req, res) => {
  const fee = await svc.createFee(req.body);
  await logAudit({ user: req.user, action: "FEE_CREATE", target: fee._id.toString(), metadata: { amount: fee.totalAmount }, ip: req.ip });
  res.status(201).json({ success: true, data: fee });
});

export const pay = asyncHandler(async (req, res) => {
  const out = await svc.recordPayment(req.params.id, req.body, req.user);
  await logAudit({ user: req.user, action: "FEE_PAYMENT", target: req.params.id, metadata: { amount: out.payment.amount, method: out.payment.method }, ip: req.ip });
  res.status(201).json({ success: true, data: out });
});

export const remove = asyncHandler(async (req, res) => {
  await svc.deleteFee(req.params.id);
  await logAudit({ user: req.user, action: "FEE_DELETE", target: req.params.id, ip: req.ip });
  res.json({ success: true, message: "Fee deleted" });
});
