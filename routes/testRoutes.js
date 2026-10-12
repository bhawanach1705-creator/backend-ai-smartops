import { Router } from "express";
import * as c from "../controllers/testController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { loadStudent } from "../middleware/studentContext.js";

const router = Router();
router.use(authenticate);

// Student portal (declared first so "/my" isn't captured by "/:id")
const student = [requirePermission("self:portal"), loadStudent];
router.get("/my", ...student, c.myTests);
router.post("/:id/start", ...student, c.start);
router.post("/:id/submit", ...student, c.submit);
router.get("/:id/my-result", ...student, c.myResult);

// Staff
router.get("/", requirePermission("tests:manage"), c.list);
router.post("/", requirePermission("tests:manage"), c.create);
router.get("/:id", requirePermission("tests:manage"), c.get);
router.put("/:id", requirePermission("tests:manage"), c.update);
router.patch("/:id/publish", requirePermission("tests:manage"), c.publish);
router.delete("/:id", requirePermission("tests:manage"), c.remove);
router.get("/:id/analytics", requirePermission("results:read"), c.analytics);
export default router;
