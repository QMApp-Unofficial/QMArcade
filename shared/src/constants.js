"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP = exports.WHITEBOARD = exports.SCRIBBLE = exports.GACHA = exports.WORDLE = void 0;
exports.WORDLE = {
    LENGTH: 5,
    MAX_ATTEMPTS: 6,
};
exports.GACHA = {
    ROLLS_PER_WINDOW: 10,
    WINDOW_HOURS: 4,
    DUPLICATE_CURRENCY: {
        common: 5,
        rare: 15,
        epic: 50,
        legendary: 200,
    },
    RARITY_WEIGHTS: {
        common: 70,
        rare: 22,
        epic: 7,
        legendary: 1,
    },
    RARITY_COLORS: {
        common: "#94a3b8",
        rare: "#60a5fa",
        epic: "#c084fc",
        legendary: "#fbbf24",
    },
};
exports.SCRIBBLE = {
    ROUND_SECONDS: 75,
    CHOOSE_SECONDS: 15,
    REVEAL_SECONDS: 6,
    ROUNDS_PER_GAME: 3,
    MAX_PLAYERS: 8,
    MIN_PLAYERS: 2,
};
exports.WHITEBOARD = {
    AUTOSAVE_MS: 2000,
    MAX_STROKES: 5000,
};
exports.APP = {
    NAME: "QMUL Arcade",
};
