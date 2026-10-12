import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { escapeRegex, paginate, pick } from "../utils/validators.js";
import { ROLES } from "../config/roles.js";

const FIELDS = ["studentId", "name", "gender", "email", "mobile", "parentMobile", "address", "batch", "course", "profilePhoto", "status", "rfidTag"];

export async function listStudents(query) {
  const filter = {};
  if (query.batch) filter.batch = query.batch;
  if (query.status) filter.status = query.status;
  if (query.course) filter.course = new RegExp(`^${escapeRegex(query.course)}$`, "i");
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }, { mobile: rx }];
  }
  const { limit, page, skip } = paginate(query);
  const [items, total] = await Promise.all([
    Student.find(filter).populate("batch", "name course").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Student.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getStudent(id) {
  const s = await Student.findById(id).populate("batch", "name course");
  if (!s) throw new ApiError(404, "Student not found");
  return s;
}

export const getStudentByUser = (userId) => Student.findOne({ user: userId }).populate("batch", "name course");

/**
 * Creates a student. If `createLogin` + password are given, also creates a STUDENT user
 * linked to this profile so the student can use the portal.
 */
export async function createStudent(body) {
  const data = pick(body, FIELDS);
  if (data.batch && !(await Batch.exists({ _id: data.batch }))) throw new ApiError(400, "Batch not found");
  const student = await Student.create(data);
  if (body.createLogin && body.password) {
    try {
      const user = await User.create({ name: student.name, email: student.email, password: body.password, role: ROLES.STUDENT });
      student.user = user._id;
      await student.save();
    } catch (err) {
      await student.deleteOne(); // keep data consistent if login creation fails
      throw err.code === 11000 ? new ApiError(409, "A login with this email already exists") : err;
    }
  } else {
    // Auto-link to an existing STUDENT account with the same email (e.g. self-registered)
    const user = await User.findOne({ email: student.email, role: ROLES.STUDENT });
    if (user && !(await Student.exists({ user: user._id }))) { student.user = user._id; await student.save(); }
  }
  return student;
}

export async function updateStudent(id, body) {
  const data = pick(body, FIELDS);
  if (data.batch && !(await Batch.exists({ _id: data.batch }))) throw new ApiError(400, "Batch not found");
  const s = await Student.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate("batch", "name course");
  if (!s) throw new ApiError(404, "Student not found");
  return s;
}

export async function deleteStudent(id) {
  const s = await Student.findByIdAndDelete(id);
  if (!s) throw new ApiError(404, "Student not found");
  return s;
}

export const listBatches = () => Batch.find().populate("teacher", "name").sort({ name: 1 });
export const createBatch = (body) => Batch.create(pick(body, ["name", "course", "startDate", "endDate", "teacher", "isActive"]));
export async function updateBatch(id, body) {
  const b = await Batch.findByIdAndUpdate(id, pick(body, ["name", "course", "startDate", "endDate", "teacher", "isActive"]), { new: true, runValidators: true });
  if (!b) throw new ApiError(404, "Batch not found");
  return b;
}
export async function deleteBatch(id) {
  if (await Student.exists({ batch: id })) throw new ApiError(400, "Batch has students; move them first");
  const b = await Batch.findByIdAndDelete(id);
  if (!b) throw new ApiError(404, "Batch not found");
  return b;
}
