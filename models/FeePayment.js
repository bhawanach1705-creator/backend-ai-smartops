import mongoose from "mongoose";

const feePaymentSchema = new mongoose.Schema(
  {
    fee: { type: mongoose.Schema.Types.ObjectId, ref: "Fee", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"], default: "CASH" },
    reference: String,
    paidAt: { type: Date, default: Date.now, index: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FeePayment", feePaymentSchema);
