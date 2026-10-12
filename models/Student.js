import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    gender: {type: String, enum: ["FEMALE", "MALE", "OTHER", "UNKNOWN"], default: "UNKNOWN"},
    mobile: String,
    parentMobile: String,
    address: String,
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", index: true },
    course: { type: String, trim: true },
    profilePhoto: String,
    rfidTag: { type: String, unique: true, sparse: true }, // used by IoT attendance in Phase 4
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "GRADUATED", "DROPPED"], default: "ACTIVE", index: true },
    // Linked login account (STUDENT role) for the student portal
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
  },
  { timestamps: true }
);
studentSchema.index({ name: "text", email: "text", studentId: "text" });

export default mongoose.model("Student", studentSchema);
