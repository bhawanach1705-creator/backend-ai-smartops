import { asyncHandler } from "../utils/asyncHandler.js";
import * as svc from "../services/attendanceService.js";
import { logAudit } from "../services/auditService.js";

export const mark = asyncHandler(async (req, res) => {
  const result = await svc.markAttendance(req.body, req.user);
  await logAudit({ user: req.user, action: "ATTENDANCE_MARK", target: `batch:${req.body.batch}`, metadata: { date: result.date, count: req.body.records.length }, ip: req.ip });
  res.json({ success: true, data: result });
});
export const sheet = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getDailySheet(req.query) }));
export const summary = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getSummary(req.query) }));
export const trend = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getTrend(req.query) }));
export const studentHistory = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentHistory(req.params.studentId, req.query) }));
export const myHistory = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentHistory(req.student._id, req.query) }));
