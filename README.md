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
- [x] CPI feasibility confirmed: `validate_stat` = 1 read-only PDA, no signer (`program/idl/txoracle.json`)
- [x] Anchor program source: create_market / take_position / resolve (CPI) / claim
- [x] On-chain subscribe + API token activation (`keeper: npm run activate`)
- [x] Program deployed to devnet: [`8RnQwJk6FN5rioUaGqEruyXENxQZNBdgJQUHCgpr4MNP`](https://explorer.solana.com/address/8RnQwJk6FN5rioUaGqEruyXENxQZNBdgJQUHCgpr4MNP?cluster=devnet)
- [x] Keeper bot: create-market / take-position / resolve (CPI) / claim scripts run against devnet
- [x] **Full settlement proven end-to-end on devnet** — market resolved by CPI into
  `validate_stat`, winner paid out automatically (see below)
- [x] Dashboard wired to the real settled market (links to live devnet txs)
- [ ] Deploy dashboard + demo video

## Live settlement proof (devnet)

A real market was opened, bet on both sides, resolved trustlessly (the program CPIs
into txoracle `validate_stat`, which verifies a TxLINE Merkle proof on-chain — the tx
only lands if the proof + predicate verify), and the winner claimed their payout.
Market: "total goals > 2?" on fixture `18213979`, proven `home 1 + away 2 = 3 > 2` → **YES**.

| Step | Tx (Solana Explorer, devnet) |
|---|---|
| Create market | [`7quy5nVP…9L5nBf`](https://explorer.solana.com/tx/7quy5nVPnaHHGRJeisU9LhBqcS5U26QFFKLYxtV8cL4MeSd48mYawMNHWMbijGx6Dk1vEAB1xRSasBRcV9L5nBf?cluster=devnet) |
| Position YES | [`4S2G4NsL…MY8akgp`](https://explorer.solana.com/tx/4S2G4NsLFFEi3ysdHhFD3Aknwy6MonsNRQKHLBBECjJAPZB6B51ut7pBmNJk59UpqaeyT7w9E8VmuuaAqMY8akgp?cluster=devnet) |
| Position NO | [`7EAY3vQk…v42LPwvr5`](https://explorer.solana.com/tx/7EAY3vQkWepT1Pdd1vTpAH21WLz4uY5zWdarZqnLjkzYWZXxHYJ1RQZb8wQti7jFaDSMgp7Cdpu381v42LPwvr5?cluster=devnet) |
| **Resolve (CPI `validate_stat`)** | [`UqgCj5Gx…bQNMMy`](https://explorer.solana.com/tx/UqgCj5GxGTAmCxTJ89yD7pfhs7axp8NBdn5L2CcKHqtkCYAkBGgS8SySoSTUS8ZxHDyqfxu2LmLuTASLhbQNMMy?cluster=devnet) |
| **Claim payout** | [`5RajCEi3…83mzrR9X`](https://explorer.solana.com/tx/5RajCEi3LAzdA6NC5zYWUaCpaKNLhyibxSdidw6LRyFc1QhydiFSwTCWPv5yTJWoTzQUMY8hqiBkUimq83mzrR9X?cluster=devnet) |

Market account: [`EzFT9cpf…hTUSDB`](https://explorer.solana.com/address/EzFT9cpfKBpaL43TTJQb1u3k7hC1oNdtMaG2ydhTUSDB?cluster=devnet) ·
TxLINE daily scores root read during resolve: [`EdJuEftT…PwGffB`](https://explorer.solana.com/address/EdJuEftTBNwXRWJpvYCziVxKT87qMDVu9V6HC7PwGffB?cluster=devnet)

Reproduce: `cd keeper && npm run setup-mint && npm run create-market -- --fixture 18213979 --pick 0 && npm run take-position -- --market <id> --side yes --amount 100 && npm run take-position -- --market <id> --side no --amount 60 && npm run resolve -- --market <id> --seq 1184 --claim`

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
