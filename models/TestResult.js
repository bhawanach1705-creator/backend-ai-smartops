import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    status: { type: String, enum: ["IN_PROGRESS", "SUBMITTED", "EXPIRED"], default: "IN_PROGRESS" },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    answers: [{ question: mongoose.Schema.Types.ObjectId, selectedIndex: Number }],
    score: { type: Number, default: 0 },
    totalMarks: Number,
    percentage: Number,
    correctCount: Number,
  },
  { timestamps: true }
);
testResultSchema.index({ test: 1, student: 1 }, { unique: true }); // one attempt per student
testResultSchema.index({ test: 1, score: -1 });

export default mongoose.model("TestResult", testResultSchema);
