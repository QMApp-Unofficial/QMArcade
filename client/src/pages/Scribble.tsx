import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DrawingCanvas, type DrawingCanvasHandle, type StrokeShape } from "@/components/DrawingCanvas";
import { useAuth } from "@/hooks/useAuth";
import type {
  ScribbleChatMessage,
  ScribbleRoomState,
  ScribbleStroke,
} from "@qmul/shared";
import { SCRIBBLE } from "@qmul/shared";
import { cn } from "@/lib/utils";
import { Eraser, Pencil, Trash2 } from "lucide-react";

const COLORS = [
  "#111111", "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#0ea5e9", "#4f46e5", "#9333ea", "#db2777", "#ffffff",
];

export function ScribblePage() {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("main");
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState<ScribbleRoomState | null>(null);
  const [chat, setChat] = useState<ScribbleChatMessage[]>([]);
  const [guess, setGuess] = useState("");
  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(5);
  const [erasing, setErasing] = useState(false);
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const isDrawer = useMemo(
    () => !!state && !!user && state.drawerId === user.discord_id,
    [state, user],
  );

  function join() {
    if (!user) return;
    const s = io("/scribble", { transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("sc:state", setState);
    s.on("sc:chat", (msg: ScribbleChatMessage) =>
      setChat((prev) => [...prev.slice(-199), msg]),
    );
    s.on("sc:stroke", (stroke: ScribbleStroke) => canvasRef.current?.drawStroke(stroke));
    s.on("sc:strokes_init", (strokes: ScribbleStroke[]) => canvasRef.current?.drawAll(strokes));
    s.on("sc:strokes_reset", () => canvasRef.current?.clear());

    s.emit("sc:join", {
      roomId: roomId.trim() || "main",
      discord_id: user.discord_id,
      username: user.username,
      avatar: user.avatar,
    });
    setJoined(true);
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = state?.endsAt ? Math.max(0, Math.round((state.endsAt - now) / 1000)) : null;

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
                <span className="chip" aria-label="timer">⏱ {secondsLeft}s</span>
              )}
              {state?.phase === "drawing" && (
                <span className="chip" aria-live="polite">
                  {isDrawer ? `Draw: ${state.wordMasked}` : `Guess: ${state.wordMasked}`}
                </span>
              )}
              {state?.phase === "reveal" && (
                <span className="chip">Word was: {state.wordRevealed}</span>
              )}
            </div>
          }
        />

        {state?.phase === "choosing" && isDrawer && state.wordChoices && (
          <div className="mb-3 flex gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground self-center">
              Choose a word:
            </span>
            {state.wordChoices.map((w) => (
              <Button key={w} variant="secondary" onClick={() => pickWord(w)}>
                {w}
              </Button>
            ))}
          </div>
        )}

        <div className="relative">
          <DrawingCanvas
            ref={canvasRef}
            readOnly={!isDrawer || state?.phase !== "drawing"}
            color={erasing ? "#ffffff" : color}
            size={size}
            erasing={erasing}
            onStrokeComplete={onStroke}
            aria-label={isDrawer ? "Drawing canvas (you)" : "Drawing canvas (spectator)"}
          />
          {!isDrawer && state?.phase === "drawing" && (
            <span className="absolute top-2 left-2 chip">Spectating</span>
          )}
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
                  color === c && !erasing ? "border-foreground ring-2 ring-primary" : "border-border",
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
          {state?.phase === "lobby" && (
            <Button className="ml-auto" onClick={start}>
              Start game
            </Button>
          )}
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
                <span className="text-sm">{p.username}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {p.score} pts {p.isDrawer ? "· drawer" : p.guessedThisRound ? "· guessed" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Guesses" />
          <div
            className="h-64 overflow-auto space-y-1 pr-1"
            role="log"
            aria-live="polite"
          >
            {chat.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "text-sm",
                  m.kind === "correct" && "text-emerald-400",
                  m.kind === "system" && "text-muted-foreground italic",
                )}
              >
                <span className="font-medium">{m.username}:</span> {m.text}
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
            <Button type="submit" disabled={isDrawer}>Send</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
