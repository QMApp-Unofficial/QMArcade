import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { Server as IOServer } from "socket.io";

import { env, isProd } from "./env";
import "./db"; // initialize schema
import authRoutes from "./routes/auth";
import wordleRoutes from "./routes/wordle";
import gachaRoutes from "./routes/gacha";
import whiteboardRoutes from "./routes/whiteboard";
import leaderboardRoutes from "./routes/leaderboard";
import backupRoutes from "./routes/backup";
import { registerScribble } from "./sockets/scribble";
import { registerWhiteboard } from "./sockets/whiteboard";

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: true, credentials: true },
  // Allow large drawing payloads on occasion.
  maxHttpBufferSize: 2 * 1024 * 1024,
});

app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: env.NODE_ENV, time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/wordle", wordleRoutes);
app.use("/api/gacha", gachaRoutes);
app.use("/api/whiteboard", whiteboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/backup", backupRoutes);

registerScribble(io);
registerWhiteboard(io);

// Serve the built client in production.
// __dirname is server/src when running via tsx; look one level up then into client/dist.
const clientDist = path.resolve(__dirname, "../../client/dist");
if (isProd && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.type("text/plain").send(
      "QMUL Arcade API running. In development, use `npm run dev:client` to serve the UI.",
    );
  });
}

server.listen(env.PORT, () => {
  console.log(`QMUL Arcade server listening on :${env.PORT} (${env.NODE_ENV})`);
  console.log(`DB: ${env.DB_PATH}`);
});
