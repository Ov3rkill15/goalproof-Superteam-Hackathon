// Data-source boundary.
//
// Today the dashboard is driven by the simulated replay feed (./timeline) and a
// mock pool/resolution model (./markets) — enough for the demo, since the fixture
// finishes before judging. `config.DATA_SOURCE` selects the source.
//
// To go fully on-chain (once the keeper opens markets on devnet), implement
// `readMarkets` / `readPosition` against the deployed goalproof program with
// @coral-xyz/anchor (reuse keeper/src/txline-api.ts + the program IDL). The
// MarketState shape in ./markets is the contract both sides already satisfy:
//
//   Market account  -> MarketState (title, predicate, pools, resolved/outcome)
//   Position account -> { owner, side, amount, claimed }
//   MarketResolved event.ts / resolve tx signature -> Resolution
//
// The UI reads MarketState only, so swapping the source touches no components.

import type { MarketState } from "./markets";
import { marketsAtMinute } from "./markets";
import { DATA_SOURCE } from "../config";

export interface MarketSource {
  /** Markets for the fixture. `minute` only matters for the replay source. */
  markets(minute: number): MarketState[];
}

const replaySource: MarketSource = {
  markets: (minute) => marketsAtMinute(minute),
};

// const chainSource: MarketSource = { markets: () => readMarketsFromDevnet() }; // TODO

export const source: MarketSource = DATA_SOURCE === "chain" ? replaySource /* chainSource */ : replaySource;
