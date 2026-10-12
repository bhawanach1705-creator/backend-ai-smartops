import { asyncHandler } from "../utils/asyncHandler.js";
import { validateLogin, validateRegistration } from "../utils/validators.js";
import { loginUser, registerUser } from "../services/authService.js";
import { logAudit } from "../services/auditService.js";

export const register = asyncHandler(async (req, res) => {
  validateRegistration(req.body);
  const { user, token } = await registerUser(req.body);
  await logAudit({ user, action: "AUTH_REGISTER", target: user.email, ip: req.ip });
  res.status(201).json({ success: true, data: { user: user.toSafeJSON(), token } });
});

export const login = asyncHandler(async (req, res) => {
  validateLogin(req.body);
  try {
    const { user, token } = await loginUser(req.body);
    await logAudit({ user, action: "AUTH_LOGIN", target: user.email, ip: req.ip });
    res.json({ success: true, data: { user: user.toSafeJSON(), token } });
  } catch (err) {
    await logAudit({ action: "AUTH_LOGIN", target: req.body.email, result: "FAILURE", ip: req.ip });
    throw err;
  }
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

/** JWT is stateless: client discards the token; we record the event. */
export const logout = asyncHandler(async (req, res) => {
  await logAudit({ user: req.user, action: "AUTH_LOGOUT", target: req.user.email, ip: req.ip });
  res.json({ success: true, message: "Logged out" });
});
