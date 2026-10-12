import { Router } from "express";
import * as c from "../controllers/studentController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { loadStudent } from "../middleware/studentContext.js";

const router = Router();
router.use(authenticate);

router.get("/me", requirePermission("self:portal"), loadStudent, c.me);

router.get("/batches", requirePermission("students:read"), c.listBatches);
router.post("/batches", requirePermission("batches:write"), c.createBatch);
router.patch("/batches/:id", requirePermission("batches:write"), c.updateBatch);
router.delete("/batches/:id", requirePermission("batches:write"), c.deleteBatch);

router.get("/", requirePermission("students:read"), c.list);
router.post("/", requirePermission("students:write"), c.create);
router.get("/:id", requirePermission("students:read"), c.get);
router.patch("/:id", requirePermission("students:write"), c.update);
router.delete("/:id", requirePermission("students:delete"), c.remove);
export default router;
