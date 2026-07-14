# web/ — GoalProof dashboard

Live prediction-market dashboard for a World Cup fixture. Shows a pack of provable
micro-markets that open, lock, and **settle against TxLINE Merkle proofs** as the match
plays out, each resolved market linking to its on-chain resolution transaction.

Stack: **Vite + React + TypeScript + Tailwind v4** (static SPA — deploys to any static host).

## Run

```bash
cd web
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build
```

## What it shows

- **Match header** — live scoreline, match clock, phase (pre-match / H1 / HT / H2 / FT),
  and the current feed event, plus a link to the deployed `goalproof` program on devnet.
- **Market cards** — one per provable stat from the fixture pack (total goals, winner, any
  red card, corners, yellows, first-/second-half goals). Each card shows its predicate, the
  live stat value, YES/NO pools with implied probability, and a lifecycle badge
  (OPEN → LIVE → SETTLED). Cards appear as their period becomes relevant (the second-half
  market pops in at half-time).
- **Settled markets** — the winning side, the exact predicate the proof validated against
  (the market predicate for YES, its **complement** for NO — mirroring the on-chain
  `TraderPredicate::is_complement` check), and a link to the resolve transaction.
- **Replay bar** — play / pause / scrub / speed over a simulated feed. World Cup fixtures
  finish before judging, so the brief expects a replay/simulated feed; this is it.

## Data sources

Selected by `DATA_SOURCE` in `src/config.ts`:

- **`mock`** (current) — a simulated match feed (`src/data/timeline.ts`, fixture 18213979
  Norway vs England) plus a mock pool/resolution model (`src/data/markets.ts`). Stat keys use
  the identical TxLINE composite format (`1001` = P1 first-half goals), and the market pack is
  the same one the keeper generates (`keeper/src/market-catalog.ts`), so the evaluation code is
  shared, not demo-only.
- **`chain`** — read `Market` / `Position` accounts from the deployed program. Wiring point is
  documented in `src/data/adapter.ts`; the UI reads the `MarketState` shape only, so swapping
  the source touches no components.

The Go ingestion layer (`../ingestion`) records the **real** TxLINE SSE stream to
`ingestion/recordings/*.jsonl` — those files are the proof of live ingestion.

## Deploy

Static build (`dist/`) deploys to Vercel / Netlify / GitHub Pages as-is (no server).
