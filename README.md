# GoalProof — Trustless World Cup Prediction Markets on Solana

Prediction markets for all 104 World Cup matches, settled **on-chain and trustlessly** using
[TxLINE](https://txline.txodds.com)'s cryptographically anchored match data. No oracle to trust:
when a match ends, a keeper bot fetches the Merkle proof from TxLINE and the settlement program
verifies it against the daily root stored on-chain by TxLINE's program — then pays out winners
automatically.

Built for the **Superteam World Cup Hackathon — Prediction Market & Settlement track**.

## Architecture

```
TxLINE SSE feeds (scores + odds, devnet)
        │
        ▼
┌──────────────────┐    records JSONL       ┌──────────────────┐
│  ingestion/ (Go) │ ─────────────────────▶ │ recordings/      │──▶ replay mode (demo)
└──────────────────┘                        └──────────────────┘
        │ live events
        ▼
┌──────────────────┐   match ended → fetch proof → resolve
│  keeper/ (TS)    │ ─────────────────────────────────────┐
└──────────────────┘                                      ▼
┌──────────────────┐                        ┌──────────────────────┐
│  web/ dashboard  │ ◀── markets, results ──│ program/ (Anchor)    │
└──────────────────┘                        │ escrow USDC devnet   │
                                            │ validateStat proof   │
                                            └──────────────────────┘
```

- **`ingestion/`** — Go service. Consumes TxLINE SSE streams (`/api/scores/stream`, `/api/odds/stream`),
  prints and records every event as JSONL. Replay mode re-emits a recording at any speed so the full
  product works after the tournament ends (and for the demo video).
- **`program/`** — Anchor (Rust) program on Solana devnet: create market, take positions (USDC devnet
  escrow), resolve via TxLINE's `validateStat` Merkle-proof verification, automatic payout.
- **`keeper/`** — TypeScript bot: watches the feed for finished matches, fetches the stat-validation
  proof from TxLINE, triggers on-chain resolution. No human input after deploy.
- **`web/`** — Dashboard: open markets, live scores/odds, positions, settled results with a link to
  the on-chain proof transaction.

## Status

- [x] TxLINE devnet access verified (guest JWT flow works)
- [x] Ingestion: SSE consumer + JSONL recorder + replay mode
- [ ] On-chain subscribe + API token activation (free World Cup tier)
- [ ] Anchor program: market/escrow/resolve/payout
- [ ] Keeper bot
- [ ] Dashboard
- [ ] Deploy + demo video

## Quickstart (ingestion)

```bash
cd ingestion
cp ../.env.example ../.env   # fill in TXLINE_API_TOKEN after activation
go run . --mode live --stream scores --record recordings/scores.jsonl
go run . --mode replay --file recordings/scores.jsonl --speed 10
```

## TxLINE endpoints used

| Endpoint | Purpose |
|---|---|
| `POST /auth/guest/start` | guest session JWT (origin level, **not** under `/api`) |
| `POST /api/token/activate` | activate API token after on-chain subscribe |
| `GET /api/scores/stream`, `GET /api/odds/stream` | SSE live feeds |
| `GET /api/scores/snapshot/{fixtureId}`, `GET /api/odds/snapshot/{fixtureId}` | snapshots |
| `GET /api/scores/stat-validation` | Merkle proofs for on-chain settlement |

Full OpenAPI spec: [`docs/txline-openapi.yaml`](docs/txline-openapi.yaml).
TxLINE devnet program: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`.

## License

MIT
