import mongoose from "mongoose";

/** Connects to MongoDB. Exits the process if the initial connection fails. */
export async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI is not defined in .env");
  mongoose.connection.on("disconnected", () => console.warn("[db] MongoDB disconnected"));
  const conn = await mongoose.connect(uri);
  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export function dbStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}
