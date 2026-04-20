import { useEffect, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { FullscreenButton } from "@/components/FullscreenButton";
import { api } from "@/lib/api";
import type { LeaderboardRow } from "@qmul/shared";
import { Trophy } from "lucide-react";

export function LeaderboardPage() {
  const activityRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  useEffect(() => {
    api
      .get<{ rows: LeaderboardRow[] }>("/leaderboard")
      .then(({ rows }) => setRows(rows))
      .catch(() => {});
  }, []);

  const medal = (i: number) =>
    i === 0 ? "hsl(36 92% 52%)" : i === 1 ? "hsl(220 12% 65%)" : i === 2 ? "hsl(24 55% 45%)" : null;

  return (
    <div ref={activityRef} className="activity-fullscreen activity-fullscreen-scroll">
      <Card>
        <CardHeader
          title="Leaderboard"
          description="Wordle best streak, wins, collection size, and Scribble score."
          right={
            <div className="flex items-center gap-2">
              <FullscreenButton targetRef={activityRef} label="leaderboard" />
              <Trophy className="h-5 w-5" style={{ color: "hsl(36 92% 52%)" }} strokeWidth={2.2} />
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Leaderboard">
            <thead>
              <tr className="text-muted-foreground text-[10px] uppercase tracking-[0.18em] text-left">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="font-semibold">Player</th>
                <th className="text-right font-semibold tabular-nums">Streak</th>
                <th className="text-right font-semibold tabular-nums">Wins</th>
                <th className="text-right font-semibold tabular-nums">Collected</th>
                <th className="text-right font-semibold tabular-nums">Scribble</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {rows.map((r, i) => {
                const m = medal(i);
                return (
                  <tr key={r.discord_id} className="border-t border-border hover:bg-foreground/[0.025] transition-colors">
                    <td className="py-2.5 w-10">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                        style={m ? { background: m, color: "hsl(220 50% 10%)" } : { color: "hsl(var(--muted-foreground))" }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {r.avatar && (
                          <img
                            src={r.avatar}
                            alt=""
                            className="h-7 w-7 rounded-full border border-border"
                          />
                        )}
                        <span className="font-semibold">{r.username}</span>
                      </div>
                    </td>
                    <td className="text-right font-semibold tabular-nums">{r.wordle_best_streak}</td>
                    <td className="text-right tabular-nums">{r.wordle_wins}</td>
                    <td className="text-right tabular-nums">{r.gacha_count}</td>
                    <td className="text-right tabular-nums">{r.scribble_score}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-8">
                    No plays yet. Be the first!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
