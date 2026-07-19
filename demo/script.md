# Demo Script — Superteam World Cup (Prediction Market & Settlement)

> GoalProof — trustless World Cup prediction markets on Solana, settled on-chain
> against TxLINE Merkle proofs. Target length: **≤ 5 minutes** (hard screening limit).
> Finalize/record on Jul 18–19 (deadline 19 Jul 23:59 UTC). Same structure as the
> AMD ACT II demo: checklist → timed flow → points to emphasise → licensing notes.

## Pre-recording checklist
- [ ] `.env` has a valid `TXLINE_API_TOKEN` (guest JWT auto-refreshes) — needed only if re-running resolve live
- [x] Dashboard deployed and reachable: **https://goalproof-chi.vercel.app** (Vercel prod, 2026-07-19); local fallback `cd web && npm run build && npm run preview`
- [ ] Keeper wallet `2UWQW…RyDV` still funded (≥ 0.1 devnet SOL) in case you re-run the flow on camera
- [ ] Open browser tabs pre-loaded: (1) dashboard, (2) the **resolve tx** on Solana Explorer (devnet), (3) the **claim tx**, (4) the goalproof program account
- [ ] `keeper/demo-state.json` present (from the real run) so the on-chain card shows real links
- [ ] Terminal font large; clean prompt; `ingestion/recordings/wc-scores-20260712.jsonl` on hand for the replay clip
- [ ] Screen recorder at 1080p+, dashboard at ~1280px wide (matches the polished layout)

## Demo flow (recording order — ~4:40 total)
1. **Hook + problem (0:25).** "Prediction markets need an oracle you have to trust.
   GoalProof removes it: when a match ends, the settlement program verifies TxLINE's
   cryptographic Merkle proof *on-chain* — no human, no trusted keeper signature."
2. **Dashboard tour (0:40).** Show the deployed site: the Norway 1–2 England fixture,
   the market rail (total goals, match winner, red card, corners, first-half goal).
   Point out live scores/odds and the implied-probability bars. Mention it's a replay
   of a **real recorded TxLINE feed** (fixture 18213979) so it works after the match ends.
3. **Replay the match (0:45).** Hit play at 4×/8×. The **Match Theater** (CSS-3D pitch)
   comes alive: goals burst at the correct end, cards & corners land on the pitch, market
   chips float over the far touchline and flip to citron ✓ when settled, and a citron beam
   sweeps the pitch at HT/FT — the proofs-verified moment. Watch markets go OPEN →
   LIVE(locked) → SETTLED as events land. Call out the honesty caption: positions are
   illustrative (TxLINE has no player tracking); events/minutes/stats are the real feed.
4. **THE MONEY SHOT — on-chain settlement (1:10).** On the settled "total goals > 2"
   card, show the **✓ VERIFIED ON-CHAIN** badge and click **resolve ↗**. On Solana
   Explorer (devnet) show the tx: `goalproof` invokes → CPI into `txoracle validate_stat`
   → "Find valid on-chain root", fixture + two-stat predicate validation → success. Then
   click **claim ↗**: the winner is paid stake + pro-rata share of the losing pool.
   "The resolve tx only lands if the Merkle proof and the predicate verify — that's the
   trustlessness, right there in the logs."
5. **Architecture in brief (0:50).** One diagram (README):
   - `ingestion/` (Go) consumes TxLINE SSE (`/scores/stream`, `/odds/stream`), records JSONL → replay
   - `program/` (Anchor) create_market / take_position / **resolve = CPI validate_stat** / claim
   - `keeper/` (TS) watches the feed, fetches the stat-validation proof, submits resolve
   - `web/` dashboard reads market state; settled cards link to the real devnet txs
   Note the three engineering findings that made the CPI work: TxLINE hashes are 32-byte
   arrays; the scores-roots PDA is `[b"daily_scores_roots", u16(epochDay)]`; Merkle
   verification needs a raised compute budget (1.4M CU).
6. **TxLINE endpoints + honesty (0:25).** List endpoints used (auth guest JWT, token
   activate, SSE streams, `scores/stat-validation`). Escrow uses our own devnet SPL
   (brief bans wagering the TxL token). Everything on one network (devnet).
7. **Wrap (0:15).** Public repo, deployed dashboard, working devnet program. "Provable
   markets, settled trustlessly — code is clean, deterministic, and every settlement is
   independently verifiable on Explorer."

## Points to emphasise to the judges
- **Core functionality:** real TxLINE feed ingested (recorded for replay) + a full
  market lifecycle that settles **on-chain**, not off-chain.
- **Trustless settlement (the differentiator):** resolution is a CPI into
  `validate_stat`; the transaction fails unless the proof + predicate verify. Show the
  real `resolve` and `claim` signatures — this is proof, not a claim.
- **Code quality:** deterministic resolution (outcome derived from the *proven* value,
  never asserted), NO settled via an exact predicate complement, documented verification
  points, clean module boundaries.
- **UX & use case:** micro-markets that make you watch every corner; replay mode so the
  demo (and the product) works after the tournament.
- **API feedback captured from day one:** `docs/txline-feedback-log.md`.

## Assets / licensing notes
- All dashboard imagery is **self-authored inline SVG** (national flags, stadium scene) —
  no third-party photos, no external asset hosts. Renders identically online/offline.
- Replay data is a **real recording** of the TxLINE devnet SSE feed (`ingestion/recordings/`).
- Escrow token is a devnet SPL mint we create (`npm run setup-mint`), not TxL.
- Repo is MIT; no secrets committed (`.env`, `*wallet*.json`, `demo-state.json` gitignored).

## Real settlement signatures (paste into video description)
- Program: `8RnQwJk6FN5rioUaGqEruyXENxQZNBdgJQUHCgpr4MNP` (devnet)
- Market: `EzFT9cpfKBpaL43TTJQb1u3k7hC1oNdtMaG2ydhTUSDB`
- Resolve (CPI validate_stat): `UqgCj5GxGTAmCxTJ89yD7pfhs7axp8NBdn5L2CcKHqtkCYAkBGgS8SySoSTUS8ZxHDyqfxu2LmLuTASLhbQNMMy`
- Claim payout: `5RajCEi3LAzdA6NC5zYWUaCpaKNLhyibxSdidw6LRyFc1QhydiFSwTCWPv5yTJWoTzQUMY8hqiBkUimq83mzrR9X`
