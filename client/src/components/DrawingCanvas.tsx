import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface StrokeShape {
  color: string;
  size: number;
  erase?: boolean;
  points: { x: number; y: number }[];
}

export interface DrawingCanvasHandle {
  clear: () => void;
  drawStroke: (s: StrokeShape) => void;
  drawAll: (s: StrokeShape[]) => void;
}

interface Props {
  readOnly?: boolean;
  color: string;
  size: number;
  erasing: boolean;
  onStrokeComplete?: (s: StrokeShape) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Lightweight freehand canvas. Renders in normalized coords (0..1) so remote
 * peers at any resolution reproduce strokes faithfully.
 */
export const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  function DrawingCanvas(
    { readOnly, color, size, erasing, onStrokeComplete, className, ...rest },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [drawing, setDrawing] = useState(false);
    const strokeRef = useRef<StrokeShape | null>(null);

    function getCtx() {
      const c = canvasRef.current;
      if (!c) return null;
      return c.getContext("2d");
    }

    function drawStroke(s: StrokeShape) {
      const c = canvasRef.current;
      const ctx = getCtx();
      if (!c || !ctx) return;
      const w = c.width;
      const h = c.height;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = s.size;
      ctx.strokeStyle = s.color;
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }

    function clear() {
      const c = canvasRef.current;
      const ctx = getCtx();
      if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    }

    useImperativeHandle(ref, () => ({
      drawStroke,
      drawAll: (ss) => {
        clear();
        ss.forEach(drawStroke);
      },
      clear,
    }));

    // Keep internal pixel size in sync with displayed size for crisp rendering.
    useEffect(() => {
      const c = canvasRef.current;
      if (!c) return;
      const resize = () => {
        const rect = c.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round(rect.width * dpr);
        c.height = Math.round(rect.height * dpr);
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, []);

    function toNormalized(e: React.PointerEvent) {
      const c = canvasRef.current!;
      const rect = c.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      return { x, y };
    }

    function onDown(e: React.PointerEvent) {
      if (readOnly) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDrawing(true);
      const p = toNormalized(e);
      const pxSize = Math.max(1, size * (canvasRef.current?.width ?? 800) / 1000);
      strokeRef.current = {
        color,
        size: pxSize,
        erase: erasing,
        points: [p],
      };
      drawStroke(strokeRef.current);
    }

    function onMove(e: React.PointerEvent) {
      if (!drawing || !strokeRef.current) return;
      const p = toNormalized(e);
      strokeRef.current.points.push(p);
      drawStroke(strokeRef.current);
    }

    function onUp() {
      if (!drawing) return;
      setDrawing(false);
      const s = strokeRef.current;
      strokeRef.current = null;
      if (s && onStrokeComplete) onStrokeComplete(s);
    }

    return (
      <canvas
        ref={canvasRef}
        className={cn(
          "rounded-xl bg-white touch-none select-none aspect-[4/3] w-full",
          readOnly && "cursor-not-allowed",
          className,
        )}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        {...rest}
      />
    );
  },
);
