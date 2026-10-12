import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { toDay } from "../utils/validators.js";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"];
// LATE counts as attended; LEAVE is excluded from the denominator
const attendedExpr = { $cond: [{ $in: ["$status", ["PRESENT", "LATE"]] }, 1, 0] };
const countedExpr = { $cond: [{ $eq: ["$status", "LEAVE"] }, 0, 1] };

/** Bulk upsert for a batch/day: records = [{ student, status, remarks }] */
export async function markAttendance({ date, batch, records }, user) {
  if (!Array.isArray(records) || !records.length) throw new ApiError(400, "records[] is required");
  const day = toDay(date);
  if (day > toDay()) throw new ApiError(400, "Cannot mark attendance for a future date");
  for (const r of records) if (!STATUSES.includes(r.status)) throw new ApiError(400, `Invalid status: ${r.status}`);

  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.student, date: day },
      update: { $set: { status: r.status, remarks: r.remarks, batch, markedBy: user._id, source: "MANUAL" } },
      upsert: true,
    },
  }));
  const res = await Attendance.bulkWrite(ops);
  return { date: day, upserted: res.upsertedCount, modified: res.modifiedCount };
}

/** Roster for a batch on a date – students merged with any existing marks. */
export async function getDailySheet({ batch, date }) {
  if (!batch) throw new ApiError(400, "batch is required");
  const day = toDay(date);
  const [students, marks] = await Promise.all([
    Student.find({ batch, status: "ACTIVE" }).select("studentId name").sort({ name: 1 }),
    Attendance.find({ batch, date: day }),
  ]);
  const byStudent = new Map(marks.map((m) => [m.student.toString(), m]));
  return {
    date: day,
    rows: students.map((s) => ({
      student: s._id, studentId: s.studentId, name: s.name,
      status: byStudent.get(s._id.toString())?.status || null,
      source: byStudent.get(s._id.toString())?.source || null,
    })),
  };
}

/** Per-student attendance % over a date range (default: last 30 days). */
export async function getSummary({ from, to, batch, studentId }) {
  const end = toDay(to);
  const start = from ? toDay(from) : new Date(end.getTime() - 29 * 864e5);
  const match = { date: { $gte: start, $lte: end } };
  if (batch) match.batch = new mongoose.Types.ObjectId(batch);
  if (studentId) match.student = new mongoose.Types.ObjectId(studentId);

  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: "$student", attended: { $sum: attendedExpr }, counted: { $sum: countedExpr }, absences: { $sum: { $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0] } } } },
    { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "s" } },
    { $unwind: "$s" },
    { $project: { _id: 0, student: "$_id", studentId: "$s.studentId", name: "$s.name", attended: 1, counted: 1, absences: 1,
        percentage: { $cond: [{ $gt: ["$counted", 0] }, { $round: [{ $multiply: [{ $divide: ["$attended", "$counted"] }, 100] }, 1] }, null] } } },
    { $sort: { percentage: 1 } },
  ]);
  return { from: start, to: end, rows };
}

/** Day-by-day present % (for the attendance trend chart). */
export async function getTrend({ days = 30, batch }) {
  const end = toDay();
  const start = new Date(end.getTime() - (Math.min(Number(days), 180) - 1) * 864e5);
  const match = { date: { $gte: start, $lte: end } };
  if (batch) match.batch = new mongoose.Types.ObjectId(batch);
  return Attendance.aggregate([
    { $match: match },
    { $group: { _id: "$date", attended: { $sum: attendedExpr }, counted: { $sum: countedExpr } } },
    { $project: { _id: 0, date: "$_id", percentage: { $round: [{ $multiply: [{ $divide: ["$attended", { $max: ["$counted", 1] }] }, 100] }, 1] } } },
    { $sort: { date: 1 } },
  ]);
}

/** Monthly breakdown for one student (history + report). */
export async function getStudentHistory(studentId, { months = 6 } = {}) {
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - Number(months));
  const records = await Attendance.find({ student: studentId, date: { $gte: toDay(since) } }).sort({ date: -1 });
  const monthly = {};
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 7);
    monthly[key] ??= { month: key, attended: 0, counted: 0 };
    if (r.status !== "LEAVE") monthly[key].counted++;
    if (["PRESENT", "LATE"].includes(r.status)) monthly[key].attended++;
  }
  const months_ = Object.values(monthly).map((m) => ({ ...m, percentage: m.counted ? Math.round((m.attended / m.counted) * 1000) / 10 : null })).sort((a, b) => a.month.localeCompare(b.month));
  const tot = months_.reduce((a, m) => ({ attended: a.attended + m.attended, counted: a.counted + m.counted }), { attended: 0, counted: 0 });
  return {
    overallPercentage: tot.counted ? Math.round((tot.attended / tot.counted) * 1000) / 10 : null,
    monthly: months_,
    records: records.slice(0, 60).map((r) => ({ date: r.date, status: r.status, source: r.source })),
  };
}
