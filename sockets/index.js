import { Server } from "socket.io";

let io = null;

export function initSocket(httpServer, clientUrl) {
  io = new Server(httpServer, { cors: { origin: clientUrl, methods: ["GET", "POST"] } });
  io.on("connection", (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);
    socket.emit("server:welcome", { message: "Connected to AI SmartOps realtime channel" });
    socket.on("disconnect", () => console.log(`[socket] Client disconnected: ${socket.id}`));
  });
  return io;
}

export const getIO = () => io;
