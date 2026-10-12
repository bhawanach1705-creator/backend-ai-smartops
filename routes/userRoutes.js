import { Router } from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/userController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("users:read"), getUsers);
router.post("/", requirePermission("users:create"), createUser);
router.patch("/:id", requirePermission("users:update"), updateUser);
router.delete("/:id", requirePermission("users:delete"), deleteUser);
export default router;
