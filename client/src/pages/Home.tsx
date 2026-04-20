import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Palette,
  Brush,
  Trophy,
  PenLine,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { APP } from "@qmul/shared";

type Tile = {
  to: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  hue: string;
};

const TILES: Tile[] = [
  {
    to: "/wordle",
    title: "Daily Wordle",
    description: "One puzzle a day. Keep your streak.",
    icon: Sparkles,
    hue: "148 60% 42%",
  },
  {
    to: "/gacha",
    title: "Character Gacha",
    description: "Roll Pokémon. 3 pulls every 4 hours.",
    icon: Palette,
    hue: "8 78% 52%",
  },
  {
    to: "/scribble",
    title: "Scribble",
    description: "Draw, guess, laugh.",
    icon: PenLine,
    hue: "200 78% 46%",
  },
  {
    to: "/whiteboard",
    title: "Whiteboard",
    description: "A shared canvas that never forgets.",
    icon: Brush,
    hue: "36 92% 50%",
  },
  {
    to: "/leaderboard",
    title: "Leaderboard",
    description: "See who rules the arcade.",
    icon: Trophy,
    hue: "272 52% 52%",
  },
];

const DEBRIS = [
  { top: "8%", left: "12%", width: 10, height: 42, rotate: -18, hue: "24 88% 48%", delay: "-1.6s", duration: "18s" },
  { top: "18%", left: "78%", width: 12, height: 32, rotate: 26, hue: "220 82% 24%", delay: "-4.3s", duration: "21s" },
  { top: "30%", left: "6%", width: 8, height: 26, rotate: 42, hue: "36 92% 50%", delay: "-2.7s", duration: "17s" },
  { top: "34%", left: "88%", width: 14, height: 38, rotate: -34, hue: "200 78% 46%", delay: "-7.1s", duration: "23s" },
  { top: "47%", left: "18%", width: 9, height: 24, rotate: 12, hue: "272 52% 52%", delay: "-5.4s", duration: "16s" },
  { top: "52%", left: "82%", width: 10, height: 34, rotate: -8, hue: "24 88% 48%", delay: "-2.2s", duration: "20s" },
  { top: "64%", left: "8%", width: 12, height: 30, rotate: 28, hue: "220 82% 24%", delay: "-6.8s", duration: "19s" },
  { top: "68%", left: "90%", width: 8, height: 20, rotate: -26, hue: "36 92% 50%", delay: "-3.3s", duration: "15s" },
  { top: "78%", left: "28%", width: 11, height: 36, rotate: 35, hue: "200 78% 46%", delay: "-8.4s", duration: "22s" },
  { top: "82%", left: "72%", width: 9, height: 28, rotate: -14, hue: "272 52% 52%", delay: "-1.1s", duration: "18.5s" },
  { top: "12%", left: "54%", width: 6, height: 18, rotate: 18, hue: "24 88% 48%", delay: "-9.2s", duration: "14s" },
  { top: "72%", left: "58%", width: 7, height: 22, rotate: -22, hue: "220 82% 24%", delay: "-4.9s", duration: "17.5s" },
];

/*
 * Picker sizing — the full atom is always visible. PICKER_SIZE is bounded by
 * 100dvh so the whole thing fits the Discord iframe without ever introducing
 * scroll, and all five orbital tiles stay inside the viewport.
 */
const PICKER_SIZE = "min(84vw, max(260px, 100dvh - 320px), 520px)";
const RADIUS = `calc(${PICKER_SIZE} * 0.395)`;

export function Home() {
  const { user } = useAuth();
  const [hovered, setHovered] = useState<number | null>(null);
  const [nucleusZap, setNucleusZap] = useState(0);
  const active = hovered !== null ? TILES[hovered] : null;

  return (
    <div className="relative isolate flex-1 min-h-0 flex flex-col items-center gap-3 md:gap-4 py-1 md:py-2">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {DEBRIS.map((piece, index) => (
          <span
            key={`${piece.top}-${piece.left}-${index}`}
            className="absolute rounded-sm border animate-debris-drift"
            style={
              {
                top: piece.top,
                left: piece.left,
                width: `${piece.width}px`,
                height: `${piece.height}px`,
                "--debris-rotate": `${piece.rotate}deg`,
                transform: `rotate(${piece.rotate}deg)`,
                borderColor: `hsl(${piece.hue} / 0.28)`,
                background: `linear-gradient(180deg, hsl(${piece.hue} / 0.24), transparent)`,
                boxShadow: `0 0 18px hsl(${piece.hue} / 0.12)`,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="absolute -top-40 -left-48 h-[760px] w-[760px] rounded-full bg-accent/10 blur-3xl animate-float" />
        <div
          className="absolute top-[42%] -right-56 h-[780px] w-[780px] rounded-full bg-primary/10 blur-3xl animate-float"
          style={{ animationDelay: "-2.4s" }}
        />
        <div
          className="absolute -bottom-48 left-[38%] h-[700px] w-[700px] rounded-full bg-accent/[0.08] blur-3xl animate-float"
          style={{ animationDelay: "-4.2s" }}
        />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex flex-col items-center text-center px-4 shrink-0"
      >
        <p className="chip mb-3">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{user ? `Welcome back, ${user.username}` : "Queen Mary · arcade"}</span>
        </p>
        <h1
          className="font-display font-extrabold leading-[0.92] tracking-[-0.035em] text-foreground flex items-baseline"
          style={{
            fontSize: "clamp(2.2rem, 7vw, 4.25rem)",
            fontVariationSettings: '"wdth" 82, "opsz" 96',
          }}
        >
          <span>QM</span>
          <span
            aria-hidden="true"
            className="text-accent"
            style={{
              fontSize: "0.6em",
              lineHeight: 1,
              marginLeft: "0.05em",
              transform: "translateY(-0.55em)",
              display: "inline-block",
            }}
          >
            −
          </span>
          <span className="sr-only">{APP.LONG_NAME}</span>
        </h1>
        <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span className="h-px w-6 bg-border" />
          <span>est. 2026</span>
          <span className="h-px w-6 bg-border" />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full flex-1 min-h-0 flex items-center justify-center"
        aria-label="Activity picker"
      >
        <div
          className="relative"
          style={{ width: PICKER_SIZE, height: PICKER_SIZE }}
        >
          <CircularPicker
            hovered={hovered}
            onHover={setHovered}
            active={active}
            onNucleusZap={() => setNucleusZap((n) => n + 1)}
            zapKey={nucleusZap}
          />
        </div>
      </motion.section>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="relative z-10 text-[11px] text-muted-foreground text-center px-4 shrink-0"
      >
        {active
          ? "Click to launch →"
          : "Hover a tile — or poke the nucleus."}
      </motion.p>
    </div>
  );
}

function CircularPicker({
  hovered,
  onHover,
  active,
  onNucleusZap,
  zapKey,
}: {
  hovered: number | null;
  onHover: (i: number | null) => void;
  active: Tile | null;
  onNucleusZap: () => void;
  zapKey: number;
}) {
  const count = TILES.length;
  const paused = hovered !== null;
  const [darts, setDarts] = useState<{ id: number; dx: number; dy: number }[]>([]);
  const dartId = useRef(0);

  function handleNucleusClick() {
    onNucleusZap();
    const burst = Array.from({ length: 6 }, () => {
      dartId.current += 1;
      const theta = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 60;
      return {
        id: dartId.current,
        dx: Math.cos(theta) * dist,
        dy: Math.sin(theta) * dist,
      };
    });
    setDarts((prev) => [...prev, ...burst]);
    window.setTimeout(() => {
      setDarts((prev) => prev.filter((d) => !burst.some((b) => b.id === d.id)));
    }, 900);
  }

  return (
    <div className="relative mx-auto w-full h-full">
      {/* Decorative orbit rings, with the outermost ring drifting between
         navy and amber to give the idle state a subtle life without
         distracting the user. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full border animate-orbit-glow animate-ring-hue-drift"
        style={{ borderColor: "hsl(var(--accent) / 0.28)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-[14%] rounded-full border border-border"
      />
      <div
        aria-hidden="true"
        className="absolute inset-[28%] rounded-full border border-border/60 border-dashed"
      />

      <div
        className={cn(
          "absolute inset-0 animate-rotate-slow",
          paused && "[animation-play-state:paused]",
        )}
      >
        {TILES.map((tile, i) => {
          const angle = (i / count) * 360;
          return (
            <div
              key={tile.to}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(-1 * ${RADIUS})) rotate(-${angle}deg)`,
              }}
            >
              <div
                className={cn(
                  "animate-rotate-slow-reverse",
                  paused && "[animation-play-state:paused]",
                )}
              >
                <OrbitTile
                  tile={tile}
                  index={i}
                  isHovered={hovered === i}
                  isDimmed={hovered !== null && hovered !== i}
                  onEnter={() => onHover(i)}
                  onLeave={() => onHover(null)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active?.to || "idle"}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="text-center"
          >
            {active ? (
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <div
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl grid place-items-center"
                  style={{
                    background: `hsl(${active.hue} / 0.2)`,
                    color: `hsl(${active.hue})`,
                  }}
                >
                  <active.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <span className="font-display font-semibold text-sm md:text-base">
                  {active.title}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground px-2 max-w-[12rem]">
                  {active.description}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNucleusClick}
                aria-label="Charge the nucleus"
                className="relative h-24 w-24 grid place-items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-accent/15 blur-xl animate-halo-pulse"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-primary/12 blur-2xl animate-halo-pulse"
                  style={{ animationDelay: "1.6s" }}
                />
                <img
                  key={zapKey}
                  src="/qmul-logo.png"
                  alt=""
                  aria-hidden="true"
                  className={cn(
                    "relative h-20 w-20 rounded-full shadow-lg shadow-primary/25 animate-nucleus-breathe",
                    zapKey > 0 && "animate-nucleus-zap",
                  )}
                />
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        {darts.map((d) => (
          <span
            key={d.id}
            aria-hidden="true"
            className="absolute h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_hsl(var(--accent))] pointer-events-none"
            style={
              {
                left: "50%",
                top: "50%",
                marginLeft: "-0.25rem",
                marginTop: "-0.25rem",
                "--dx": `${d.dx}px`,
                "--dy": `${d.dy}px`,
                animation:
                  "electron-dart 800ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function OrbitTile({
  tile,
  index,
  isHovered,
  isDimmed,
  onEnter,
  onLeave,
}: {
  tile: Tile;
  index: number;
  isHovered: boolean;
  isDimmed: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { icon: Icon } = tile;
  return (
    <Link
      to={tile.to}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onTouchStart={onEnter}
      className={cn(
        "group relative block rounded-2xl surface p-3 md:p-4 active:scale-[0.97]",
        isHovered && "scale-[1.08]",
        isDimmed && "opacity-35 scale-[0.94]",
      )}
      aria-label={`Open ${tile.title}`}
      style={{
        transition:
          "transform 220ms var(--ease-out-quint), opacity 220ms var(--ease-out-quint), box-shadow 220ms var(--ease-out-quint)",
        boxShadow: isHovered
          ? `0 0 0 1px hsl(${tile.hue} / 0.55), 0 18px 38px -14px hsl(${tile.hue} / 0.55)`
          : undefined,
        animation: `float-up 5s var(--ease-in-out-quart) infinite`,
        animationDelay: `${(index * 0.35).toFixed(2)}s`,
      }}
    >
      <div
        className="h-10 w-10 md:h-12 md:w-12 rounded-xl grid place-items-center"
        style={{
          background: `hsl(${tile.hue} / 0.14)`,
          color: `hsl(${tile.hue})`,
        }}
      >
        <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.2} />
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap pointer-events-none"
      >
        <span className="chip">
          {tile.title} <ArrowRight className="h-3 w-3" />
        </span>
      </motion.div>
    </Link>
  );
}
