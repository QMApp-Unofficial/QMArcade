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
  /**
   * Host is the first player to join and is the only one who can edit room
   * config (custom words, player cap). Falls back to the next player if the
   * original host disconnects.
   */
  hostSocketId: string | null;
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
  /** Optional host-configured word list; used in place of the default pool. */
  customWords: string[];
  /** Cap on the number of players in the room. Defaults to SCRIBBLE.MAX_PLAYERS. */
  maxPlayers: number;
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
    hostSocketId: null,
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
    customWords: [],
    maxPlayers: SCRIBBLE.MAX_PLAYERS,
  };
  rooms.set(id, r);
  return r;
}

/**
 * Level-1 Levenshtein distance check used for "close guess" feedback. Skribbl
 * considers a guess close when it's within edit-distance 1 (and same-ish
 * length) of the target word. We allow distance ≤ 2 for longer words so the
 * signal is useful without being too generous.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp: number[] = new Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function isCloseGuess(guess: string, target: string): boolean {
  const g = guess.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!g || g === t) return false;
  // Don't flash "close!" for wildly different lengths (e.g. spamming letters).
  if (Math.abs(g.length - t.length) > 2) return false;
  const d = editDistance(g, t);
  // Short words: only distance 1 counts. Longer: distance 1 or 2.
  return t.length <= 4 ? d === 1 : d <= 2;
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
    hostId:
      (room.hostSocketId && room.players.get(room.hostSocketId)?.discord_id) ||
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
    wordLength:
      room.phase === "drawing" && room.word ? room.word.length : undefined,
    wordRevealed: room.phase === "reveal" ? room.word || undefined : undefined,
    round: room.round,
    totalRounds: room.totalRounds,
    maxPlayers: room.maxPlayers,
    customWords: room.customWords,
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
  room.wordChoices = drawWordChoices(3, room.customWords);
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

/**
 * Handle a guess. Returns the public chat message to broadcast. If the guess
 * is close to the target, also emits a private "close" message to the guesser
 * only — we don't broadcast closeness so spectators can't triangulate.
 */
function handleGuess(
  io: Server,
  room: Room,
  socket: Socket,
  player: ScribblePlayer,
  text: string,
): { publicMsg: ScribbleChatMessage | null; privateMsg: ScribbleChatMessage | null } {
  const publicMsg: ScribbleChatMessage = {
    id: Math.random().toString(36).slice(2),
    user: player.discord_id,
    username: player.username,
    text,
    kind: "chat",
    at: Date.now(),
  };
  let privateMsg: ScribbleChatMessage | null = null;

  if (
    room.phase === "drawing" &&
    room.word &&
    !player.guessedThisRound &&
    socket.id !== room.drawerSocketId
  ) {
    const guess = text.trim().toLowerCase();
    const target = room.word.toLowerCase();
    if (guess === target) {
      player.guessedThisRound = true;
      const remaining = Math.max(0, (room.endsAt ?? Date.now()) - Date.now());
      const frac = remaining / (SCRIBBLE.ROUND_SECONDS * 1000);
      const points = Math.round(50 + 100 * frac);
      player.score += points;
      const drawer = room.drawerSocketId
        ? room.players.get(room.drawerSocketId)
        : undefined;
      if (drawer) drawer.score += 25;
      publicMsg.kind = "correct";
      publicMsg.text = `${player.username} guessed the word! +${points}`;
      const nonDrawers = [...room.players.values()].filter(
        (p) => p.discord_id !== drawer?.discord_id,
      );
      if (nonDrawers.every((p) => p.guessedThisRound)) revealWord(io, room);
      return { publicMsg, privateMsg: null };
    }
    if (isCloseGuess(guess, target)) {
      privateMsg = {
        id: Math.random().toString(36).slice(2),
        user: player.discord_id,
        username: player.username,
        text: `"${text}" is close!`,
        kind: "close",
        at: Date.now(),
      };
    }
  }
  return { publicMsg, privateMsg };
}

function normaliseCustomWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const words = raw
    .map((w) => (typeof w === "string" ? w.trim().toLowerCase() : ""))
    .filter((w) => w.length > 0 && w.length <= 40 && /^[a-z0-9][a-z0-9 \-']*$/i.test(w));
  // Dedupe and cap so a rogue host can't OOM the server with a huge list.
  return [...new Set(words)].slice(0, 200);
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
          if (room.hostSocketId === existing) room.hostSocketId = socket.id;
        } else if (room.players.size >= room.maxPlayers) {
          // Room full. Reject with a one-shot system message and don't register.
          socket.emit("sc:chat", {
            id: Math.random().toString(36).slice(2),
            user: "system",
            username: "system",
            text: `Room is full (${room.maxPlayers} players).`,
            kind: "system",
            at: Date.now(),
          });
          socket.emit("sc:full");
          return;
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
        // First player to join a fresh room becomes host.
        if (!room.hostSocketId || !room.players.has(room.hostSocketId)) {
          room.hostSocketId = socket.id;
        }
        socket.join(room.id);
        currentRoom = room;

        // Send current strokes to the newly-joined player.
        socket.emit("sc:strokes_init", room.strokes);
        broadcastState(io, room);
      },
    );

    socket.on(
      "sc:configure",
      (payload: { customWords?: unknown; maxPlayers?: unknown }) => {
        if (!currentRoom) return;
        // Only the host can reconfigure, and only while in the lobby.
        if (socket.id !== currentRoom.hostSocketId) return;
        if (currentRoom.phase !== "lobby") return;
        if (payload && typeof payload === "object") {
          if ("customWords" in payload) {
            currentRoom.customWords = normaliseCustomWords(payload.customWords);
          }
          if ("maxPlayers" in payload && typeof payload.maxPlayers === "number") {
            const n = Math.floor(payload.maxPlayers);
            if (n >= SCRIBBLE.MIN_PLAYERS && n <= 16) {
              currentRoom.maxPlayers = n;
            }
          }
        }
        broadcastState(io, currentRoom);
      },
    );

    socket.on("sc:start", () => {
      if (!currentRoom || !me) return;
      // Only the host may start.
      if (socket.id !== currentRoom.hostSocketId) return;
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
      const { publicMsg, privateMsg } = handleGuess(io, currentRoom, socket, me, text);
      if (publicMsg) {
        if (publicMsg.kind === "correct") {
          // Don't leak the word in public chat. Send a "system" line to everyone.
          io.of("/scribble").to(currentRoom.id).emit("sc:chat", {
            ...publicMsg,
            text: `${me.username} guessed the word!`,
          });
        } else {
          io.of("/scribble").to(currentRoom.id).emit("sc:chat", publicMsg);
        }
      }
      if (privateMsg) {
        // Private close-guess hint — only the guesser sees it.
        socket.emit("sc:chat", privateMsg);
      }
      broadcastState(io, currentRoom);
    });

    socket.on("disconnect", () => {
      if (!currentRoom) return;
      const player = currentRoom.players.get(socket.id);
      if (player) currentRoom.userIndex.delete(player.discord_id);
      currentRoom.players.delete(socket.id);
      currentRoom.order = currentRoom.order.filter((sid) => sid !== socket.id);
      if (currentRoom.hostSocketId === socket.id) {
        // Promote the next remaining player to host.
        const next = currentRoom.players.keys().next();
        currentRoom.hostSocketId = next.done ? null : next.value;
      }
      if (currentRoom.players.size === 0) {
        clearTimer(currentRoom);
        rooms.delete(currentRoom.id);
      } else {
        broadcastState(io, currentRoom);
      }
    });
  });
}
