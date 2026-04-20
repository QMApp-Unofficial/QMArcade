import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
  type StrokeShape,
} from "@/components/DrawingCanvas";
import { useAuth } from "@/hooks/useAuth";
import type {
  ScribbleChatMessage,
  ScribbleRoomState,
  ScribbleStroke,
} from "@qmul/shared";
import { SCRIBBLE } from "@qmul/shared";
import { cn } from "@/lib/utils";
import { Eraser, Link2, Pencil, Trash2, Users } from "lucide-react";

const COLORS = [
  "#111111", "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#0ea5e9", "#4f46e5", "#9333ea", "#db2777", "#ffffff",
];

export function ScribblePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Pre-fill the room field from ?room=xxx so invite links just work. We keep
  // the URL param authoritative until the user types something different.
  const initialRoom = searchParams.get("room")?.trim() || "main";
  const [roomId, setRoomId] = useState(initialRoom);
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState<ScribbleRoomState | null>(null);
  const [chat, setChat] = useState<ScribbleChatMessage[]>([]);
  const [guess, setGuess] = useState("");
  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(5);
  const [erasing, setErasing] = useState(false);
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const isDrawer = useMemo(
    () => !!state && !!user && state.drawerId === user.discord_id,
    [state, user],
  );
  const isHost = useMemo(
    () => !!state && !!user && state.hostId === user.discord_id,
    [state, user],
  );

  const join = useCallback(() => {
    if (!user) return;
    const s = io("/scribble", { transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("sc:state", setState);
    s.on("sc:chat", (msg: ScribbleChatMessage) =>
      setChat((prev) => [...prev.slice(-199), msg]),
    );
    s.on("sc:stroke", (stroke: ScribbleStroke) =>
      canvasRef.current?.drawStroke(stroke),
    );
    s.on("sc:strokes_init", (strokes: ScribbleStroke[]) =>
      canvasRef.current?.drawAll(strokes),
    );
    s.on("sc:strokes_reset", () => canvasRef.current?.clear());
    s.on("sc:full", () => {
      toast.push({
        title: "Room is full",
        description: "Ask the host to raise the player cap, or pick another room.",
        tone: "error",
      });
      s.disconnect();
      socketRef.current = null;
      setJoined(false);
    });

    const trimmed = roomId.trim() || "main";
    s.emit("sc:join", {
      roomId: trimmed,
      discord_id: user.discord_id,
      username: user.username,
      avatar: user.avatar,
    });
    // Reflect the joined room in the URL so refreshes and copies stick.
    setSearchParams({ room: trimmed }, { replace: true });
    setJoined(true);
  }, [user, roomId, setSearchParams, toast]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Auto-scroll the chat panel to the latest message whenever it changes.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = state?.endsAt
    ? Math.max(0, Math.round((state.endsAt - now) / 1000))
    : null;

  function onStroke(s: StrokeShape) {
    if (!isDrawer) return;
    socketRef.current?.emit("sc:stroke", s);
  }

  function clearCanvas() {
    if (!isDrawer) return;
    socketRef.current?.emit("sc:clear_canvas");
  }

  function start() {
    socketRef.current?.emit("sc:start");
  }

  function pickWord(w: string) {
    socketRef.current?.emit("sc:pick", { word: w });
  }

  function submitGuess() {
    if (!guess.trim()) return;
    socketRef.current?.emit("sc:guess", { text: guess.trim() });
    setGuess("");
  }

  function copyInvite() {
    const url = `${window.location.origin}/scribble?room=${encodeURIComponent(
      state?.roomId ?? roomId,
    )}`;
    navigator.clipboard
      .writeText(url)
      .then(() =>
        toast.push({
          title: "Invite copied",
          description: "Send the link to a friend to pull them into this room.",
          tone: "success",
        }),
      )
      .catch(() =>
        toast.push({ title: "Could not copy link", tone: "error" }),
      );
  }

  if (!joined) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader
          title="Join a Scribble room"
          description="Share a room ID with friends to play together."
        />
        <div className="flex gap-2">
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            aria-label="Room ID"
            placeholder="main"
          />
          <Button onClick={join}>Join</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader
          title="Scribble"
          description={
            state
              ? `Round ${state.round}/${state.totalRounds || SCRIBBLE.ROUNDS_PER_GAME} · ${state.phase}`
              : "Waiting…"
          }
          right={
            <div className="flex items-center gap-2">
              {secondsLeft !== null && (
                <span className="chip" aria-label="timer">
                  ⏱ {secondsLeft}s
                </span>
              )}
              <Button
                variant="ghost"
                onClick={copyInvite}
                aria-label="Copy invite link"
              >
                <Link2 className="h-4 w-4" /> Invite
              </Button>
            </div>
          }
        />

        {/* Host-only lobby configuration. Non-hosts see a small waiting line
            instead so the controls aren't a confusing no-op. */}
        {state?.phase === "lobby" && (
          <LobbyPanel
            state={state}
            isHost={isHost}
            onStart={start}
            onConfigure={(cfg) =>
              socketRef.current?.emit("sc:configure", cfg)
            }
          />
        )}

        {/* Word-slot display. Above the canvas, centred, monospace. Drawer
            sees the real word; everyone else sees underscores. During reveal
            we show the word so latecomers catch up. */}
        <WordSlots state={state} isDrawer={isDrawer} />

        <div className="relative">
          <DrawingCanvas
            ref={canvasRef}
            readOnly={!isDrawer || state?.phase !== "drawing"}
            color={erasing ? "#ffffff" : color}
            size={size}
            erasing={erasing}
            onStrokeComplete={onStroke}
            aria-label={
              isDrawer ? "Drawing canvas (you)" : "Drawing canvas (spectator)"
            }
          />
          {!isDrawer && state?.phase === "drawing" && (
            <span className="absolute top-2 left-2 chip">Spectating</span>
          )}

          {/* Word-picker overlay. Sits on top of the canvas with a grey wash
              so the canvas is clearly disabled while a drawer chooses. */}
          <AnimatePresence>
            {state?.phase === "choosing" && (
              <WordPickerOverlay
                state={state}
                isDrawer={isDrawer}
                onPick={pickWord}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="colors">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setErasing(false);
                }}
                aria-label={`Color ${c}`}
                className={cn(
                  "h-6 w-6 rounded-full border",
                  color === c && !erasing
                    ? "border-foreground ring-2 ring-primary"
                    : "border-border",
                )}
                style={{ backgroundColor: c }}
                disabled={!isDrawer}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <span>Size</span>
            <input
              type="range"
              min={1}
              max={40}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Brush size"
              disabled={!isDrawer}
            />
            <span>{size}</span>
          </label>
          <Button
            variant={erasing ? "primary" : "secondary"}
            onClick={() => setErasing((e) => !e)}
            disabled={!isDrawer}
          >
            {erasing ? <Pencil className="h-4 w-4" /> : <Eraser className="h-4 w-4" />}
            {erasing ? "Draw" : "Erase"}
          </Button>
          <Button variant="ghost" onClick={clearCanvas} disabled={!isDrawer}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Players" />
          <ul className="space-y-2">
            {state?.players.map((p) => (
              <li
                key={p.discord_id}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5",
                  p.isDrawer ? "bg-primary/20" : "bg-foreground/5",
                )}
              >
                {p.avatar && (
                  <img src={p.avatar} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span className="text-sm truncate">{p.username}</span>
                {state?.hostId === p.discord_id && (
                  <span className="chip text-[10px]">host</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {p.score} pts{" "}
                  {p.isDrawer
                    ? "· drawer"
                    : p.guessedThisRound
                      ? "· guessed"
                      : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Guesses" />
          <div
            ref={chatScrollRef}
            className="h-64 overflow-auto space-y-1 pr-1"
            role="log"
            aria-live="polite"
          >
            {chat.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "text-sm",
                  m.kind === "correct" && "text-emerald-400 font-medium",
                  m.kind === "close" && "text-amber-400 font-medium",
                  m.kind === "system" && "text-muted-foreground italic",
                )}
              >
                {m.kind === "close" ? (
                  // Private-to-guesser hint. Leave the username off so it
                  // reads as feedback on *your* guess, not someone else's.
                  <span>{m.text}</span>
                ) : (
                  <>
                    <span className="font-medium">{m.username}:</span> {m.text}
                  </>
                )}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitGuess();
            }}
          >
            <Input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder={isDrawer ? "You're drawing!" : "Type a guess…"}
              aria-label="Guess"
              disabled={isDrawer}
            />
            <Button type="submit" disabled={isDrawer}>
              Send
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

/**
 * Big centred word display. Each letter sits in its own underscored slot so
 * the space and length of the target word are always legible without the
 * drawer being able to accidentally leak letters. Spaces in multi-word
 * prompts render as a visible gap.
 */
function WordSlots({
  state,
  isDrawer,
}: {
  state: ScribbleRoomState | null;
  isDrawer: boolean;
}) {
  // Pick the right source of truth per phase. During `drawing`, the drawer
  // gets `wordMasked` === the real word (server sends it unmasked to them);
  // guessers get underscores. During `reveal`, everyone sees the full word.
  const display = useMemo(() => {
    if (!state) return null;
    if (state.phase === "reveal" && state.wordRevealed)
      return { text: state.wordRevealed, reveal: true };
    if (state.phase === "drawing" && state.wordMasked)
      return { text: state.wordMasked, reveal: isDrawer };
    return null;
  }, [state, isDrawer]);

  if (!display) return null;

  const chars = display.text.split("");

  return (
    <div
      className="mb-3 flex items-end justify-center gap-1 sm:gap-1.5 select-none"
      aria-label={isDrawer ? "Word you are drawing" : "Word slots"}
    >
      {chars.map((ch, i) => {
        const isSpace = ch === " " || ch === "-";
        return (
          <div
            key={i}
            className={cn(
              "font-mono text-lg sm:text-xl font-bold uppercase tracking-widest text-foreground flex flex-col items-center",
              isSpace && "opacity-60",
            )}
            style={{ minWidth: isSpace ? "0.5rem" : "1.1rem" }}
          >
            <span className="h-6 leading-6">
              {isSpace ? (ch === "-" ? "-" : "") : display.reveal ? ch : ""}
            </span>
            {!isSpace && (
              <span className="block h-0.5 w-full bg-foreground/60" aria-hidden />
            )}
          </div>
        );
      })}
      <span className="ml-3 text-xs text-muted-foreground self-center">
        {chars.filter((c) => c !== " " && c !== "-").length} letters
      </span>
    </div>
  );
}

/**
 * Lobby config panel — only the host can edit. Shows an invite-link hint,
 * max-player selector, custom-word textarea, and the Start button.
 */
function LobbyPanel({
  state,
  isHost,
  onStart,
  onConfigure,
}: {
  state: ScribbleRoomState;
  isHost: boolean;
  onStart: () => void;
  onConfigure: (cfg: { customWords?: string[]; maxPlayers?: number }) => void;
}) {
  // Editable copy of host config. We push commits to the server on blur /
  // explicit save rather than per keystroke to keep traffic sensible.
  const [wordsText, setWordsText] = useState(
    (state.customWords ?? []).join(", "),
  );
  const [maxPlayers, setMaxPlayers] = useState<number>(
    state.maxPlayers ?? SCRIBBLE.MAX_PLAYERS,
  );

  // Reconcile from server when a different client changes something.
  useEffect(() => {
    setWordsText((state.customWords ?? []).join(", "));
  }, [state.customWords]);
  useEffect(() => {
    if (state.maxPlayers) setMaxPlayers(state.maxPlayers);
  }, [state.maxPlayers]);

  function commitWords() {
    if (!isHost) return;
    const parsed = wordsText
      .split(/[,\n]/)
      .map((w) => w.trim())
      .filter(Boolean);
    onConfigure({ customWords: parsed });
  }
  function commitMax(n: number) {
    if (!isHost) return;
    setMaxPlayers(n);
    onConfigure({ maxPlayers: n });
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-foreground/[0.03] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            Lobby · {state.players.length}/{state.maxPlayers} players
          </p>
          <p className="text-xs text-muted-foreground">
            {isHost
              ? "You're the host. Configure the game below and hit Start."
              : "Waiting for the host to start the game."}
          </p>
        </div>
        <Button
          onClick={onStart}
          disabled={!isHost || state.players.length < SCRIBBLE.MIN_PLAYERS}
          aria-label="Start game"
        >
          Start game
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>Max players</span>
          <select
            className="ml-auto rounded-md bg-foreground/5 border border-border px-2 py-1 text-sm"
            value={maxPlayers}
            onChange={(e) => commitMax(Number(e.target.value))}
            disabled={!isHost}
            aria-label="Max players"
          >
            {Array.from({ length: 15 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-muted-foreground self-center">
          Minimum {SCRIBBLE.MIN_PLAYERS} players to start. Host leaves? The
          next player takes over.
        </div>
      </div>

      <div>
        <label
          htmlFor="custom-words"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
          Custom words <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Comma or newline separated. Leave empty to use the default word
          list. Only the host can edit this.
        </p>
        <textarea
          id="custom-words"
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          onBlur={commitWords}
          disabled={!isHost}
          rows={3}
          className="w-full rounded-md bg-foreground/5 border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          placeholder="pizza, cactus, rainbow, …"
          aria-label="Custom words"
        />
        {state.customWords.length > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Using custom list: {state.customWords.length} word
            {state.customWords.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Overlay rendered on top of the canvas while a drawer is choosing a word.
 * Dims the canvas for everyone and shows a centred modal card with the three
 * options — only the drawer can click them; spectators see a waiting state.
 */
function WordPickerOverlay({
  state,
  isDrawer,
  onPick,
}: {
  state: ScribbleRoomState;
  isDrawer: boolean;
  onPick: (w: string) => void;
}) {
  const choices = state.wordChoices ?? [];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-10 grid place-items-center bg-background/70 backdrop-blur-sm rounded-xl"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="card-elev max-w-md w-[min(90%,26rem)]"
        role="dialog"
        aria-label="Pick a word to draw"
      >
        <div className="text-center mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {isDrawer ? "Your turn" : `${state.players.find((p) => p.discord_id === state.drawerId)?.username ?? "Drawer"} is choosing`}
          </p>
          <h3 className="font-display text-xl font-bold mt-1">
            {isDrawer ? "Pick a word" : "Hold tight…"}
          </h3>
        </div>
        {isDrawer ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {choices.map((w) => (
              <Button
                key={w}
                variant="secondary"
                onClick={() => onPick(w)}
                className="!py-3 !text-base"
              >
                {w}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 py-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-accent animate-bounce" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
