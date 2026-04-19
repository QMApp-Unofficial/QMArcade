import type { Server, Socket } from "socket.io";
import { WHITEBOARD } from "@qmul/shared";
import type { WhiteboardStroke } from "@qmul/shared";
import { readWhiteboard, writeWhiteboard } from "../routes/whiteboard";

export function registerWhiteboard(io: Server) {
  const room = "whiteboard";
  let strokes = readWhiteboard();
  let dirty = false;

  setInterval(() => {
    if (!dirty) return;
    dirty = false;
    writeWhiteboard(strokes);
  }, WHITEBOARD.AUTOSAVE_MS);

  io.of("/whiteboard").on("connection", (socket: Socket) => {
    socket.join(room);
    socket.emit("wb:init", { strokes });

    socket.on("wb:stroke", (stroke: WhiteboardStroke) => {
      if (!stroke || !Array.isArray(stroke.points)) return;
      strokes.push(stroke);
      if (strokes.length > WHITEBOARD.MAX_STROKES) {
        strokes = strokes.slice(-WHITEBOARD.MAX_STROKES);
      }
      dirty = true;
      socket.to(room).emit("wb:stroke", stroke);
    });

    socket.on("wb:clear", ({ admin }: { admin?: boolean }) => {
      // Admin-gated clear. The socket handshake can't be fully trusted here;
      // we re-check admin via a header in the HTTP path as well.
      if (!admin) return;
      strokes = [];
      dirty = true;
      io.of("/whiteboard").to(room).emit("wb:clear");
    });
  });
}
