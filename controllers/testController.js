import { asyncHandler } from "../utils/asyncHandler.js";
import * as svc from "../services/testService.js";
import { logAudit } from "../services/auditService.js";

// ----- staff -----
export const list = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.listTestsForStaff() }));
export const get = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getTestForStaff(req.params.id) }));
export const analytics = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getTestAnalytics(req.params.id) }));

export const create = asyncHandler(async (req, res) => {
  const t = await svc.createTest(req.body, req.user);
  await logAudit({ user: req.user, action: "TEST_CREATE", target: t.title, ip: req.ip });
  res.status(201).json({ success: true, data: t });
});
export const update = asyncHandler(async (req, res) => {
  const t = await svc.updateTest(req.params.id, req.body);
  await logAudit({ user: req.user, action: "TEST_UPDATE", target: t.title, ip: req.ip });
  res.json({ success: true, data: t });
});
export const publish = asyncHandler(async (req, res) => {
  const t = await svc.setPublished(req.params.id, req.body.isPublished !== false);
  await logAudit({ user: req.user, action: t.isPublished ? "TEST_PUBLISH" : "TEST_UNPUBLISH", target: t.title, ip: req.ip });
  res.json({ success: true, data: t });
});
export const remove = asyncHandler(async (req, res) => {
  const t = await svc.deleteTest(req.params.id);
  await logAudit({ user: req.user, action: "TEST_DELETE", target: t.title, ip: req.ip });
  res.json({ success: true, message: "Test deleted" });
});

// ----- student -----
export const myTests = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.listTestsForStudent(req.student) }));
export const start = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.startAttempt(req.params.id, req.student) }));
export const submit = asyncHandler(async (req, res) => {
  const r = await svc.submitAttempt(req.params.id, req.student, req.body.answers);
  await logAudit({ user: req.user, action: "TEST_SUBMIT", target: req.params.id, metadata: { score: r.score, status: r.status }, ip: req.ip });
  res.json({ success: true, data: { score: r.score, totalMarks: r.totalMarks, percentage: r.percentage, status: r.status } });
});
export const myResult = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentResult(req.params.id, req.student) }));
