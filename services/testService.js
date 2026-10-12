import mongoose from "mongoose";
import Test from "../models/Test.js";
import TestResult from "../models/TestResult.js";
import ApiError from "../utils/ApiError.js";
import { pick } from "../utils/validators.js";

const FIELDS = ["title", "description", "batch", "durationMinutes", "startAt", "endAt", "questions"];
const GRACE_MS = 30 * 1000; // network grace on submit

function validateTest(t) {
  if (new Date(t.endAt) <= new Date(t.startAt)) throw new ApiError(400, "endAt must be after startAt");
  for (const [i, q] of (t.questions || []).entries()) {
    if (!q.text || !Array.isArray(q.options) || q.options.length < 2) throw new ApiError(400, `Question ${i + 1}: text and 2+ options required`);
    if (!(q.correctIndex >= 0 && q.correctIndex < q.options.length)) throw new ApiError(400, `Question ${i + 1}: invalid correctIndex`);
  }
}

export async function createTest(body, user) {
  const data = pick(body, FIELDS);
  validateTest(data);
  return Test.create({ ...data, createdBy: user._id });
}

export async function updateTest(id, body) {
  const test = await Test.findById(id);
  if (!test) throw new ApiError(404, "Test not found");
  if (test.isPublished && (await TestResult.exists({ test: id }))) throw new ApiError(400, "Test already has attempts and cannot be edited");
  Object.assign(test, pick(body, FIELDS));
  validateTest(test);
  await test.save();
  return test;
}

export async function setPublished(id, isPublished) {
  const test = await Test.findById(id);
  if (!test) throw new ApiError(404, "Test not found");
  if (isPublished && !test.questions.length) throw new ApiError(400, "Add questions before publishing");
  test.isPublished = isPublished;
  await test.save();
  return test;
}

export async function deleteTest(id) {
  if (await TestResult.exists({ test: id })) throw new ApiError(400, "Test has attempts and cannot be deleted");
  const t = await Test.findByIdAndDelete(id);
  if (!t) throw new ApiError(404, "Test not found");
  return t;
}

export const listTestsForStaff = () => Test.find().populate("batch", "name").sort({ startAt: -1 });

export async function getTestForStaff(id) {
  const t = await Test.findById(id).populate("batch", "name");
  if (!t) throw new ApiError(404, "Test not found");
  return t;
}

/** Published tests visible to a student (their batch or open tests) with their attempt status. */
export async function listTestsForStudent(student) {
  const tests = await Test.find({ isPublished: true, $or: [{ batch: student.batch?._id || student.batch }, { batch: null }] }).sort({ startAt: -1 });
  const results = await TestResult.find({ student: student._id, test: { $in: tests.map((t) => t._id) } });
  const byTest = new Map(results.map((r) => [r.test.toString(), r]));
  const now = new Date();
  return tests.map((t) => {
    const r = byTest.get(t._id.toString());
    return { ...t.toStudentJSON(), state: r ? r.status : now < t.startAt ? "UPCOMING" : now > t.endAt ? "CLOSED" : "OPEN",
      result: r?.status === "SUBMITTED" ? { score: r.score, totalMarks: r.totalMarks, percentage: r.percentage } : null };
  });
}

/** Starts (or resumes) an attempt; server owns the timer. */
export async function startAttempt(testId, student) {
  const test = await Test.findOne({ _id: testId, isPublished: true });
  if (!test) throw new ApiError(404, "Test not found");
  const now = new Date();
  if (now < test.startAt) throw new ApiError(400, "Test has not started yet");

  let result = await TestResult.findOne({ test: test._id, student: student._id });
  if (result?.status !== "IN_PROGRESS" && result) throw new ApiError(400, "You have already attempted this test");
  if (!result) {
    if (now > test.endAt) throw new ApiError(400, "Test window has closed");
    result = await TestResult.create({ test: test._id, student: student._id, totalMarks: test.totalMarks });
  }
  const deadline = new Date(Math.min(result.startedAt.getTime() + test.durationMinutes * 60000, test.endAt.getTime()));
  return { test: test.toStudentJSON(true), attemptId: result._id, startedAt: result.startedAt, deadline };
}

/** Scores server-side. Late submissions beyond the deadline (+grace) are marked EXPIRED and scored on what was sent. */
export async function submitAttempt(testId, student, answers = []) {
  const test = await Test.findById(testId);
  if (!test) throw new ApiError(404, "Test not found");
  const result = await TestResult.findOne({ test: testId, student: student._id });
  if (!result) throw new ApiError(400, "Start the test first");
  if (result.status !== "IN_PROGRESS") throw new ApiError(400, "Already submitted");

  const deadline = Math.min(result.startedAt.getTime() + test.durationMinutes * 60000, test.endAt.getTime());
  const late = Date.now() > deadline + GRACE_MS;

  const chosen = new Map(answers.map((a) => [String(a.question), Number(a.selectedIndex)]));
  let score = 0, correct = 0;
  const saved = test.questions.map((q) => {
    const sel = chosen.has(q._id.toString()) ? chosen.get(q._id.toString()) : null;
    if (sel === q.correctIndex) { score += q.marks; correct++; }
    return { question: q._id, selectedIndex: sel };
  });

  Object.assign(result, {
    answers: late ? [] : saved, score: late ? 0 : score, correctCount: late ? 0 : correct,
    totalMarks: test.totalMarks, percentage: late ? 0 : Math.round((score / (test.totalMarks || 1)) * 1000) / 10,
    status: late ? "EXPIRED" : "SUBMITTED", submittedAt: new Date(),
  });
  await result.save();
  return result;
}

/** Detailed review for a student – reveals answers only after submission. */
export async function getStudentResult(testId, student) {
  const [test, result] = await Promise.all([Test.findById(testId), TestResult.findOne({ test: testId, student: student._id })]);
  if (!test || !result || result.status === "IN_PROGRESS") throw new ApiError(404, "Result not found");
  const ans = new Map(result.answers.map((a) => [a.question.toString(), a.selectedIndex]));
  return {
    test: { id: test._id, title: test.title }, score: result.score, totalMarks: result.totalMarks, percentage: result.percentage,
    status: result.status, submittedAt: result.submittedAt,
    review: test.questions.map((q) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex, selectedIndex: ans.get(q._id.toString()) ?? null })),
  };
}

export const getStudentHistory = (studentId) =>
  TestResult.find({ student: studentId, status: { $ne: "IN_PROGRESS" } }).populate("test", "title startAt").sort({ submittedAt: -1 });

/** Attempts + stats + leaderboard for staff. */
export async function getTestAnalytics(testId) {
  const id = new mongoose.Types.ObjectId(testId);
  const [stats] = await TestResult.aggregate([
    { $match: { test: id, status: { $ne: "IN_PROGRESS" } } },
    { $group: { _id: null, attempts: { $sum: 1 }, average: { $avg: "$score" }, highest: { $max: "$score" }, lowest: { $min: "$score" }, avgPct: { $avg: "$percentage" } } },
  ]);
  const leaderboard = await TestResult.find({ test: id, status: { $ne: "IN_PROGRESS" } })
    .populate("student", "studentId name").sort({ score: -1, submittedAt: 1 }).limit(100);
  return {
    stats: stats ? { attempts: stats.attempts, average: +stats.average.toFixed(2), highest: stats.highest, lowest: stats.lowest, averagePercentage: +stats.avgPct.toFixed(1) } : { attempts: 0 },
    leaderboard: leaderboard.map((r, i) => ({ rank: i + 1, student: r.student, score: r.score, totalMarks: r.totalMarks, percentage: r.percentage, status: r.status, submittedAt: r.submittedAt })),
  };
}

/** Performance trend for one student across tests (chronological). */
export async function getStudentTrend(studentId) {
  const rows = await TestResult.find({ student: studentId, status: "SUBMITTED" }).populate("test", "title startAt").sort({ submittedAt: 1 });
  return rows.map((r) => ({ test: r.test?.title, date: r.submittedAt, percentage: r.percentage, score: r.score, totalMarks: r.totalMarks }));
}
