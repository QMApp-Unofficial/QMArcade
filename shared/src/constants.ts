export const WORDLE = {
  LENGTH: 5,
  MAX_ATTEMPTS: 6,
} as const;

export const GACHA = {
  ROLLS_PER_WINDOW: 3,
  WINDOW_HOURS: 4,
  DUPLICATE_CURRENCY: {
    common: 5,
    rare: 15,
    epic: 50,
    legendary: 200,
  } as const,
  RARITY_WEIGHTS: {
    common: 70,
    rare: 22,
    epic: 7,
    legendary: 1,
  } as const,
  RARITY_COLORS: {
    common: "#94a3b8",
    rare: "#60a5fa",
    epic: "#c084fc",
    legendary: "#fbbf24",
  } as const,
};

export const SCRIBBLE = {
  ROUND_SECONDS: 75,
  CHOOSE_SECONDS: 15,
  REVEAL_SECONDS: 6,
  ROUNDS_PER_GAME: 3,
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
};

export const WHITEBOARD = {
  AUTOSAVE_MS: 2000,
  MAX_STROKES: 5000,
};

export const APP = {
  /**
   * Display name for the app. The trailing character is U+207B SUPERSCRIPT
   * MINUS — the app is branded as a negative ion ("QM minus"), not "QMUL".
   * Use this constant for human-readable headings only; do NOT embed it in
   * URLs or identifiers.
   */
  NAME: "QM⁻",
  /** The longer collegiate spelling, for titles, email copy, and share text. */
  LONG_NAME: "QM⁻ · Queen Mary Arcade",
};
