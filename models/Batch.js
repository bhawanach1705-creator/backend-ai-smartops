import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    course: { type: String, required: true, trim: true },
    startDate: Date,
    endDate: Date,
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Batch", batchSchema);
