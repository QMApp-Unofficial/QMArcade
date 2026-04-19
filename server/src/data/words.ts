import allEnglishWords from "an-array-of-english-words";

// Answer list. 5-letter words only. Keep PG for a university server.
export const WORDLE_ANSWERS = [
  "arise", "audio", "bacon", "beach", "brave", "brick", "brown", "candy",
  "chess", "cloud", "crane", "crisp", "daisy", "dizzy", "drink", "earth",
  "eagle", "flame", "flour", "glide", "grape", "hatch", "heart", "ivory",
  "jumpy", "knife", "lemon", "lunar", "magic", "maple", "night", "ocean",
  "pearl", "piano", "plant", "pride", "queen", "quilt", "ready", "river",
  "royal", "scale", "shine", "sleep", "smile", "snake", "spice", "stone",
  "swift", "tiger", "torch", "train", "trust", "ultra", "vivid", "voice",
  "watch", "whale", "witty", "world", "write", "yield", "young", "zesty",
];

export function isAcceptableGuess(word: string, length = 5): boolean {
  return new RegExp(`^[a-zA-Z]{${length}}$`).test(word);
}

const FIVE_LETTER_WORDS = new Set(
  allEnglishWords.filter((w) => w.length === 5).map((w) => w.toLowerCase()),
);
for (const w of WORDLE_ANSWERS) FIVE_LETTER_WORDS.add(w);

export function isRealEnglishWord(word: string): boolean {
  return FIVE_LETTER_WORDS.has(word.toLowerCase());
}

export function pickDailyWord(dateKey: string): string {
  // Deterministic: hash the date to an index. 5-user server, no need for true randomness.
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return WORDLE_ANSWERS[h % WORDLE_ANSWERS.length];
}
