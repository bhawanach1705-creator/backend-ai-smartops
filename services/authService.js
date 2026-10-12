import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { ROLES } from "../config/roles.js";
import { signToken } from "./tokenService.js";

export async function registerUser({ name, email, password }) {
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(409, "Email already registered");
  // Public registration ALWAYS creates a STUDENT. Elevated roles are assigned by admins.
  const user = await User.create({ name, email, password, role: ROLES.STUDENT });
  return { user, token: signToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  // Same message for both cases to prevent account enumeration
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, "Invalid email or password");
  if (!user.isActive) throw new ApiError(403, "Account is disabled");
  user.lastLoginAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
}
