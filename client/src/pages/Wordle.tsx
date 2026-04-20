import { useCallback, useEffect, useMemo, useState } from "react";
import { CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { WORDLE } from "@qmul/shared";
import type { LetterFeedback, WordleState, WordleStats } from "@qmul/shared";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Share2, X } from "lucide-react";

const KEYBOARD = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["ENTER", "z", "x", "c", "v", "b", "n", "m", "BACK"],
];

function rank(a: LetterFeedback, b: LetterFeedback): LetterFeedback {
  const order = { absent: 0, present: 1, correct: 2 } as const;
  return order[b] > order[a] ? b : a;
}

function buildKeyMap(
  guesses: string[],
  feedback: LetterFeedback[][],
): Record<string, LetterFeedback> {
  const map: Record<string, LetterFeedback> = {};
  guesses.forEach((g, i) => {
    g.split("").forEach((ch, j) => {
      const cur = map[ch];
      const nxt = feedback[i]?.[j];
      if (!nxt) return;
      map[ch] = cur ? rank(cur, nxt) : nxt;
    });
  });
  return map;
}

function feedbackToEmoji(fb: LetterFeedback): string {
  return fb === "correct" ? "🟩" : fb === "present" ? "🟨" : "⬛";
}

export function WordlePage() {
  const toast = useToast();
  const [state, setState] = useState<WordleState | null>(null);
  const [stats, setStats] = useState<WordleStats | null>(null);
  const [current, setCurrent] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, st] = await Promise.all([
      api.get<WordleState>("/wordle/state"),
      api.get<WordleStats>("/wordle/stats"),
    ]);
    setState(s);
    setStats(st);
  }, []);

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  const keyMap = useMemo(
    () => (state ? buildKeyMap(state.guesses, state.feedback) : {}),
    [state],
  );

  const submit = useCallback(async () => {
    if (!state || state.status !== "in_progress" || busy) return;
    if (current.length !== WORDLE.LENGTH) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setBusy(true);
    try {
      const next = await api.post<WordleState>("/wordle/guess", { guess: current });
      setState(next);
      setCurrent("");
      if (next.status === "won") {
        toast.push({ title: "Nice!", description: `Solved in ${next.guesses.length}.`, tone: "success" });
      } else if (next.status === "lost") {
        toast.push({ title: "Out of guesses", description: `Answer: ${next.answer}`, tone: "error" });
      }
      // Refresh stats when round ends
      if (next.status !== "in_progress") {
        api.get<WordleStats>("/wordle/stats").then(setStats).catch(() => {});
      }
    } catch (e: any) {
      const code = e?.message;
      if (code === "invalid_guess" || code === "not_in_dictionary") {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        toast.push({
          title: code === "not_in_dictionary" ? "Not in dictionary" : "Not a valid word",
          tone: "error",
        });
      } else {
        // Show the real error rather than a generic fallback so bad network /
        // auth states are diagnosable. Falls back to the raw message for
        // unknown codes.
        toast.push({
          title: code === "not_authenticated"
            ? "Please log in again"
            : "Couldn't submit guess",
          description: code || "Network error — check your connection.",
          tone: "error",
        });
      }
    } finally {
      setBusy(false);
    }
  }, [state, busy, current, toast]);

  // Keyboard input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!state || state.status !== "in_progress") return;
      if (e.key === "Enter") return void submit();
      if (e.key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key) && current.length < WORDLE.LENGTH) {
        setCurrent((c) => (c + e.key).toLowerCase());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, current, submit]);

  const shareGrid = useMemo(() => {
    if (!state) return "";
    const rows = state.feedback.map((row) => row.map(feedbackToEmoji).join("")).join("\n");
    const score =
      state.status === "won" ? `${state.guesses.length}/${WORDLE.MAX_ATTEMPTS}` : "X/6";
    return `QM⁻ Wordle ${state.date} ${score}\n${rows}`;
  }, [state]);

  function onShare() {
    if (!state || state.status === "in_progress") return;
    navigator.clipboard
      .writeText(shareGrid)
      .then(() =>
        toast.push({ title: "Copied to clipboard", tone: "success" }),
      )
      .catch(() => toast.push({ title: "Could not copy", tone: "error" }));
  }

  if (!state) {
    return <div className="text-muted-foreground">Loading today's puzzle…</div>;
  }

  const rows: string[] = [];
  for (let i = 0; i < WORDLE.MAX_ATTEMPTS; i++) {
    if (i < state.guesses.length) rows.push(state.guesses[i]);
    else if (i === state.guesses.length) rows.push(current);
    else rows.push("");
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center w-full">
      <div className="w-full max-w-xl flex-1 min-h-0 flex flex-col">
        <div className="flex items-end justify-between gap-2 mb-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Daily · {state.date}
              </p>
            </div>
            <h3
              className="font-display text-xl md:text-2xl font-extrabold tracking-[-0.015em] leading-none"
              style={{ fontVariationSettings: '"wdth" 86' }}
            >
              Wordle
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setStatsOpen(true)}
              aria-label="Open stats"
            >
              <BarChart3 className="h-4 w-4" strokeWidth={2.2} /> Stats
            </Button>
            {state.status !== "in_progress" && (
              <Button variant="secondary" onClick={onShare} aria-label="Share result">
                <Share2 className="h-4 w-4" strokeWidth={2.2} /> Share
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div
            className={cn(
              "wordle-board flex flex-col gap-1.5",
              shake && "animate-shake",
            )}
            role="grid"
            aria-label="Wordle board"
          >
            {rows.map((row, i) => (
              <div className="flex gap-1.5" role="row" key={i}>
                {Array.from({ length: WORDLE.LENGTH }).map((_, j) => {
                  const letter = row[j] || "";
                  const fb = state.feedback[i]?.[j];
                  const state_ =
                    fb === "correct"
                      ? "correct"
                      : fb === "present"
                        ? "present"
                        : fb === "absent"
                          ? "absent"
                          : letter
                            ? "filled"
                            : "empty";
                  return (
                    <motion.div
                      key={j}
                      role="gridcell"
                      aria-label={letter ? `${letter}, ${fb ?? "unplayed"}` : "empty"}
                      className={cn("tile", state_)}
                      initial={fb ? { rotateX: 90, opacity: 0.4 } : false}
                      animate={fb ? { rotateX: 0, opacity: 1 } : {}}
                      transition={{ delay: j * 0.1 }}
                    >
                      {letter.toUpperCase()}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {state.status === "in_progress" ? (
          <div
            className="shrink-0 w-full mt-3"
            role="group"
            aria-label="on-screen keyboard"
          >
            <div className="flex flex-col gap-1.5">
              {KEYBOARD.map((row, i) => (
                <div key={i} className="flex justify-center gap-1.5">
                  {row.map((k) => {
                    const low = k.toLowerCase();
                    const kind = keyMap[low];
                    const wide = k === "ENTER" || k === "BACK";
                    return (
                      <button
                        key={k}
                        className={cn("key", wide && "wide", kind && kind)}
                        onClick={() => {
                          if (k === "ENTER") return void submit();
                          if (k === "BACK") return setCurrent((c) => c.slice(0, -1));
                          if (current.length < WORDLE.LENGTH) setCurrent((c) => c + low);
                        }}
                        aria-label={k === "BACK" ? "Backspace" : k}
                      >
                        {k === "BACK" ? "⌫" : k}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <pre className="shrink-0 mx-auto mt-3 font-mono text-xs bg-foreground/[0.03] rounded-lg p-3 border border-border leading-relaxed">
{shareGrid}
          </pre>
        )}
      </div>

      <AnimatePresence>
        {statsOpen && <StatsDialog stats={stats} onClose={() => setStatsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function StatsDialog({
  stats,
  onClose,
}: {
  stats: WordleStats | null;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="card-elev w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your Wordle stats"
      >
        <button
          className="absolute top-3 right-3 btn-ghost p-1.5"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <CardHeader title="Your stats" />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Streak" value={stats?.streak ?? 0} />
          <Stat label="Best" value={stats?.best_streak ?? 0} />
          <Stat label="Wins" value={stats?.wins ?? 0} />
          <Stat label="Losses" value={stats?.losses ?? 0} />
        </div>
        <div className="mt-5">
          <h4 className="text-sm font-medium mb-2">Guess distribution</h4>
          <div className="space-y-1">
            {Array.from({ length: WORDLE.MAX_ATTEMPTS }).map((_, i) => {
              const attempts = i + 1;
              const count = stats?.distribution?.[attempts] ?? 0;
              const max = Math.max(1, ...Object.values(stats?.distribution ?? {}));
              const pct = Math.round((count / max) * 100);
              return (
                <div key={attempts} className="flex items-center gap-2">
                  <span className="w-3 text-xs text-muted-foreground">{attempts}</span>
                  <div className="flex-1 bg-foreground/5 rounded overflow-hidden h-5">
                    <div
                      className="h-full bg-primary/70 flex items-center justify-end pr-2 text-xs font-medium"
                      style={{ width: `${Math.max(8, pct)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-foreground/5 border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
