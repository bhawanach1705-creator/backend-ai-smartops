import ApiError from "./ApiError.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
const MOBILE_RE = /^[0-9+\-\s]{7,15}$/;

export function validateRegistration({ name, email, password }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (!email || !EMAIL_RE.test(email)) errors.email = "Valid email is required";
  if (!password || !PASSWORD_RE.test(password))
    errors.password = "Password must be 8+ characters with letters and numbers";
  if (Object.keys(errors).length) throw new ApiError(400, "Validation failed", errors);
}

export function validateLogin({ email, password }) {
  if (!email || !password) throw new ApiError(400, "Email and password are required");
}

export function validateStudent(body, { partial = false } = {}) {
  const errors = {};
  const need = (k) => !partial || body[k] !== undefined;
  if (need("studentId") && !/^[A-Za-z0-9-]{3,20}$/.test(body.studentId || "")) errors.studentId = "3-20 letters, digits or dashes";
  if (need("name") && (!body.name || body.name.trim().length < 2)) errors.name = "Name is required";
  if (need("email") && !EMAIL_RE.test(body.email || "")) errors.email = "Valid email is required";
  if (body.mobile && !MOBILE_RE.test(body.mobile)) errors.mobile = "Invalid mobile";
  if (body.parentMobile && !MOBILE_RE.test(body.parentMobile)) errors.parentMobile = "Invalid mobile";
  if (Object.keys(errors).length) throw new ApiError(400, "Validation failed", errors);
}

/** Pick only whitelisted keys from a body – prevents mass assignment. */
export const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Normalise any date input to UTC midnight so one attendance row exists per day. */
export function toDay(input) {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid date");
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function paginate(query) {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const page = Math.max(Number(query.page) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
}
