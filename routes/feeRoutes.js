import { Router } from "express";
import * as c from "../controllers/feeController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { loadStudent } from "../middleware/studentContext.js";

const router = Router();
router.use(authenticate);
router.get("/me", requirePermission("self:portal"), loadStudent, c.myFees);
router.get("/summary", requirePermission("fees:read"), c.summary);
router.get("/payments", requirePermission("fees:read"), c.payments);
router.get("/student/:studentId", requirePermission("fees:read"), c.studentFees);
router.get("/", requirePermission("fees:read"), c.list);
router.post("/", requirePermission("fees:write"), c.create);
router.post("/:id/payments", requirePermission("fees:write"), c.pay);
router.delete("/:id", requirePermission("fees:write"), c.remove);
export default router;
