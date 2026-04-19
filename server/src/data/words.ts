import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const DICTIONARY: string[] = JSON.parse(
  readFileSync(join(here, "wordle-words.json"), "utf8"),
);
const DICTIONARY_SET = new Set(DICTIONARY.map((w) => w.toLowerCase()));

const ANSWERS: string[] = JSON.parse(
  readFileSync(join(here, "wordle-answers.json"), "utf8"),
).map((w: string) => w.toLowerCase());

for (const a of ANSWERS) DICTIONARY_SET.add(a);

export const WORDLE_ANSWERS = ANSWERS;

export function isAcceptableGuess(word: string, length = 5): boolean {
  return new RegExp(`^[a-zA-Z]{${length}}$`).test(word);
}

export function isRealEnglishWord(word: string): boolean {
  return DICTIONARY_SET.has(word.toLowerCase());
}

export function pickDailyWord(dateKey: string): string {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return ANSWERS[h % ANSWERS.length];
}
