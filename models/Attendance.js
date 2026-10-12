import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    date: { type: Date, required: true }, // UTC midnight
    status: { type: String, enum: ["PRESENT", "ABSENT", "LATE", "LEAVE"], required: true },
    source: { type: String, enum: ["MANUAL", "RFID", "IOT"], default: "MANUAL" },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    checkInAt: Date,
    remarks: String,
  },
  { timestamps: true }
);
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, batch: 1 });

export default mongoose.model("Attendance", attendanceSchema);
