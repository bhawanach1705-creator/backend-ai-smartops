import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: { type: [String], validate: [(v) => v.length >= 2 && v.length <= 6, "2-6 options required"] },
  correctIndex: { type: Number, required: true, min: 0 },
  marks: { type: Number, default: 1, min: 0 },
});

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", index: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    questions: [questionSchema],
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

testSchema.virtual("totalMarks").get(function () {
  return this.questions.reduce((s, q) => s + q.marks, 0);
});

/** Student-safe view: never leaks correct answers. */
testSchema.methods.toStudentJSON = function (includeQuestions = false) {
  return {
    id: this._id, title: this.title, description: this.description,
    durationMinutes: this.durationMinutes, startAt: this.startAt, endAt: this.endAt,
    questionCount: this.questions.length, totalMarks: this.totalMarks,
    ...(includeQuestions && { questions: this.questions.map((q) => ({ id: q._id, text: q.text, options: q.options, marks: q.marks })) }),
  };
};

export default mongoose.model("Test", testSchema);
