import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT || 3001),
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_PATH: process.env.DB_PATH || "./data/app.db",
  ADMIN_DISCORD_IDS: (process.env.ADMIN_DISCORD_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  ADMIN_CODE: process.env.ADMIN_CODE || "",
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
  PUBLIC_URL: process.env.PUBLIC_URL || "",
};

export const isProd = env.NODE_ENV === "production";
