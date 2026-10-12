import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  mqttUrl: process.env.MQTT_URL || "mqtt://localhost:1883",
  mqttEnabled: process.env.MQTT_ENABLED === "true",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
};

if (!env.jwtSecret || env.jwtSecret.length < 32) {
  console.error("[env] JWT_SECRET missing or shorter than 32 characters");
  process.exit(1);
}
