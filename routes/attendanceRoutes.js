import { Router } from "express";
import * as c from "../controllers/attendanceController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { loadStudent } from "../middleware/studentContext.js";

const router = Router();
router.use(authenticate);
router.get("/me", requirePermission("self:portal"), loadStudent, c.myHistory);
router.post("/mark", requirePermission("attendance:mark"), c.mark);
router.get("/sheet", requirePermission("attendance:read"), c.sheet);
router.get("/summary", requirePermission("attendance:read"), c.summary);
router.get("/trend", requirePermission("attendance:read"), c.trend);
router.get("/student/:studentId", requirePermission("attendance:read"), c.studentHistory);
export default router;
