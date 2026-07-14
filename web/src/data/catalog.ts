// Market catalog — mirrors keeper/src/market-catalog.ts so the dashboard and the
// on-chain keeper generate the exact same market pack from a fixture. Only stats
// TxLINE Merkle-anchors on-chain are eligible (soccer keys 1-8 x period prefixes).

export const STAT = {
  P1_GOALS: 1,
  P2_GOALS: 2,
  P1_YELLOW: 3,
  P2_YELLOW: 4,
  P1_RED: 5,
  P2_RED: 6,
  P1_CORNERS: 7,
  P2_CORNERS: 8,
} as const;

/** Period prefix added to a base stat key (e.g. 1000 + 1 = P1 first-half goals). */
export const PERIOD = {
  FULL: 0,
  H1: 1000,
  HT: 2000,
  H2: 3000,
  ET1: 4000,
  ET2: 5000,
  PENALTIES: 6000,
  ET_TOTAL: 7000,
} as const;

export type Comparison = "greaterThan" | "lessThan" | "equalTo";

export interface MarketSpec {
  title: string; // <= 64 bytes (on-chain limit)
  statAKey: number;
  statBKey?: number;
  op?: "add" | "subtract";
  threshold: number;
  comparison: Comparison;
  period: number; // period prefix, doubles as goalproof's `period` field
  /** when betting closes relative to kickoff, in minutes */
  closeOffsetMin: number;
}

/** The standard pack generated for every World Cup fixture. */
export function fixturePack(home: string, away: string): MarketSpec[] {
  const h = home.slice(0, 12);
  const a = away.slice(0, 12);
  return [
    { title: `${h} vs ${a}: total goals > 2?`, statAKey: STAT.P1_GOALS, statBKey: STAT.P2_GOALS, op: "add", threshold: 2, comparison: "greaterThan", period: PERIOD.FULL, closeOffsetMin: 0 },
    { title: `${h} beats ${a}?`, statAKey: STAT.P1_GOALS, statBKey: STAT.P2_GOALS, op: "subtract", threshold: 0, comparison: "greaterThan", period: PERIOD.FULL, closeOffsetMin: 0 },
    { title: `${h} vs ${a}: any red card?`, statAKey: STAT.P1_RED, statBKey: STAT.P2_RED, op: "add", threshold: 0, comparison: "greaterThan", period: PERIOD.FULL, closeOffsetMin: 0 },
    { title: `${h} vs ${a}: corners > 9?`, statAKey: STAT.P1_CORNERS, statBKey: STAT.P2_CORNERS, op: "add", threshold: 9, comparison: "greaterThan", period: PERIOD.FULL, closeOffsetMin: 0 },
    { title: `${h} vs ${a}: yellows > 4?`, statAKey: STAT.P1_YELLOW, statBKey: STAT.P2_YELLOW, op: "add", threshold: 4, comparison: "greaterThan", period: PERIOD.FULL, closeOffsetMin: 0 },
    { title: `${h} vs ${a}: goal in 1st half?`, statAKey: STAT.P1_GOALS + PERIOD.H1, statBKey: STAT.P2_GOALS + PERIOD.H1, op: "add", threshold: 0, comparison: "greaterThan", period: PERIOD.H1, closeOffsetMin: 0 },
    { title: `${h} vs ${a}: goal in 2nd half?`, statAKey: STAT.P1_GOALS + PERIOD.H2, statBKey: STAT.P2_GOALS + PERIOD.H2, op: "add", threshold: 0, comparison: "greaterThan", period: PERIOD.H2, closeOffsetMin: 50 },
  ];
}

export const COMPARISON_SYMBOL: Record<Comparison, string> = {
  greaterThan: ">",
  lessThan: "<",
  equalTo: "=",
};

/** Evaluate a predicate over a resolved stat value (integer stats). */
export function predicateHolds(value: number, threshold: number, comparison: Comparison): boolean {
  switch (comparison) {
    case "greaterThan": return value > threshold;
    case "lessThan": return value < threshold;
    case "equalTo": return value === threshold;
  }
}
