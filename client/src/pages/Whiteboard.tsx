import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DrawingCanvas, type DrawingCanvasHandle, type StrokeShape } from "@/components/DrawingCanvas";
import { FullscreenButton } from "@/components/FullscreenButton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { WhiteboardStroke } from "@qmul/shared";
import { Eraser, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const COLORS = [
  "#111111", "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#0ea5e9", "#4f46e5", "#9333ea", "#db2777", "#ffffff",
];

export function WhiteboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle | null>(null);
  const activityRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState("#111111");
  const [size, setSize] = useState(4);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    const s = io("/whiteboard", { transports: ["websocket", "polling"] });
    socketRef.current = s;

    api
      .get<{ strokes: WhiteboardStroke[] }>("/whiteboard")
      .then(({ strokes }) => canvasRef.current?.drawAll(strokes))
      .catch(() => {});

    s.on("wb:init", ({ strokes }: { strokes: WhiteboardStroke[] }) => {
      canvasRef.current?.drawAll(strokes);
    });
    s.on("wb:stroke", (stroke: WhiteboardStroke) => canvasRef.current?.drawStroke(stroke));
    s.on("wb:clear", () => canvasRef.current?.clear());

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  function onStroke(s: StrokeShape) {
    if (!user) return;
    const full: WhiteboardStroke = {
      ...s,
      id: Math.random().toString(36).slice(2),
      author: user.discord_id,
      at: Date.now(),
    };
    socketRef.current?.emit("wb:stroke", full);
  }

  function clearAll() {
    if (!user?.is_admin) return;
    api
      .post("/backup/clear/whiteboard")
      .then(() => socketRef.current?.emit("wb:clear", { admin: true }))
      .catch((e) =>
        toast.push({ title: "Clear failed", description: e?.message, tone: "error" }),
      );
  }

  return (
    <div ref={activityRef} className="activity-fullscreen flex-1 min-h-0">
      <Card className="h-full min-h-0 flex flex-col overflow-hidden">
        <CardHeader
          title="Persistent Whiteboard"
          description="Draw together. It saves itself."
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <FullscreenButton targetRef={activityRef} label="whiteboard" />
              {user?.is_admin ? (
                <Button variant="destructive" onClick={clearAll}>
                  <Trash2 className="h-4 w-4" /> Admin: Clear
                </Button>
              ) : null}
            </div>
          }
        />
        <div className="flex-1 min-h-0">
          <DrawingCanvas
            ref={canvasRef}
            color={erasing ? "#ffffff" : color}
            size={size}
            erasing={erasing}
            onStrokeComplete={onStroke}
            className="h-full min-h-0 aspect-auto"
            aria-label="Shared whiteboard canvas"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="colors">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setErasing(false);
                }}
                aria-label={`Color ${c}`}
                className={cn(
                  "h-6 w-6 rounded-full border sm:h-7 sm:w-7",
                  color === c && !erasing ? "border-foreground ring-2 ring-primary" : "border-border",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span>Size</span>
            <input
              type="range"
              min={1}
              max={30}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Brush size"
              className="w-24 sm:w-32"
            />
            <span>{size}</span>
          </label>
          <Button
            variant={erasing ? "primary" : "secondary"}
            onClick={() => setErasing((e) => !e)}
            className="ml-auto sm:ml-0"
          >
            {erasing ? <Pencil className="h-4 w-4" /> : <Eraser className="h-4 w-4" />}
            {erasing ? "Draw" : "Erase"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
