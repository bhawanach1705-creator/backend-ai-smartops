import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { root } from "./controllers/healthController.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import feeRoutes from "./routes/feeRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import aiRoutes from "./routes/aiRoutes.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use("/api/ai", express.json({limit:"8mb"}), aiRoutes);
app.use(express.json({ limit: "1mb" }));

app.get("/", root);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/results", resultRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
