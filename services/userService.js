import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { ALL_ROLES, ROLES, hasPermission } from "../config/roles.js";

const ELEVATED = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/** ADMIN may manage TEACHER/STUDENT only; SUPER_ADMIN may manage anyone. */
function assertCanManage(actor, targetRole) {
  if (ELEVATED.includes(targetRole) && !hasPermission(actor.role, "users:assign-admin"))
    throw new ApiError(403, "Only SUPER_ADMIN can manage admin accounts");
}

export async function listUsers({ search = "", role, page = 1, limit = 20 }) {
  const query = {};
  if (role && ALL_ROLES.includes(role)) query.role = role;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: rx }, { email: rx }];
  }
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    User.countDocuments(query),
  ]);
  return { items: items.map((u) => u.toSafeJSON()), total, page: Number(page) || 1, limit: safeLimit };
}

export async function createUser(actor, { name, email, password, role = ROLES.STUDENT }) {
  if (!ALL_ROLES.includes(role)) throw new ApiError(400, "Invalid role");
  assertCanManage(actor, role);
  if (await User.findOne({ email: email.toLowerCase() })) throw new ApiError(409, "Email already registered");
  return User.create({ name, email, password, role });
}

export async function updateUser(actor, id, { name, role, isActive }) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");
  assertCanManage(actor, user.role);
  if (role !== undefined) {
    if (!ALL_ROLES.includes(role)) throw new ApiError(400, "Invalid role");
    assertCanManage(actor, role);
    if (user._id.equals(actor._id)) throw new ApiError(400, "You cannot change your own role");
    user.role = role;
  }
  if (name !== undefined) user.name = name;
  if (isActive !== undefined) {
    if (user._id.equals(actor._id)) throw new ApiError(400, "You cannot deactivate yourself");
    user.isActive = Boolean(isActive);
  }
  await user.save();
  return user;
}

export async function deleteUser(actor, id) {
  if (actor._id.equals(id)) throw new ApiError(400, "You cannot delete yourself");
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");
  await user.deleteOne();
  return user;
}
