# program/ — GoalProof settlement program (Anchor, Solana devnet)

Not initialized yet. To be scaffolded with `anchor init` inside WSL (Ubuntu 22.04) —
Anchor tooling is not practical on native Windows.

## Toolchain setup (WSL, one-time)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"   # solana CLI (agave)
cargo install --git https://github.com/coral-xyz/anchor avm --force && avm install latest
solana config set --url devnet
```

## Planned instructions

- `create_market` — market for a fixture + predicate (e.g. "home goals > 2", "corners A+B > 10")
- `take_position` — user deposits USDC (devnet) into the market escrow PDA
- `resolve` — verify TxLINE Merkle proof (CPI into `validateStat` of TxLINE program
  `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`), store outcome
- `claim` — winners withdraw pro-rata from escrow

## Day-1 verification (blocking)

The TxLINE docs only show `validateStat` called via `.view()` (read-only simulation).
**Verify CPI support** against the devnet IDL (https://txline.txodds.com/documentation/programs/devnet)
before committing to the CPI design; fallback = keeper verifies the proof client-side and
calls `resolve` with a keeper-signed outcome (still on-chain settlement, different trust model).

Constraint from the track brief: the TxL token must NOT be used for P2P wagering —
escrow uses devnet USDC (or our own SPL mint).
