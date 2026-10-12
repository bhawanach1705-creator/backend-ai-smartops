import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ALL_ROLES, ROLES } from "../config/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.STUDENT, index: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const { _id, name, email, role, isActive, lastLoginAt, createdAt } = this;
  return { id: _id, name, email, role, isActive, lastLoginAt, createdAt };
};

export default mongoose.model("User", userSchema);
