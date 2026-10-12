/** Demo data for Phase 3: 2 batches, 12 students (+logins), 45 days attendance, fees, 1 test. Run: npm run seed:demo */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Fee from "../models/Fee.js";
import FeePayment from "../models/FeePayment.js";
import Test from "../models/Test.js";
import { toDay } from "./validators.js";

const NAMES = ["Rahul Sharma", "Priya Verma", "Amit Kumar", "Sneha Patel", "Vikram Singh", "Anjali Gupta", "Rohan Das", "Kavya Nair", "Arjun Reddy", "Neha Joshi", "Karan Mehta", "Pooja Iyer"];

try {
  await connectDB(env.mongoUri);
  if (await Student.exists({ studentId: "STU-001" })) { console.log("[seed] demo data already present"); process.exit(0); }

  const [b1, b2] = await Batch.create([
    { name: "FS-2026-A", course: "Full Stack Development", startDate: new Date("2026-07-01") },
    { name: "DS-2026-A", course: "Data Science", startDate: new Date("2026-07-15") },
  ]);

  const students = [];
  for (const [i, name] of NAMES.entries()) {
    const id = `STU-${String(i + 1).padStart(3, "0")}`;
    const email = `${name.split(" ")[0].toLowerCase()}@student.smartops.local`;
    const user = await User.create({ name, email, password: "Student123", role: "STUDENT" });
    students.push(await Student.create({ studentId: id, name, email, mobile: `98${String(10000000 + i * 1234567).slice(0, 8)}`,
      parentMobile: `97${String(20000000 + i * 7654321).slice(0, 8)}`, address: "Bengaluru", batch: i % 2 ? b2._id : b1._id,
      course: i % 2 ? b2.course : b1.course, rfidTag: `RFID${1000 + i}`, user: user._id }));
  }

  // Attendance: student 0 (Rahul) declines over time to demonstrate risk
  const ops = [];
  for (let d = 44; d >= 0; d--) {
    const date = toDay(new Date(Date.now() - d * 864e5));
    if (date.getUTCDay() === 0) continue; // Sundays off
    for (const [i, s] of students.entries()) {
      const pPresent = i === 0 ? 0.95 - (44 - d) * 0.015 : 0.75 + (i % 4) * 0.06;
      const r = Math.random();
      const status = r < pPresent ? (r < 0.05 ? "LATE" : "PRESENT") : r > 0.97 ? "LEAVE" : "ABSENT";
      ops.push({ student: s._id, batch: s.batch, date, status, source: i % 3 === 0 ? "RFID" : "MANUAL" });
    }
  }
  await Attendance.insertMany(ops);

  for (const [i, s] of students.entries()) {
    const fee = await Fee.create({ student: s._id, title: "Term 1 Tuition", totalAmount: 45000, paidAmount: 0,
      dueDate: new Date(Date.now() + (i % 3 === 0 ? -10 : 20) * 864e5) });
    const paid = [45000, 20000, 0, 30000][i % 4];
    if (paid) { fee.paidAmount = paid; await fee.save(); await FeePayment.create({ fee: fee._id, student: s._id, amount: paid, method: "UPI" }); }
  }

  await Test.create({
    title: "JavaScript Fundamentals", batch: b1._id, durationMinutes: 10, isPublished: true,
    startAt: new Date(Date.now() - 864e5), endAt: new Date(Date.now() + 7 * 864e5),
    questions: [
      { text: "Which keyword declares a block-scoped variable?", options: ["var", "let", "function", "global"], correctIndex: 1 },
      { text: "typeof null returns?", options: ["null", "undefined", "object", "number"], correctIndex: 2 },
      { text: "Which method converts JSON text to an object?", options: ["JSON.stringify", "JSON.parse", "JSON.toObject", "Object.json"], correctIndex: 1 },
      { text: "What does === check?", options: ["Value only", "Type only", "Value and type", "Reference only"], correctIndex: 2 },
    ],
  });

  console.log(`[seed] Demo ready. Student login: rahul@student.smartops.local / Student123`);
} catch (err) {
  console.error("[seed] failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
