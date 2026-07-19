# Superteam World Cup — Submission Form (copy-paste)

> Track: **Prediction Market & Settlement** · Deadline 19 Jul 2026 23:59 UTC

## Link to Your Submission
https://goalproof-chi.vercel.app

## Tweet Link
*(kosongkan — tidak pakai X)*

## Project Title
GoalProof — Trustless World Cup Prediction Markets on Solana

## Briefly explain your Project
GoalProof runs auto-generated micro-markets on live World Cup stats (total goals, winner, cards, corners, per-half goals) and settles them **on-chain with zero human input**. A Go service ingests TxLINE's SSE score/odds feeds (and records them for deterministic replay), a TypeScript keeper detects period ends and fetches Merkle proofs from TxLINE's stat-validation endpoint, and our Anchor program resolves each market by **CPI into TxLINE's on-chain `validate_stat`** — the settlement transaction re-hashes the proof against the daily Merkle root stored on Solana and only pays out if the math holds. If the proof doesn't verify, the transaction fails and nothing moves. Every settlement is independently verifiable on Solana Explorer: no admin key, no trusted oracle, no human in the loop. Escrow uses our own devnet SPL token (per the no-TxL-wagering rule), with winners paid stake + pro-rata share of the losing pool.

## Link to your live & working MVP
https://goalproof-chi.vercel.app

## Link to Your Live Demo Video
*(isi setelah upload YouTube — file: `demo/GoalProof-demo.mp4`, 3m13s)*

## Project's Public Repository Link
https://github.com/Ov3rkill15/goalproof-Superteam-Hackathon

## Link to your Project's Technical Documentation
https://github.com/Ov3rkill15/goalproof-Superteam-Hackathon/blob/master/README.md

## Link to your Project's X Profile
*(kosongkan)*

## Share your team's experience using the TxLINE API

**What we liked most.** Guest auth is genuinely zero-friction — one empty POST and you're streaming. The `llms.txt` docs index plus the OpenAPI YAML made machine-assisted onboarding very fast. And `validateStat` is the star: it supports predicates (threshold + operator) and two-stat operations, and — critically — the on-chain instruction takes a single read-only PDA and **no signer**, so any third-party program can CPI into it. That single design decision is what makes fully trustless third-party settlement possible, and we built our whole settlement layer on it.

**Where we hit friction** (full dated log: `docs/txline-feedback-log.md` in the repo):
1. `POST /auth/guest/start` lives at the origin root while everything else is under `/api`; calling `/api/auth/guest/start` returns a bare 401 that reads like an auth failure, not a wrong path.
2. The devnet IDL has no PDA seed metadata and the docs don't list the fixed accounts `subscribe` needs (pricing matrix, treasury vault) — we had to scan devnet transactions for a successful `subscribe` and copy its account list.
3. `subscribe` fails with `AccountNotInitialized` unless the user's TxL ATA (Token-2022) already exists, even on the free tier; we work around it with a `CreateIdempotent` ATA instruction in the same transaction.
4. Devnet SOL is the real onboarding bottleneck — the public faucet rate-limits hard and `subscribe` can't be sent without it.
5. Proof wire format: every Merkle hash/root is a JSON array of 32 numbers (not hex/base64), which cost us a decode-guessing round-trip.
6. The proof payload uses period `100` for full-match while the scores feed uses `0` — undocumented, discovered empirically at resolve time.

None of these were blockers — all are logged with dates, workarounds, and file references in the repo.

## Anything Else?

- **Proof it's real, not a mockup** — settlement transactions on devnet:
  - Resolve (CPI into `validate_stat`, 207k CU): https://explorer.solana.com/tx/UqgCj5GxGTAmCxTJ89yD7pfhs7axp8NBdn5L2CcKHqtkCYAkBGgS8SySoSTUS8ZxHDyqfxu2LmLuTASLhbQNMMy?cluster=devnet
  - Claim (winner payout): https://explorer.solana.com/tx/5RajCEi3LAzdA6NC5zYWUaCpaKNLhyibxSdidw6LRyFc1QhydiFSwTCWPv5yTJWoTzQUMY8hqiBkUimq83mzrR9X?cluster=devnet
  - Program: https://explorer.solana.com/address/8RnQwJk6FN5rioUaGqEruyXENxQZNBdgJQUHCgpr4MNP?cluster=devnet
- **Replay mode**: matches end before judging, so the dashboard replays a real recorded TxLINE feed (fixture 18213979, Norway–England) deterministically — the demo works forever. Recording/replay is part of the Go ingestion service.
- 10-slide deck (PDF): `docs/presentation/GoalProof-presentation.pdf` in the repo.
- TxLINE endpoints used: `POST /auth/guest/start`, SSE `/api/odds/stream` + `/api/scores/stream`, `/api/scores/stat-validation`, on-chain `subscribe` + `validate_stat` (devnet program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`).
- Solo build, MIT licensed.

---

# YouTube — judul & description

**Title:**
GoalProof — Trustless World Cup Prediction Markets on Solana (Superteam World Cup Hackathon Demo)

**Description:**
GoalProof runs micro prediction markets on live World Cup stats and settles them on-chain with no admin, no trusted oracle, and no human in the loop. When a period ends, a Solana program re-verifies a TxLINE Merkle proof via CPI — and pays out only if the math holds.

Built for the Superteam World Cup Hackathon (Prediction Market & Settlement track), powered by the TxLINE API by TxODDS.

⏱️ Chapters
0:00 The problem — someone you trust types in the result
0:24 Live board — 7 auto-generated provable markets (replay of a real TxLINE feed)
0:54 Match Theater — the feed comes alive; proofs land at HT & FT
1:28 On-chain settlement — resolve (CPI validate_stat) & claim, live on Solana Explorer
2:12 Architecture & three findings that made the CPI work
2:51 Endpoints, rules compliance & close

🔗 Links
Live demo: https://goalproof-chi.vercel.app
Code (MIT): https://github.com/Ov3rkill15/goalproof-Superteam-Hackathon
Resolve tx (the trustless moment): https://explorer.solana.com/tx/UqgCj5GxGTAmCxTJ89yD7pfhs7axp8NBdn5L2CcKHqtkCYAkBGgS8SySoSTUS8ZxHDyqfxu2LmLuTASLhbQNMMy?cluster=devnet

Everything on Solana devnet. Escrow uses our own SPL token per hackathon rules (no TxL wagering). Marker positions in the Match Theater are illustrative — TxLINE has no player tracking — but every event, minute and stat is real feed data.

#Solana #PredictionMarkets #WorldCup #Hackathon #Web3
