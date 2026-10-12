import { asyncHandler } from "../utils/asyncHandler.js";
import { validateStudent } from "../utils/validators.js";
import * as svc from "../services/studentService.js";
import { logAudit } from "../services/auditService.js";

export const list = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.listStudents(req.query) }));
export const get = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudent(req.params.id) }));
export const me = asyncHandler(async (req, res) => res.json({ success: true, data: req.student }));

export const create = asyncHandler(async (req, res) => {
  validateStudent(req.body);
  const s = await svc.createStudent(req.body);
  await logAudit({ user: req.user, action: "STUDENT_CREATE", target: s.studentId, ip: req.ip });
  res.status(201).json({ success: true, data: s });
});

export const update = asyncHandler(async (req, res) => {
  validateStudent(req.body, { partial: true });
  const s = await svc.updateStudent(req.params.id, req.body);
  await logAudit({ user: req.user, action: "STUDENT_UPDATE", target: s.studentId, metadata: { fields: Object.keys(req.body) }, ip: req.ip });
  res.json({ success: true, data: s });
});

export const remove = asyncHandler(async (req, res) => {
  const s = await svc.deleteStudent(req.params.id);
  await logAudit({ user: req.user, action: "STUDENT_DELETE", target: s.studentId, ip: req.ip });
  res.json({ success: true, message: "Student deleted" });
});

export const listBatches = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.listBatches() }));
export const createBatch = asyncHandler(async (req, res) => {
  const b = await svc.createBatch(req.body);
  await logAudit({ user: req.user, action: "BATCH_CREATE", target: b.name, ip: req.ip });
  res.status(201).json({ success: true, data: b });
});
export const updateBatch = asyncHandler(async (req, res) => {
  const b = await svc.updateBatch(req.params.id, req.body);
  await logAudit({ user: req.user, action: "BATCH_UPDATE", target: b.name, ip: req.ip });
  res.json({ success: true, data: b });
});
export const deleteBatch = asyncHandler(async (req, res) => {
  const b = await svc.deleteBatch(req.params.id);
  await logAudit({ user: req.user, action: "BATCH_DELETE", target: b.name, ip: req.ip });
  res.json({ success: true, message: "Batch deleted" });
});
