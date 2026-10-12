import { Router } from "express";
import * as c from "../controllers/resultController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { loadStudent } from "../middleware/studentContext.js";

const router = Router();
router.use(authenticate);
router.get("/me", requirePermission("self:portal"), loadStudent, c.myHistory);
router.get("/me/trend", requirePermission("self:portal"), loadStudent, c.myTrend);
router.get("/student/:studentId", requirePermission("results:read"), c.studentHistory);
router.get("/student/:studentId/trend", requirePermission("results:read"), c.studentTrend);
export default router;
