// Tiny JSON scratchpad that lets the on-chain scripts chain together during a
// demo run: setup-mint writes the escrow mint, create-market appends the markets
// it opens, and take-position / resolve read them back by market_id. Untracked
// (see keeper/.gitignore) — it's per-run local state, not source.
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./env.js";

const STATE_PATH = path.join(repoRoot, "keeper", "demo-state.json");

export interface MarketRecord {
  marketId: string; // decimal u64
  address: string; // market PDA (base58)
  title: string;
  fixtureId: number;
  period: number;
  statAKey: number;
  statBKey: number | null;
  op: "add" | "subtract" | null;
  threshold: number;
  comparison: string;
  createSig?: string;
}

export interface DemoState {
  mint?: string; // escrow SPL mint (base58)
  decimals?: number;
  markets: MarketRecord[];
}

export function readState(): DemoState {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as DemoState;
  } catch {
    return { markets: [] };
  }
}

export function writeState(s: DemoState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2) + "\n");
}

export function upsertMarket(rec: MarketRecord): void {
  const s = readState();
  const i = s.markets.findIndex((m) => m.marketId === rec.marketId);
  if (i >= 0) s.markets[i] = rec;
  else s.markets.push(rec);
  writeState(s);
}

export function findMarket(marketId: string): MarketRecord | undefined {
  return readState().markets.find((m) => m.marketId === marketId);
}
