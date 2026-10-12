import mongoose from "mongoose";

const feeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    title: { type: String, required: true, trim: true }, // e.g. "Term 1 Tuition"
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

feeSchema.virtual("pendingAmount").get(function () {
  return Math.max(this.totalAmount - this.paidAmount, 0);
});

/** PAID / PARTIAL / PENDING / OVERDUE derived from amounts and due date – never stored stale. */
feeSchema.virtual("status").get(function () {
  if (this.paidAmount >= this.totalAmount) return "PAID";
  if (this.dueDate < new Date()) return "OVERDUE";
  return this.paidAmount > 0 ? "PARTIAL" : "PENDING";
});

export default mongoose.model("Fee", feeSchema);
