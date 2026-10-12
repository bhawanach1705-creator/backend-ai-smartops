import { asyncHandler } from "../utils/asyncHandler.js";
import * as svc from "../services/testService.js";

export const myHistory = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentHistory(req.student._id) }));
export const myTrend = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentTrend(req.student._id) }));
export const studentHistory = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentHistory(req.params.studentId) }));
export const studentTrend = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.getStudentTrend(req.params.studentId) }));
