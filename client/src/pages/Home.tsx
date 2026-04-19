import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
    description: "Roll Pokémon. 10 pulls every 4 hours.",
    icon: Palette,
    hue: "8 78% 52%",
  },
  {
    to: "/scribble",
    title: "Scribble",
    description: "Draw, guess, laugh. 2–8 friends.",
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

const RADIUS = "min(34vw, 205px)";

export function Home() {
  const { user } = useAuth();
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered !== null ? TILES[hovered] : null;

  return (
    <div className="relative flex flex-col items-center gap-6 md:gap-10 pt-2 pb-8 md:pb-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl animate-float" />
        <div
          className="absolute top-1/2 -right-24 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl animate-float"
          style={{ animationDelay: "-2.4s" }}
        />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative flex flex-col items-center text-center px-4"
      >
        <p className="chip mb-5">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{user ? `Welcome back, ${user.username}` : "Queen Mary · arcade"}</span>
        </p>
        <h1
          className="font-display text-[clamp(2.8rem,9vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.035em] text-foreground"
          style={{ fontVariationSettings: '"wdth" 82, "opsz" 96' }}
        >
          {APP.NAME}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          <span className="h-px w-8 bg-border" />
          <span>est. 2026</span>
          <span className="h-px w-8 bg-border" />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-4 text-sm md:text-base text-muted-foreground max-w-md"
        >
          Play, collect, and scribble with your server. Everything saves.
        </motion.p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="relative grid place-items-center w-full"
        aria-label="Activity picker"
      >
        <CircularPicker hovered={hovered} onHover={setHovered} active={active} />
      </motion.section>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="text-xs text-muted-foreground text-center px-4"
      >
        {active ? "Click to launch →" : "Hover a tile — they orbit while you decide."}
      </motion.p>
    </div>
  );
}

function CircularPicker({
  hovered,
  onHover,
  active,
}: {
  hovered: number | null;
  onHover: (i: number | null) => void;
  active: Tile | null;
}) {
  const count = TILES.length;
  const paused = hovered !== null;

  return (
    <div
      className="relative mx-auto"
      style={{
        width: "min(88vw, 520px)",
        height: "min(88vw, 520px)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-accent/25 animate-orbit-glow"
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

      <div className="absolute inset-[34%] grid place-items-center pointer-events-none">
        <motion.div
          key={active?.to || "idle"}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="text-center"
        >
          {active ? (
            <div className="flex flex-col items-center gap-1.5">
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
            <div className="relative h-24 w-24 grid place-items-center">
              <div className="absolute inset-0 rounded-full bg-accent/15 blur-2xl animate-orbit-glow" />
              <img
                src="/qmul-logo.png"
                alt=""
                aria-hidden="true"
                className="relative h-20 w-20 rounded-full shadow-lg shadow-primary/25"
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function OrbitTile({
  tile,
  isHovered,
  isDimmed,
  onEnter,
  onLeave,
}: {
  tile: Tile;
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
        transition: "transform 220ms var(--ease-out-quint), opacity 220ms var(--ease-out-quint), box-shadow 220ms var(--ease-out-quint)",
        boxShadow: isHovered
          ? `0 0 0 1px hsl(${tile.hue} / 0.55), 0 18px 38px -14px hsl(${tile.hue} / 0.55)`
          : undefined,
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
