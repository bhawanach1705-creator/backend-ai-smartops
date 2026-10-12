import { dbStatus } from "../config/db.js";
import { mqttStatus } from "../config/mqtt.js";
import { env } from "../config/env.js";

export function root(req, res) {
  res.json({ success: true, message: "AI SmartOps Server Running" });
}

/** Aggregated health: Node, MongoDB, MQTT and the Python AI service. */
export async function health(req, res) {
  let aiService = "offline";
  try {
    const r = await fetch(env.aiServiceUrl, { signal: AbortSignal.timeout(2000) });
    if (r.ok) aiService = "online";
  } catch { /* AI service unreachable */ }

  res.json({
    success: true,
    data: {
      server: "online",
      database: dbStatus(),
      mqtt: mqttStatus(),
      aiService,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}
