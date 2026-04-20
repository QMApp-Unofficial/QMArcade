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
    const strokesRef = useRef<StrokeShape[]>([]);

    function getCtx() {
      const c = canvasRef.current;
      if (!c) return null;
      return c.getContext("2d");
    }

    function renderStroke(s: StrokeShape) {
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

    function renderAll() {
      const c = canvasRef.current;
      const ctx = getCtx();
      if (!c || !ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      strokesRef.current.forEach(renderStroke);
    }

    function drawStroke(s: StrokeShape) {
      strokesRef.current.push(s);
      renderStroke(s);
    }

    function clear() {
      const c = canvasRef.current;
      const ctx = getCtx();
      strokesRef.current = [];
      if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    }

    useImperativeHandle(ref, () => ({
      drawStroke,
      drawAll: (ss) => {
        strokesRef.current = [...ss];
        renderAll();
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
        const nextWidth = Math.max(1, Math.round(rect.width * dpr));
        const nextHeight = Math.max(1, Math.round(rect.height * dpr));
        if (c.width === nextWidth && c.height === nextHeight) return;
        c.width = nextWidth;
        c.height = nextHeight;
        renderAll();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(c);
      resize();
      window.addEventListener("resize", resize);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", resize);
      };
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
      renderStroke(strokeRef.current);
    }

    function onMove(e: React.PointerEvent) {
      if (!drawing || !strokeRef.current) return;
      const p = toNormalized(e);
      strokeRef.current.points.push(p);
      renderStroke(strokeRef.current);
    }

    function onUp() {
      if (!drawing) return;
      setDrawing(false);
      const s = strokeRef.current;
      strokeRef.current = null;
      if (s) {
        strokesRef.current.push(s);
        if (onStrokeComplete) onStrokeComplete(s);
      }
    }

    return (
      <canvas
        ref={canvasRef}
        className={cn(
          "block rounded-xl bg-white touch-none select-none aspect-[4/3] w-full",
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
