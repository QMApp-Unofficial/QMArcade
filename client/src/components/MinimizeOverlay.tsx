import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { APP } from "@qmul/shared";

/**
 * Tab-visibility overlay.
 *
 * User request: "when we minimise the tab i want it to be an animation of the
 * atom moving with the title screen colour background behind it".
 *
 * We listen for `visibilitychange`. When the tab becomes hidden we mount an
 * overlay with the title-screen background wash and a slow-rotating atom, and
 * fade it in. When the tab comes back we fade it out. The overlay is always in
 * the DOM only while hidden, so on return the fade-out reveals the live app —
 * the hand-off looks like the atom is settling back into the UI.
 *
 * Hidden tabs don't get paint cycles, but because the overlay is already
 * mounted with CSS animations, the moment the tab regains focus the animation
 * is mid-swing, giving a convincing "it was running the whole time" feel.
 */
export function MinimizeOverlay() {
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" ? document.visibilityState === "hidden" : false,
  );

  useEffect(() => {
    function onVis() {
      setHidden(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <AnimatePresence>
      {hidden && (
        <motion.div
          key="minimize-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-[60] grid place-items-center pointer-events-none overflow-hidden"
          aria-hidden="true"
          style={{
            background: [
              "radial-gradient(1200px 600px at 8% -10%, hsl(var(--glow-primary) / 0.4), transparent 55%)",
              "radial-gradient(900px 500px at 108% 8%, hsl(var(--glow-accent) / 0.35), transparent 58%)",
              "radial-gradient(700px 400px at 60% 120%, hsl(var(--glow-warm) / 0.3), transparent 60%)",
              "hsl(var(--background))",
            ].join(", "),
          }}
        >
          <div className="relative h-[68vmin] w-[68vmin] grid place-items-center">
            {/* Orbits — rotate in opposite directions for the parallax feel. */}
            <div className="absolute inset-0 rounded-full border border-accent/30 animate-min-atom-orbit" />
            <div
              className="absolute inset-[14%] rounded-full border border-border"
              style={{
                animation: "min-atom-orbit 24s linear infinite reverse",
              }}
            />
            <div className="absolute inset-[28%] rounded-full border border-border/60 border-dashed animate-min-atom-orbit" />

            {/* Electron dots on the outer ring. */}
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = (i / 5) * 360;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-34vmin)`,
                    animation: `min-atom-orbit 18s linear infinite`,
                  }}
                >
                  <span className="block h-3 w-3 rounded-full bg-accent shadow-[0_0_24px_hsl(var(--accent))]" />
                </div>
              );
            })}

            {/* Nucleus — logo with the signature pulsing glow. */}
            <div className="relative h-32 w-32 grid place-items-center">
              <div className="absolute inset-0 rounded-full bg-accent/15 blur-3xl animate-min-nucleus-pulse" />
              <img
                src="/qmul-logo.png"
                alt=""
                className="relative h-28 w-28 rounded-full shadow-xl animate-min-nucleus-pulse"
              />
            </div>
          </div>

          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
            <div
              className="font-display text-2xl font-extrabold flex items-baseline"
              style={{ fontVariationSettings: '"wdth" 82' }}
            >
              <span>QM</span>
              <span
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
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {APP.LONG_NAME}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
