import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MINIMIZED_ACTIVITY_IMAGE = "/activity-minimized.png";
const PREVIEW_ELECTRONS = [
  { angle: 18, distance: "5.3rem", color: "hsl(var(--accent))" },
  { angle: 146, distance: "4.7rem", color: "hsl(var(--primary))" },
  { angle: 272, distance: "5rem", color: "hsl(var(--glow-warm))" },
];

function isCompactPreviewViewport() {
  if (typeof window === "undefined") return false;
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return height <= 420 && width <= 760;
}

/**
 * Activity preview overlay.
 *
 * User request: use the supplied home-screen screenshot as the displayed image
 * when the activity is minimised.
 *
 * We listen for `visibilitychange` and mount the screenshot overlay while the
 * tab is hidden. Discord's pop-up/minimised activity can also keep the page
 * visible while shrinking the viewport, so compact viewports show the same
 * static image instead of a tiny squashed copy of the live app.
 */
export function MinimizeOverlay() {
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" ? document.visibilityState === "hidden" : false,
  );
  const [compactPreview, setCompactPreview] = useState(isCompactPreviewViewport);

  useEffect(() => {
    const image = new Image();
    image.src = MINIMIZED_ACTIVITY_IMAGE;

    function onVis() {
      setHidden(document.visibilityState === "hidden");
    }
    function onResize() {
      setCompactPreview(isCompactPreviewViewport());
    }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    onResize();

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  const showingPreview = hidden || compactPreview;
  const mode = compactPreview ? "atom" : "image";

  return (
    <AnimatePresence>
      {showingPreview && (
        <motion.div
          key="minimize-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-[60] pointer-events-none overflow-hidden bg-background"
          aria-hidden="true"
        >
          {mode === "atom" ? (
            <CompactAtomPreview />
          ) : (
            <img
              src={MINIMIZED_ACTIVITY_IMAGE}
              alt=""
              className="h-full w-full object-cover object-center"
              draggable={false}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CompactAtomPreview() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="relative h-44 w-44"
      >
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

        <div aria-hidden="true" className="absolute inset-0 animate-rotate-slow">
          {PREVIEW_ELECTRONS.map((electron) => (
            <span
              key={`${electron.angle}-${electron.distance}`}
              className="absolute left-1/2 top-1/2 h-3.5 w-3.5 rounded-full"
              style={{
                transform: `translate(-50%, -50%) rotate(${electron.angle}deg) translateY(calc(-1 * ${electron.distance}))`,
                background: electron.color,
                boxShadow: `0 0 14px ${electron.color}`,
              }}
            />
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center">
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
            src="/qmul-logo.png"
            alt=""
            aria-hidden="true"
            className="relative h-24 w-24 rounded-full shadow-lg shadow-primary/25 animate-nucleus-breathe"
            draggable={false}
          />
        </div>
      </motion.div>
    </div>
  );
}
