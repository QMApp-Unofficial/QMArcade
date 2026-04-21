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

const DUST = [
  { top: "7%", left: "10%", width: 2, height: 2, rotate: 0, hue: "44 96% 78%", opacity: 0.24, blur: 0.4, delay: "-1.4s", duration: "20s" },
  { top: "10%", left: "24%", width: 2, height: 6, rotate: 26, hue: "24 88% 70%", opacity: 0.18, blur: 0.8, delay: "-6.2s", duration: "26s" },
  { top: "14%", left: "56%", width: 3, height: 3, rotate: 0, hue: "220 28% 82%", opacity: 0.18, blur: 0.6, delay: "-3.1s", duration: "18s" },
  { top: "16%", left: "81%", width: 1, height: 5, rotate: -18, hue: "44 96% 80%", opacity: 0.22, blur: 1.1, delay: "-9.3s", duration: "24s" },
  { top: "22%", left: "6%", width: 2, height: 2, rotate: 0, hue: "24 88% 70%", opacity: 0.16, blur: 0.7, delay: "-7.6s", duration: "22s" },
  { top: "27%", left: "18%", width: 2, height: 8, rotate: 34, hue: "220 28% 82%", opacity: 0.16, blur: 1.2, delay: "-2.8s", duration: "28s" },
  { top: "29%", left: "73%", width: 3, height: 3, rotate: 0, hue: "44 96% 78%", opacity: 0.2, blur: 0.5, delay: "-4.6s", duration: "17s" },
  { top: "34%", left: "88%", width: 2, height: 7, rotate: -28, hue: "24 88% 70%", opacity: 0.14, blur: 1.4, delay: "-10.2s", duration: "23s" },
  { top: "38%", left: "12%", width: 1, height: 4, rotate: 12, hue: "44 96% 80%", opacity: 0.17, blur: 0.9, delay: "-5.5s", duration: "19s" },
  { top: "41%", left: "27%", width: 2, height: 2, rotate: 0, hue: "220 28% 82%", opacity: 0.14, blur: 0.4, delay: "-8.1s", duration: "21s" },
  { top: "45%", left: "79%", width: 3, height: 9, rotate: 18, hue: "44 96% 78%", opacity: 0.16, blur: 1.5, delay: "-6.7s", duration: "27s" },
  { top: "49%", left: "92%", width: 2, height: 2, rotate: 0, hue: "24 88% 70%", opacity: 0.18, blur: 0.5, delay: "-11.2s", duration: "18s" },
  { top: "54%", left: "8%", width: 3, height: 3, rotate: 0, hue: "44 96% 80%", opacity: 0.2, blur: 0.6, delay: "-2.3s", duration: "16s" },
  { top: "58%", left: "34%", width: 1, height: 6, rotate: -22, hue: "220 28% 82%", opacity: 0.15, blur: 1.2, delay: "-9.8s", duration: "24s" },
  { top: "61%", left: "67%", width: 2, height: 2, rotate: 0, hue: "24 88% 70%", opacity: 0.16, blur: 0.7, delay: "-4.2s", duration: "20s" },
  { top: "64%", left: "84%", width: 2, height: 7, rotate: 31, hue: "44 96% 78%", opacity: 0.14, blur: 1.3, delay: "-7.9s", duration: "29s" },
  { top: "70%", left: "16%", width: 3, height: 3, rotate: 0, hue: "220 28% 82%", opacity: 0.13, blur: 0.5, delay: "-5.1s", duration: "19s" },
  { top: "73%", left: "52%", width: 2, height: 8, rotate: 24, hue: "24 88% 70%", opacity: 0.17, blur: 1.1, delay: "-1.9s", duration: "25s" },
  { top: "76%", left: "90%", width: 1, height: 4, rotate: -12, hue: "44 96% 80%", opacity: 0.18, blur: 0.8, delay: "-8.8s", duration: "18s" },
  { top: "82%", left: "26%", width: 2, height: 2, rotate: 0, hue: "24 88% 70%", opacity: 0.15, blur: 0.4, delay: "-3.7s", duration: "17s" },
  { top: "84%", left: "63%", width: 3, height: 10, rotate: -19, hue: "220 28% 82%", opacity: 0.13, blur: 1.5, delay: "-10.4s", duration: "28s" },
  { top: "88%", left: "78%", width: 2, height: 2, rotate: 0, hue: "44 96% 78%", opacity: 0.2, blur: 0.5, delay: "-6.3s", duration: "22s" },
];

/*
 * Picker sizing — the full atom is always visible. PICKER_SIZE is bounded by
 * 100dvh so the whole thing fits the Discord iframe without ever introducing
 * scroll, and all five orbital tiles stay inside the viewport.
 */
const PICKER_SIZE = "min(94vw, max(17.75rem, 100dvh - 19.5rem), 34rem)";
const RADIUS = `calc(${PICKER_SIZE} * 0.39)`;

export function Home() {
  const { user } = useAuth();
  const [hovered, setHovered] = useState<number | null>(null);
  const [nucleusZap, setNucleusZap] = useState(0);
  const active = hovered !== null ? TILES[hovered] : null;

  return (
    <div className="relative isolate flex-1 min-h-0 flex flex-col items-center gap-2 sm:gap-3 md:gap-4 py-0 md:py-2">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {DUST.map((piece, index) => (
          <span
            key={`${piece.top}-${piece.left}-${index}`}
            className="absolute rounded-full animate-dust-drift"
            style={
              {
                top: piece.top,
                left: piece.left,
                width: `${piece.width}px`,
                height: `${piece.height}px`,
                "--dust-rotate": `${piece.rotate}deg`,
                transform: `rotate(${piece.rotate}deg)`,
                background: `hsl(${piece.hue} / ${piece.opacity})`,
                boxShadow: `0 0 ${Math.max(piece.blur * 10, 6)}px hsl(${piece.hue} / ${piece.opacity * 0.75})`,
                filter: `blur(${piece.blur}px)`,
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
        <p className="chip mb-2 sm:mb-3">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{user ? `Welcome back, ${user.username}` : "Queen Mary · arcade"}</span>
        </p>
        <h1
          className="font-display text-[2.75rem] min-[390px]:text-[3.15rem] sm:text-[3.45rem] md:text-[4.1rem] lg:text-[4.35rem] font-extrabold leading-[0.88] tracking-[-0.042em] text-foreground flex items-baseline"
          style={{
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
        <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span className="h-px w-7 bg-border" />
          <span>est. 2026</span>
          <span className="h-px w-7 bg-border" />
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
        className="relative z-10 text-[10px] sm:text-[11px] text-muted-foreground text-center px-4 shrink-0"
      >
        {active ? "Tap to launch." : "Tap a tile, or poke the nucleus."}
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

      <div className="absolute left-1/2 top-1/2 z-10 grid h-36 w-36 min-[390px]:h-40 min-[390px]:w-40 md:h-48 md:w-48 -translate-x-1/2 -translate-y-1/2 place-items-center">
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
                  className="h-10 w-10 min-[390px]:h-12 min-[390px]:w-12 md:h-14 md:w-14 rounded-xl grid place-items-center"
                  style={{
                    background: `hsl(${active.hue} / 0.2)`,
                    color: `hsl(${active.hue})`,
                  }}
                >
                  <active.icon className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6 md:h-7 md:w-7" />
                </div>
                <span className="font-display font-semibold text-sm min-[390px]:text-base md:text-lg">
                  {active.title}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground px-2 max-w-[11rem] sm:max-w-[13rem] leading-relaxed">
                  {active.description}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNucleusClick}
                aria-label="Charge the nucleus"
                className="relative h-24 w-24 min-[390px]:h-28 min-[390px]:w-28 md:h-32 md:w-32 grid place-items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
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
                    "relative h-[4.25rem] w-[4.25rem] min-[390px]:h-[5rem] min-[390px]:w-[5rem] md:h-24 md:w-24 rounded-full shadow-lg shadow-primary/25 animate-nucleus-breathe",
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
        "group relative block rounded-2xl surface p-3 min-[390px]:p-4 active:scale-[0.97]",
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
        className="h-10 w-10 min-[390px]:h-12 min-[390px]:w-12 md:h-14 md:w-14 rounded-xl grid place-items-center"
        style={{
          background: `hsl(${tile.hue} / 0.14)`,
          color: `hsl(${tile.hue})`,
        }}
      >
        <Icon className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6 md:h-7 md:w-7" strokeWidth={2.2} />
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 4 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="absolute -bottom-2 left-1/2 hidden -translate-x-1/2 translate-y-full whitespace-nowrap pointer-events-none sm:block"
      >
        <span className="chip">
          {tile.title} <ArrowRight className="h-3 w-3" />
        </span>
      </motion.div>
    </Link>
  );
}
