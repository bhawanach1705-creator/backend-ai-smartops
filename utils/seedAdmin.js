/** Creates the first SUPER_ADMIN from .env. Run once: npm run seed:admin */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import { ROLES } from "../config/roles.js";

const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

try {
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) throw new Error("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD missing");
  await connectDB(env.mongoUri);
  const existing = await User.findOne({ email: SEED_ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`[seed] ${SEED_ADMIN_EMAIL} already exists (${existing.role})`);
  } else {
    await User.create({ name: SEED_ADMIN_NAME || "Super Admin", email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD, role: ROLES.SUPER_ADMIN });
    console.log(`[seed] SUPER_ADMIN created: ${SEED_ADMIN_EMAIL}`);
  }
} catch (err) {
  console.error("[seed] failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
