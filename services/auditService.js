import AuditLog from "../models/AuditLog.js";

/** Never throws – audit failure must not break the main request. */
export async function logAudit({ user, action, target, metadata = {}, result = "SUCCESS", ip }) {
  try {
    await AuditLog.create({ userId: user?._id || user?.id, role: user?.role, action, target, metadata, result, ip });
  } catch (err) {
    console.error("[audit] failed:", err.message);
  }
}
