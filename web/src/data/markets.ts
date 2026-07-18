import { type Comparison, type MarketSpec, COMPARISON_SYMBOL, fixturePack, predicateHolds } from "./catalog";
import { FIXTURE, PERIOD_END, statsAtMinute } from "./timeline";
import { PERIOD } from "./catalog";
import { ONCHAIN_SETTLEMENT, onChainProof, type OnChainProof } from "./onchain";

const PREMATCH = -Infinity;

export type Lifecycle = "upcoming" | "open" | "locked" | "resolved";

export interface Resolution {
  outcome: boolean;
  /** predicate the proof was validated against (YES = market predicate, NO = complement) */
  predicateUsed: { threshold: number; comparison: Comparison };
  txSignature: string;
  proofRootPreview: string;
  resolvedAtMinute: number;
  /** present only on the market that was really settled on devnet (not mock) */
  onChain?: OnChainProof;
}

export interface MarketState {
  id: string;
  index: number;
  spec: MarketSpec;
  periodLabel: string;
  statValue: number; // current op(statA, statB)
  lifecycle: Lifecycle;
  currentlyTrue: boolean; // provisional — predicate holds at the current minute
  yesPool: number;
  noPool: number;
  impliedYes: number; // 0..1
  openMinute: number;
  closeMinute: number;
  resolveMinute: number;
  resolution: Resolution | null;
}

const PERIOD_LABEL: Record<number, string> = {
  [PERIOD.FULL]: "Full match",
  [PERIOD.H1]: "First half",
  [PERIOD.H2]: "Second half",
};

// Seed liquidity per market (USDC devnet). Static — a mock adapter stands in for
// real pool balances until the keeper opens markets on-chain.
const SEED_POOLS: Array<[yes: number, no: number]> = [
  [1240, 860],
  [540, 980],
  [210, 1450],
  [720, 640],
  [300, 900],
  [880, 520],
  [610, 470],
];

function timing(period: number): { openMinute: number; resolveMinute: number } {
  if (period === PERIOD.H1) return { openMinute: PREMATCH, resolveMinute: PERIOD_END.H1 };
  if (period === PERIOD.H2) return { openMinute: PERIOD_END.H1, resolveMinute: PERIOD_END.FULL };
  return { openMinute: PREMATCH, resolveMinute: PERIOD_END.FULL };
}

function complement(threshold: number, comparison: Comparison): { threshold: number; comparison: Comparison } {
  switch (comparison) {
    case "greaterThan": return { threshold: threshold + 1, comparison: "lessThan" };
    case "lessThan": return { threshold: threshold - 1, comparison: "greaterThan" };
    case "equalTo": return { threshold, comparison: "greaterThan" };
  }
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Deterministic base58-looking string so mock signatures/hashes are stable across renders. */
function pseudo(seed: string, len: number): string {
  let h = 2166136261 >>> 0;
  let out = "";
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < seed.length; j++) h = (Math.imul(h ^ seed.charCodeAt(j), 16777619) + i * 131) >>> 0;
    out += B58[h % B58.length];
  }
  return out;
}

const SPECS = fixturePack(FIXTURE.home, FIXTURE.away);

function evalValue(spec: MarketSpec, stats: Record<number, number>): number {
  const a = stats[spec.statAKey] ?? 0;
  if (spec.statBKey === undefined) return a;
  const b = stats[spec.statBKey] ?? 0;
  return spec.op === "subtract" ? a - b : a + b;
}

/** Compute the full state of one market at a given match minute. */
export function marketAtMinute(spec: MarketSpec, index: number, minute: number): MarketState {
  const { openMinute, resolveMinute } = timing(spec.period);
  const closeMinute = spec.closeOffsetMin;

  const statValue = evalValue(spec, statsAtMinute(minute));
  const currentlyTrue = predicateHolds(statValue, spec.threshold, spec.comparison);

  let lifecycle: Lifecycle;
  if (minute < openMinute) lifecycle = "upcoming";
  else if (minute < closeMinute) lifecycle = "open";
  else if (minute < resolveMinute) lifecycle = "locked";
  else lifecycle = "resolved";

  let resolution: Resolution | null = null;
  if (lifecycle === "resolved") {
    const finalValue = evalValue(spec, statsAtMinute(resolveMinute));
    const outcome = predicateHolds(finalValue, spec.threshold, spec.comparison);
    const predicateUsed = outcome
      ? { threshold: spec.threshold, comparison: spec.comparison }
      : complement(spec.threshold, spec.comparison);
    resolution = {
      outcome,
      predicateUsed,
      txSignature: pseudo(`tx-${index}-${spec.title}`, 88),
      proofRootPreview: pseudo(`root-${index}`, 44),
      resolvedAtMinute: resolveMinute,
    };
    // Overlay the genuine devnet settlement onto its market so one card is real.
    if (index === ONCHAIN_SETTLEMENT.marketIndex) {
      resolution.outcome = ONCHAIN_SETTLEMENT.outcome;
      resolution.txSignature = ONCHAIN_SETTLEMENT.resolveTx;
      resolution.proofRootPreview = ONCHAIN_SETTLEMENT.proofRootPreview;
      resolution.onChain = onChainProof;
    }
  }

  const [yesPool, noPool] = SEED_POOLS[index] ?? [500, 500];
  return {
    id: `m${index}`,
    index,
    spec,
    periodLabel: PERIOD_LABEL[spec.period] ?? "Full match",
    statValue,
    lifecycle,
    currentlyTrue,
    yesPool,
    noPool,
    impliedYes: yesPool / (yesPool + noPool),
    openMinute,
    closeMinute,
    resolveMinute,
    resolution,
  };
}

/** All markets for the fixture at a given match minute. */
export function marketsAtMinute(minute: number): MarketState[] {
  return SPECS.map((spec, i) => marketAtMinute(spec, i, minute));
}

export function predicateLabel(threshold: number, comparison: Comparison): string {
  return `${COMPARISON_SYMBOL[comparison]} ${threshold}`;
}
