import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStudentByUser } from "../services/studentService.js";

/** For STUDENT role: attaches req.student (the profile linked to the logged-in user). */
export const loadStudent = asyncHandler(async (req, res, next) => {
  const student = await getStudentByUser(req.user._id);
  if (!student) throw new ApiError(404, "No student profile is linked to your account. Contact the admin.");
  req.student = student;
  next();
});
