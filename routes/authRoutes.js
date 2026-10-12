import { Router } from "express";
import { register, login, me, logout } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authenticate, me);
router.post("/logout", authenticate, logout);
export default router;
