export function todayKey(d = new Date()): string {
  // UTC date so every user in the server gets the same word
  return d.toISOString().slice(0, 10);
}

export function dateOffset(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return todayKey(d);
}

export function isConsecutiveDay(previous: string, now: string): boolean {
  const a = new Date(previous + "T00:00:00Z").getTime();
  const b = new Date(now + "T00:00:00Z").getTime();
  return b - a === 24 * 60 * 60 * 1000;
}
