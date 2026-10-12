import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../services/tokenService.js";
import { hasPermission } from "../config/roles.js";

/** Verifies Bearer JWT and loads a fresh user (so disabled/role-changed users take effect immediately). */
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Authentication required");

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, "User no longer active");
  req.user = user;
  next();
});

/** Role gate: authorize("ADMIN", "SUPER_ADMIN") */
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, "Forbidden: insufficient role"));

/** Permission gate: requirePermission("users:delete") */
export const requirePermission = (permission) => (req, res, next) =>
  hasPermission(req.user?.role, permission) ? next() : next(new ApiError(403, `Forbidden: missing ${permission}`));
