import { asyncHandler } from "../utils/asyncHandler.js";
import { validateRegistration } from "../utils/validators.js";
import * as userService from "../services/userService.js";
import { logAudit } from "../services/auditService.js";

export const getUsers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.listUsers(req.query) });
});

export const createUser = asyncHandler(async (req, res) => {
  validateRegistration(req.body);
  const user = await userService.createUser(req.user, req.body);
  await logAudit({ user: req.user, action: "USER_CREATE", target: user.email, metadata: { role: user.role }, ip: req.ip });
  res.status(201).json({ success: true, data: user.toSafeJSON() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body);
  await logAudit({ user: req.user, action: "USER_UPDATE", target: user.email, metadata: req.body, ip: req.ip });
  res.json({ success: true, data: user.toSafeJSON() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await userService.deleteUser(req.user, req.params.id);
  await logAudit({ user: req.user, action: "USER_DELETE", target: user.email, ip: req.ip });
  res.json({ success: true, message: "User deleted" });
});
