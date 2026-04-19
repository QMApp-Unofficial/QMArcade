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

export function drawWordChoices(count = 3): string[] {
  const pool = [...SCRIBBLE_WORDS];
  const picks: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

export function maskWord(word: string): string {
  return word.replace(/[a-zA-Z]/g, "_");
}
