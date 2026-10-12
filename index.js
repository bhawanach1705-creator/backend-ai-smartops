import http from "http";
import { env } from "./config/env.js";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { connectMQTT } from "./config/mqtt.js";
import { initSocket } from "./sockets/index.js";

async function start() {
  try {
    await connectDB(env.mongoUri);
    const server = http.createServer(app);
    initSocket(server, env.clientUrl);
    if (env.mqttEnabled) connectMQTT(env.mqttUrl);

    server.listen(env.port, () => console.log(`[server] AI SmartOps API on http://localhost:${env.port}`));
  } catch (err) {
    console.error("[server] Failed to start:", err.message);
    process.exit(1);
  }
}

start();
