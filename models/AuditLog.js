import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    role: String,
    action: { type: String, required: true, index: true },
    target: String,
    metadata: { type: Object, default: {} },
    result: { type: String, enum: ["SUCCESS", "FAILURE"], default: "SUCCESS" },
    ip: String,
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);
auditLogSchema.index({ timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
