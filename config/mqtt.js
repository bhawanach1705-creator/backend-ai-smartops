import mqtt from "mqtt";

let client = null;

/** Optional in Phase 1 – enabled with MQTT_ENABLED=true. Full logic arrives in Phase 4. */
export function connectMQTT(url) {
  client = mqtt.connect(url, { reconnectPeriod: 5000, connectTimeout: 5000 });
  client.on("connect", () => console.log(`[mqtt] Connected to ${url}`));
  client.on("error", (err) => console.error("[mqtt] Error:", err.message));
  return client;
}

export const mqttStatus = () => (client ? (client.connected ? "connected" : "disconnected") : "disabled");
