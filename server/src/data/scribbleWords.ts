// Keep to single words, easy to draw, PG.
export const SCRIBBLE_WORDS = [
  "apple", "airplane", "anchor", "astronaut",
  "balloon", "banana", "basket", "bicycle", "bridge", "bucket",
  "cactus", "candle", "carrot", "castle", "cloud", "compass", "crown",
  "dolphin", "donut", "dragon", "drum",
  "elephant", "envelope", "eye",
  "flag", "flower", "fork", "frog",
  "ghost", "giraffe", "guitar",
  "hammer", "helmet", "honey",
  "ice-cream", "island", "igloo",
  "jellyfish", "jacket",
  "kangaroo", "kite", "key",
  "ladder", "lamp", "lion", "lock",
  "mermaid", "moon", "mushroom",
  "nest", "necklace", "needle",
  "ocean", "octopus", "owl",
  "pancake", "parrot", "penguin", "pizza", "pumpkin",
  "queen", "quilt",
  "rainbow", "robot", "rocket",
  "sailboat", "snowman", "spider", "sword",
  "telescope", "tiger", "tree", "turtle",
  "umbrella", "unicorn",
  "volcano", "violin",
  "whale", "window", "wizard",
  "xylophone",
  "yacht", "yo-yo",
  "zebra", "zipper",
];

/**
 * Pick `count` distinct words. If `custom` is provided and non-empty, draw
 * from it instead of the default pool — letting a host prepare an in-joke
 * list for their group.
 */
export function drawWordChoices(count = 3, custom?: string[]): string[] {
  const source =
    custom && custom.length > 0 ? custom : SCRIBBLE_WORDS;
  const pool = [...source];
  const picks: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

export function maskWord(word: string, revealedIndexes: Iterable<number> = []): string {
  const visible = new Set(revealedIndexes);
  return word
    .split("")
    .map((ch, i) => (/[a-z0-9]/i.test(ch) ? (visible.has(i) ? ch : "_") : ch))
    .join("");
}
