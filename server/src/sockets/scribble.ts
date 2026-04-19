import type { Server, Socket } from "socket.io";
import { SCRIBBLE } from "@qmul/shared";
import type {
  ScribbleChatMessage,
  ScribblePlayer,
  ScribbleRoomState,
  ScribbleStroke,
} from "@qmul/shared";
import { drawWordChoices, maskWord } from "../data/scribbleWords";
import { db } from "../db";

interface Room {
  id: string;
  players: Map<string, ScribblePlayer>; // key = socketId
  userIndex: Map<string, string>; // discord_id -> socketId
  phase: ScribbleRoomState["phase"];
  drawerSocketId: string | null;
  word: string | null;
  wordChoices: string[];
  round: number;
  totalRounds: number;
  timer: NodeJS.Timeout | null;
  endsAt: number | null;
  roundStartedAt: number | null;
  strokes: ScribbleStroke[];
  order: string[]; // socketIds in turn order
  turnIndex: number;
}

const rooms = new Map<string, Room>();

function getOrCreate(id: string): Room {
  let r = rooms.get(id);
  if (r) return r;
  r = {
    id,
    players: new Map(),
    userIndex: new Map(),
    phase: "lobby",
    drawerSocketId: null,
    word: null,
    wordChoices: [],
    round: 0,
    totalRounds: SCRIBBLE.ROUNDS_PER_GAME,
    timer: null,
    endsAt: null,
    roundStartedAt: null,
    strokes: [],
    order: [],
    turnIndex: 0,
  };
  rooms.set(id, r);
  return r;
}

function publicState(room: Room, forSocketId?: string): ScribbleRoomState {
  const players: ScribblePlayer[] = [...room.players.values()].map((p) => ({
    ...p,
    isDrawer: room.players.get(room.drawerSocketId || "")?.discord_id === p.discord_id,
  }));
  return {
    roomId: room.id,
    players,
    drawerId:
      (room.drawerSocketId && room.players.get(room.drawerSocketId)?.discord_id) ||
      null,
    phase: room.phase,
    wordChoices:
      room.phase === "choosing" && forSocketId === room.drawerSocketId
        ? room.wordChoices
        : undefined,
    wordMasked:
      room.phase === "drawing" && room.word
        ? forSocketId === room.drawerSocketId
          ? room.word
          : maskWord(room.word)
        : undefined,
    wordRevealed: room.phase === "reveal" ? room.word || undefined : undefined,
    round: room.round,
    totalRounds: room.totalRounds,
    endsAt: room.endsAt || undefined,
  };
}

function broadcastState(io: Server, room: Room) {
  for (const [sid] of room.players) {
    io.of("/scribble").to(sid).emit("sc:state", publicState(room, sid));
  }
}

function clearTimer(room: Room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  room.endsAt = null;
}

function endGame(io: Server, room: Room) {
  clearTimer(room);
  room.phase = "ended";
  // Persist stats
  const sorted = [...room.players.values()].sort((a, b) => b.score - a.score);
  sorted.forEach((p, i) => {
    const isWin = i === 0 && sorted.length > 1;
    db.prepare(
      `INSERT INTO scribble_stats (discord_id, wins, total_score, games)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(discord_id) DO UPDATE SET
         wins = wins + excluded.wins,
         total_score = total_score + excluded.total_score,
         games = games + 1`,
    ).run(p.discord_id, isWin ? 1 : 0, p.score);
  });
  broadcastState(io, room);
}

function beginTurn(io: Server, room: Room) {
  clearTimer(room);
  room.strokes = [];
  room.word = null;
  room.wordChoices = drawWordChoices(3);
  // Reset round guess flags
  for (const p of room.players.values()) p.guessedThisRound = false;

  // Advance turn
  if (room.order.length === 0) room.order = [...room.players.keys()];
  // Scrub disconnected socketIds
  room.order = room.order.filter((sid) => room.players.has(sid));
  if (room.order.length < SCRIBBLE.MIN_PLAYERS) {
    room.phase = "lobby";
    broadcastState(io, room);
    return;
  }

  // If we've cycled through all players this round, increment round count.
  if (room.turnIndex >= room.order.length) {
    room.turnIndex = 0;
    room.round += 1;
    if (room.round > room.totalRounds) return endGame(io, room);
  }
  room.drawerSocketId = room.order[room.turnIndex];
  room.turnIndex += 1;

  room.phase = "choosing";
  room.endsAt = Date.now() + SCRIBBLE.CHOOSE_SECONDS * 1000;
  room.timer = setTimeout(() => {
    // Auto-pick first word if drawer didn't choose
    if (room.phase === "choosing" && room.wordChoices[0]) {
      pickWord(io, room, room.wordChoices[0]);
    }
  }, SCRIBBLE.CHOOSE_SECONDS * 1000);

  io.of("/scribble").to(room.id).emit("sc:strokes_reset");
  broadcastState(io, room);
}

function pickWord(io: Server, room: Room, word: string) {
  if (!room.wordChoices.includes(word)) return;
  clearTimer(room);
  room.word = word;
  room.phase = "drawing";
  room.roundStartedAt = Date.now();
  room.endsAt = Date.now() + SCRIBBLE.ROUND_SECONDS * 1000;
  room.timer = setTimeout(() => revealWord(io, room), SCRIBBLE.ROUND_SECONDS * 1000);
  broadcastState(io, room);
}

function revealWord(io: Server, room: Room) {
  clearTimer(room);
  room.phase = "reveal";
  room.endsAt = Date.now() + SCRIBBLE.REVEAL_SECONDS * 1000;
  room.timer = setTimeout(() => beginTurn(io, room), SCRIBBLE.REVEAL_SECONDS * 1000);
  broadcastState(io, room);
}

function handleGuess(
  io: Server,
  room: Room,
  socket: Socket,
  player: ScribblePlayer,
  text: string,
): ScribbleChatMessage {
  const msg: ScribbleChatMessage = {
    id: Math.random().toString(36).slice(2),
    user: player.discord_id,
    username: player.username,
    text,
    kind: "chat",
    at: Date.now(),
  };
  if (
    room.phase === "drawing" &&
    room.word &&
    !player.guessedThisRound &&
    socket.id !== room.drawerSocketId &&
    text.trim().toLowerCase() === room.word.toLowerCase()
  ) {
    player.guessedThisRound = true;
    // Score: based on remaining time
    const remaining = Math.max(0, (room.endsAt ?? Date.now()) - Date.now());
    const frac = remaining / (SCRIBBLE.ROUND_SECONDS * 1000);
    const points = Math.round(50 + 100 * frac);
    player.score += points;
    // Drawer also gets a small bonus
    const drawer = room.drawerSocketId
      ? room.players.get(room.drawerSocketId)
      : undefined;
    if (drawer) drawer.score += 25;
    msg.kind = "correct";
    msg.text = `${player.username} guessed the word! +${points}`;
    // End early if everyone non-drawer has guessed
    const nonDrawers = [...room.players.values()].filter(
      (p) => p.discord_id !== drawer?.discord_id,
    );
    if (nonDrawers.every((p) => p.guessedThisRound)) revealWord(io, room);
  }
  return msg;
}

export function registerScribble(io: Server) {
  const ns = io.of("/scribble");
  ns.on("connection", (socket: Socket) => {
    let currentRoom: Room | null = null;
    let me: ScribblePlayer | null = null;

    socket.on(
      "sc:join",
      (payload: {
        roomId: string;
        discord_id: string;
        username: string;
        avatar?: string | null;
      }) => {
        const { roomId, discord_id, username, avatar = null } = payload || ({} as any);
        if (!roomId || !discord_id) return;
        const room = getOrCreate(roomId);
        // If user already in room from another socket, boot the old one.
        const existing = room.userIndex.get(discord_id);
        if (existing && existing !== socket.id) {
          room.players.delete(existing);
        }
        me = {
          discord_id,
          username,
          avatar: avatar ?? null,
          score: 0,
          guessedThisRound: false,
          isDrawer: false,
        };
        room.players.set(socket.id, me);
        room.userIndex.set(discord_id, socket.id);
        socket.join(room.id);
        currentRoom = room;

        // Send current strokes to the newly-joined player.
        socket.emit("sc:strokes_init", room.strokes);
        broadcastState(io, room);
      },
    );

    socket.on("sc:start", () => {
      if (!currentRoom || !me) return;
      if (currentRoom.players.size < SCRIBBLE.MIN_PLAYERS) return;
      currentRoom.round = 1;
      currentRoom.turnIndex = 0;
      currentRoom.order = [...currentRoom.players.keys()];
      for (const p of currentRoom.players.values()) p.score = 0;
      beginTurn(io, currentRoom);
    });

    socket.on("sc:pick", ({ word }: { word: string }) => {
      if (!currentRoom || socket.id !== currentRoom.drawerSocketId) return;
      pickWord(io, currentRoom, word);
    });

    socket.on("sc:stroke", (stroke: ScribbleStroke) => {
      if (!currentRoom || currentRoom.phase !== "drawing") return;
      if (socket.id !== currentRoom.drawerSocketId) return;
      currentRoom.strokes.push(stroke);
      socket.to(currentRoom.id).emit("sc:stroke", stroke);
    });

    socket.on("sc:clear_canvas", () => {
      if (!currentRoom) return;
      if (socket.id !== currentRoom.drawerSocketId) return;
      currentRoom.strokes = [];
      io.of("/scribble").to(currentRoom.id).emit("sc:strokes_reset");
    });

    socket.on("sc:guess", ({ text }: { text: string }) => {
      if (!currentRoom || !me || !text) return;
      const msg = handleGuess(io, currentRoom, socket, me, text);
      if (msg.kind === "correct") {
        // Don't leak the word in public chat. Send a "system" line to everyone.
        io.of("/scribble").to(currentRoom.id).emit("sc:chat", {
          ...msg,
          text: `${me.username} guessed the word!`,
        });
      } else {
        io.of("/scribble").to(currentRoom.id).emit("sc:chat", msg);
      }
      broadcastState(io, currentRoom);
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const player = currentRoom.players.get(socket.id);
      if (player) currentRoom.userIndex.delete(player.discord_id);
      currentRoom.players.delete(socket.id);
      currentRoom.order = currentRoom.order.filter((sid) => sid !== socket.id);
      if (currentRoom.players.size === 0) {
        clearTimer(currentRoom);
        rooms.delete(currentRoom.id);
      } else {
        broadcastState(io, currentRoom);
      }
    });
  });
}
