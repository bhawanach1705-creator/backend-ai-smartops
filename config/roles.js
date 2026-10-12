/** Central RBAC definition. Backend enforces these; frontend only uses them to hide UI. */
export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
});

export const ALL_ROLES = Object.values(ROLES);
const ADMINS = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const STAFF = [...ADMINS, ROLES.TEACHER];

export const PERMISSIONS = Object.freeze({
  "users:read": ADMINS,
  "users:create": ADMINS,
  "users:update": ADMINS,
  "users:delete": [ROLES.SUPER_ADMIN],
  "users:assign-admin": [ROLES.SUPER_ADMIN],

  "students:read": STAFF,
  "students:write": ADMINS,
  "students:delete": ADMINS,
  "batches:write": ADMINS,

  "attendance:read": STAFF,
  "attendance:mark": STAFF,

  "fees:read": ADMINS,
  "fees:write": ADMINS,

  "tests:manage": STAFF,
  "results:read": STAFF,

  "self:portal": [ROLES.STUDENT],
});

export const hasPermission = (role, permission) => (PERMISSIONS[permission] || []).includes(role);
