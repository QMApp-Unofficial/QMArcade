export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface User {
  discord_id: string;
  username: string;
  avatar?: string | null;
  is_admin?: boolean;
  created_at?: string;
}

export interface WordleState {
  date: string;
  guesses: string[];
  status: "in_progress" | "won" | "lost";
  wordLength: number;
  maxAttempts: number;
  // server-only: revealed when game ends
  answer?: string;
  feedback: LetterFeedback[][];
}

export type LetterFeedback = "correct" | "present" | "absent";

export interface WordleStats {
  streak: number;
  best_streak: number;
  wins: number;
  losses: number;
  distribution: Record<number, number>; // attempts -> count
  last_played: string | null;
}

export interface GachaCharacter {
  id: string;
  name: string;
  image: string;
  rarity: Rarity;
  source?: string;
}

export interface GachaInventoryEntry {
  character: GachaCharacter;
  count: number;
  favorite: boolean;
  first_rolled: string;
}

export interface GachaRollResult {
  character: GachaCharacter;
  isNew: boolean;
  count: number;
  rollsRemaining: number;
  nextRefreshAt: string;
  currency: number;
  currencyAwarded: number;
}

export interface GachaStatus {
  rollsRemaining: number;
  rollsMax: number;
  nextRefreshAt: string;
  currency: number;
}

export interface LeaderboardRow {
  discord_id: string;
  username: string;
  avatar?: string | null;
  wordle_best_streak: number;
  wordle_wins: number;
  gacha_count: number;
  scribble_score: number;
}

export interface ScribbleRoomState {
  roomId: string;
  players: ScribblePlayer[];
  drawerId: string | null;
  hostId: string | null;
  phase: "lobby" | "choosing" | "drawing" | "reveal" | "ended";
  wordChoices?: string[]; // only for drawer
  wordMasked?: string;
  wordRevealed?: string; // only during reveal
  wordLength?: number; // length of the current word (everyone can see this)
  round: number;
  totalRounds: number;
  maxPlayers: number;
  customWords: string[];
  endsAt?: number;
}

export interface ScribblePlayer {
  discord_id: string;
  username: string;
  avatar?: string | null;
  score: number;
  guessedThisRound: boolean;
  isDrawer: boolean;
}

export interface ScribbleStroke {
  color: string;
  size: number;
  erase?: boolean;
  points: { x: number; y: number }[];
}

export interface ScribbleChatMessage {
  id: string;
  user: string;
  username: string;
  text: string;
  kind: "chat" | "correct" | "close" | "system";
  at: number;
}

export interface WhiteboardStroke {
  id: string;
  author: string;
  color: string;
  size: number;
  erase?: boolean;
  points: { x: number; y: number }[];
  at: number;
}
