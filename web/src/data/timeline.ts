// Simulated match feed for the demo. World Cup fixtures finish before judging, so
// the brief expects a replay / simulated feed — this is that feed, hand-authored to
// exercise every market outcome (YES, NO, first-half, red card, corners).
//
// The ingestion layer (../../ingestion, Go) records the REAL TxLINE SSE stream to
// ingestion/recordings/*.jsonl; those files are the proof of live ingestion. This
// timeline uses the identical composite stat-key format ("1001" = P1 first-half
// goals) so the same evaluation code runs against either source.

export type Phase = "PRE" | "H1" | "HT" | "H2" | "FT";

export interface MatchEvent {
  kind: "kickoff" | "goal" | "yellow" | "red" | "corner" | "whistle";
  team?: "home" | "away";
  text: string;
}

export interface Frame {
  /** match minute (0..90) */
  minute: number;
  phase: Phase;
  /** cumulative stat values keyed by TxLINE composite key */
  stats: Record<number, number>;
  event?: MatchEvent;
}

export interface Fixture {
  fixtureId: number;
  competition: string;
  home: string;
  away: string;
  homeId: number;
  awayId: number;
  /** kickoff, unix ms — from the real recording (fixture 18213979) */
  kickoff: number;
}

export const FIXTURE: Fixture = {
  fixtureId: 18213979,
  competition: "World Cup — Group Stage",
  home: "Norway",
  away: "England",
  homeId: 2661,
  awayId: 1888,
  kickoff: 1783803600000,
};

// Composite stat keys used by this fixture's markets:
//   1/2 goals, 3/4 yellows, 5/6 reds, 7/8 corners (home/away, full match)
//   1001/1002 first-half goals, 3001/3002 second-half goals
type Stats = Record<number, number>;
const base: Stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 1001: 0, 1002: 0, 3001: 0, 3002: 0 };

// Each frame is a full cumulative snapshot at an event minute; the replay engine
// holds the last frame <= the current minute.
export const FRAMES: Frame[] = [
  { minute: 0, phase: "H1", stats: { ...base }, event: { kind: "kickoff", text: "Kick-off" } },
  { minute: 12, phase: "H1", stats: { ...base, 8: 1 }, event: { kind: "corner", team: "away", text: "Corner — England" } },
  { minute: 23, phase: "H1", stats: { ...base, 8: 1, 1: 1, 1001: 1 }, event: { kind: "goal", team: "home", text: "GOAL! Norway 1–0" } },
  { minute: 34, phase: "H1", stats: { ...base, 8: 1, 1: 1, 1001: 1, 3: 1 }, event: { kind: "yellow", team: "home", text: "Yellow card — Norway" } },
  { minute: 41, phase: "H1", stats: { ...base, 8: 2, 1: 1, 1001: 1, 3: 1 }, event: { kind: "corner", team: "away", text: "Corner — England" } },
  { minute: 45, phase: "HT", stats: { ...base, 8: 2, 1: 1, 1001: 1, 3: 1 }, event: { kind: "whistle", text: "Half-time — Norway 1–0" } },
  { minute: 46, phase: "H2", stats: { ...base, 8: 2, 1: 1, 1001: 1, 3: 1 }, event: { kind: "whistle", text: "Second half under way" } },
  { minute: 58, phase: "H2", stats: { ...base, 8: 2, 1: 1, 1001: 1, 3: 1, 2: 1, 3002: 1 }, event: { kind: "goal", team: "away", text: "GOAL! England equalise 1–1" } },
  { minute: 67, phase: "H2", stats: { ...base, 8: 2, 1: 1, 1001: 1, 3: 1, 2: 1, 3002: 1, 4: 1 }, event: { kind: "yellow", team: "away", text: "Yellow card — England" } },
  { minute: 71, phase: "H2", stats: { ...base, 8: 3, 7: 1, 1: 1, 1001: 1, 3: 1, 2: 1, 3002: 1, 4: 1 }, event: { kind: "corner", team: "home", text: "Corners traded" } },
  { minute: 79, phase: "H2", stats: { ...base, 8: 3, 7: 1, 1: 1, 1001: 1, 3: 1, 2: 2, 3002: 2, 4: 1 }, event: { kind: "goal", team: "away", text: "GOAL! England lead 1–2" } },
  { minute: 84, phase: "H2", stats: { ...base, 8: 3, 7: 1, 1: 1, 1001: 1, 3: 1, 2: 2, 3002: 2, 4: 1, 5: 1 }, event: { kind: "red", team: "home", text: "RED CARD — Norway down to ten" } },
  { minute: 88, phase: "H2", stats: { ...base, 8: 4, 7: 2, 1: 1, 1001: 1, 3: 1, 2: 2, 3002: 2, 4: 1, 5: 1 }, event: { kind: "corner", text: "Late corners" } },
  { minute: 90, phase: "FT", stats: { ...base, 8: 4, 7: 2, 1: 1, 1001: 1, 3: 1, 2: 2, 3002: 2, 4: 1, 5: 1 }, event: { kind: "whistle", text: "Full-time — Norway 1–2 England" } },
];

export const MATCH_END_MINUTE = 90;

/** Cumulative stats at (or just before) a given match minute. */
export function statsAtMinute(minute: number): Stats {
  let snap = FRAMES[0].stats;
  for (const f of FRAMES) {
    if (f.minute <= minute) snap = f.stats;
    else break;
  }
  return snap;
}

/** Current phase at a given match minute. */
export function phaseAtMinute(minute: number): Phase {
  if (minute < 0) return "PRE";
  let phase: Phase = "PRE";
  for (const f of FRAMES) {
    if (f.minute <= minute) phase = f.phase;
    else break;
  }
  return phase;
}

/** Home/away goal tally at a minute, for the scoreline. */
export function scoreAtMinute(minute: number): { home: number; away: number } {
  const s = statsAtMinute(minute);
  return { home: s[1] ?? 0, away: s[2] ?? 0 };
}

/** Minute at which each period's stats are final (proof becomes available). */
export const PERIOD_END = { H1: 45, FULL: 90 } as const;

/** The frame in effect at a given minute (last frame whose minute <= given). */
export function currentFrame(minute: number): Frame {
  let f = FRAMES[0];
  for (const fr of FRAMES) {
    if (fr.minute <= minute) f = fr;
    else break;
  }
  return f;
}

/** Human match clock: "Pre-match", "23'", "HT", "FT". */
export function clockLabel(minute: number): string {
  const p = phaseAtMinute(minute);
  if (p === "PRE") return "Pre-match";
  if (p === "HT") return "HT";
  if (p === "FT") return "FT";
  const m = Math.max(1, Math.floor(minute));
  return `${m}'`;
}
