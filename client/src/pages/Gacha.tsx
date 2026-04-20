import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FullscreenButton } from "@/components/FullscreenButton";
import { api } from "@/lib/api";
import type {
  GachaCharacter,
  GachaInventoryEntry,
  GachaRollResult,
  GachaStatus,
  Rarity,
} from "@qmul/shared";
import { GACHA } from "@qmul/shared";
import { cn, formatCountdown } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Star, Coins } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

const RARITY_CLASS: Record<Rarity, string> = {
  common: "rarity-common",
  rare: "rarity-rare",
  epic: "rarity-epic",
  legendary: "rarity-legendary",
};

export function GachaPage() {
  const toast = useToast();
  const activityRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<GachaStatus | null>(null);
  const [inventory, setInventory] = useState<GachaInventoryEntry[]>([]);
  const [totalRoster, setTotalRoster] = useState<number>(0);
  const [reveal, setReveal] = useState<GachaRollResult | null>(null);
  const [rollId, setRollId] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [filter, setFilter] = useState<Rarity | "all">("all");

  const load = useCallback(async () => {
    const [s, inv] = await Promise.all([
      api.get<GachaStatus>("/gacha/status"),
      api.get<{ inventory: GachaInventoryEntry[]; total: number }>(
        "/gacha/inventory",
      ),
    ]);
    setStatus(s);
    setInventory(inv.inventory);
    setTotalRoster(inv.total);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshIn = useMemo(() => {
    if (!status) return 0;
    return new Date(status.nextRefreshAt).getTime() - nowTick;
  }, [status, nowTick]);

  async function roll() {
    if (!status || status.rollsRemaining <= 0 || rolling) return;
    setRolling(true);
    try {
      const r = await api.post<GachaRollResult>("/gacha/roll", {});
      setReveal(r);
      setRollId((n) => n + 1);
      setStatus({
        rollsMax: status.rollsMax,
        rollsRemaining: r.rollsRemaining,
        nextRefreshAt: r.nextRefreshAt,
        currency: r.currency,
      });
      // Reload inventory in background
      api
        .get<{ inventory: GachaInventoryEntry[]; total: number }>("/gacha/inventory")
        .then((inv) => setInventory(inv.inventory));
      if (r.character.rarity === "legendary") {
        toast.push({
          title: "LEGENDARY!",
          description: r.character.name,
          tone: "success",
        });
      }
    } catch (e: any) {
      const code = e?.message;
      toast.push({
        title: code === "cooldown"
          ? "No rolls left"
          : code === "not_authenticated"
            ? "Please log in again"
            : "Roll failed",
        description: code === "cooldown"
          ? "Your next rolls are still regenerating."
          : code || "Network error — check your connection.",
        tone: "error",
      });
    } finally {
      setRolling(false);
    }
  }

  async function toggleFav(ch: GachaCharacter, favorite: boolean) {
    await api.post("/gacha/favorite", { character_id: ch.id, favorite });
    setInventory((inv) =>
      inv.map((e) => (e.character.id === ch.id ? { ...e, favorite } : e)),
    );
  }

  const filtered = useMemo(
    () =>
      filter === "all"
        ? inventory
        : inventory.filter((e) => e.character.rarity === filter),
    [inventory, filter],
  );

  return (
    <div
      ref={activityRef}
      className="gacha-page activity-fullscreen activity-fullscreen-scroll flex min-h-0 flex-col gap-6"
    >
      <div className={cn("gacha-top-grid grid gap-6", reveal && "xl:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]")}>
        <Card>
          <CardHeader
            title="Character Gacha"
            description={`${GACHA.ROLLS_PER_WINDOW} rolls every ${GACHA.WINDOW_HOURS}h. Duplicates convert to currency.`}
            right={
              <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                <FullscreenButton targetRef={activityRef} label="gacha" />
                <span className="chip" aria-label="Currency">
                  <Coins className="h-3.5 w-3.5" /> {status?.currency ?? 0}
                </span>
                <span className="chip">
                  {status ? `${status.rollsRemaining}/${status.rollsMax}` : "…"} rolls
                </span>
                <span className="chip">
                  next: {formatCountdown(refreshIn)}
                </span>
              </div>
            }
          />
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Button
              onClick={roll}
              disabled={!status || status.rollsRemaining <= 0 || rolling}
              className="sm:self-start"
            >
              <Sparkles className="h-4 w-4" />
              Roll
            </Button>
            <p className="text-xs text-muted-foreground">
              Weights: common {GACHA.RARITY_WEIGHTS.common}%, rare {GACHA.RARITY_WEIGHTS.rare}%, epic {GACHA.RARITY_WEIGHTS.epic}%, legendary {GACHA.RARITY_WEIGHTS.legendary}%.
            </p>
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {reveal && (
            <motion.div
              key={rollId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="dialog"
              aria-live="polite"
              aria-label={`Rolled ${reveal.character.name}`}
            >
              <Card className={cn("gacha-reveal-card grid gap-5 items-center sm:grid-cols-[160px_1fr]", RARITY_CLASS[reveal.character.rarity])}>
                <motion.img
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.45 }}
                  src={reveal.character.image}
                  alt={reveal.character.name}
                  loading="eager"
                  className="gacha-reveal-image w-40 aspect-square rounded-xl bg-foreground/5 object-contain"
                />
                <div>
                  <div className="chip mb-2" style={{ color: GACHA.RARITY_COLORS[reveal.character.rarity] }}>
                    {RARITY_LABEL[reveal.character.rarity]}
                  </div>
                  <h3 className="font-display text-2xl font-bold">{reveal.character.name}</h3>
                  {reveal.character.source && (
                    <p className="text-sm text-muted-foreground">From {reveal.character.source}</p>
                  )}
                  <p className="mt-2 text-sm">
                    {reveal.isNew
                      ? "New to your collection!"
                      : `Duplicate · owned ×${reveal.count} · +${reveal.currencyAwarded} currency`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => setReveal(null)}>
                      Close
                    </Button>
                    <Button onClick={roll} disabled={!status || status.rollsRemaining <= 0 || rolling}>
                      Roll again
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Card className="gacha-collection-card">
        <CardHeader
          title={`Your collection (${inventory.length}/${totalRoster})`}
          description="Favorites appear first. Click the star to toggle."
          right={
            <div className="flex gap-1 text-xs flex-wrap">
              {(["all", "common", "rare", "epic", "legendary"] as const).map((f) => (
                <button
                  key={f}
                  className={cn(
                    "chip transition-colors",
                    filter === f && "!bg-foreground !text-background !border-foreground",
                  )}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />
        <div className="gacha-collection-scroll">
          <div className="gacha-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered
              .slice()
              .sort((a, b) => Number(b.favorite) - Number(a.favorite))
              .map((e) => (
                <div
                  key={e.character.id}
                  className={cn(
                    "gacha-character-card relative rounded-xl p-3 bg-foreground/5 border border-border flex flex-col",
                    RARITY_CLASS[e.character.rarity],
                  )}
                >
                  <img
                    src={e.character.image}
                    alt={e.character.name}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg bg-foreground/5 object-contain"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold leading-none">{e.character.name}</div>
                      <div
                        className="text-[10px] uppercase tracking-wide mt-1"
                        style={{ color: GACHA.RARITY_COLORS[e.character.rarity] }}
                      >
                        {RARITY_LABEL[e.character.rarity]} · ×{e.count}
                      </div>
                    </div>
                    <button
                      className="p-1 rounded hover:bg-foreground/10"
                      aria-label={e.favorite ? "Unfavorite" : "Favorite"}
                      onClick={() => toggleFav(e.character, !e.favorite)}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          e.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  </div>
                </div>
              ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">
                No characters yet. Roll some!
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
