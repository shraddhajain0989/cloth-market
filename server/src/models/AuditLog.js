import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetId: { type: String, index: true },
    targetType: { type: String, default: "rental" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export async function logAction({ actorId, actorRole, action, targetId, targetType = "rental", metadata = {} }) {
  try {
    await AuditLog.create({
      actorId: String(actorId),
      actorRole: String(actorRole),
      action: String(action),
      targetId: targetId ? String(targetId) : undefined,
      targetType,
      metadata
    });
  } catch (err) {
    // Non-blocking log failure
    console.error("Audit log error:", err.message);
  }
}
