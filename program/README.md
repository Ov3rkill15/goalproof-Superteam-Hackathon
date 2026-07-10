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

## CPI verification result (2026-07-10) — ✅ CPI is viable

Fetched the on-chain IDL from devnet (`idl/txoracle.json`, via `keeper/src/fetch-idl.ts`):

- `validate_stat(ts, fixture_summary, fixture_proof, main_tree_proof, predicate, stat_a, stat_b?, op?)`
  takes **one read-only account** (`daily_scores_merkle_roots` PDA: seeds
  `["daily_scores_roots", epoch_day_le_u16]`) and **no signer** → callable via CPI from our program.
- Success ⇔ Merkle proofs verify against the on-chain daily root **and** the predicate holds.
  Failure modes: `PredicateFailed` (6021), `InvalidMainTreeProof` (6004), `InvalidStatProof` (6023),
  `RootNotAvailable` (6007), `TimestampMismatch` (6010). No return value — "no error" is the attestation.
- Predicate model: `TraderPredicate { threshold: i32, comparison: GreaterThan|LessThan|EqualTo }`
  over `stat_a` (optionally `stat_a ± stat_b` via `BinaryExpression`), each stat a
  `StatTerm { ScoreStat{key,value,period}, event_stat_root, stat_proof }`.
- Proof payload is heavy → resolver tx needs a raised compute budget (~1.4M CU per docs).

## Planned instructions

- `create_market` — market for a fixture + predicate (e.g. "home goals > 2", "corners A+B > 10"),
  binary YES/NO. Predicate stored on-chain = the *resolution contract*.
- `take_position` — user deposits USDC (devnet) into the market escrow PDA, choosing YES or NO.
- `resolve` — keeper submits the TxLINE proof; program CPIs into txoracle `validate_stat`
  with the market's stored predicate. CPI success ⇒ YES wins. To settle NO, keeper submits the
  proof with the **complement predicate** (e.g. `> t` fails ⇒ prove `< t+1` i.e. `LessThan t+1`),
  so both outcomes are proof-backed — never keeper-asserted.
- `claim` — winners withdraw pro-rata from escrow.

Fallback (only if CPI hits an unexpected wall on-chain): keeper verifies the proof via
`.view()` simulation and calls `resolve` with a keeper-signed outcome — weaker trust model,
kept out of scope unless needed.

Constraint from the track brief: the TxL token must NOT be used for P2P wagering —
escrow uses devnet USDC (or our own SPL mint).

## Reference: txoracle's own trading layer

The devnet program also exposes a P2P layer (`create_intent`, `execute_match`,
`settle_matched_trade`, `claim_via_resolution`) — useful as a reference implementation for
proof consumption, but our market program is independent (pooled binary markets, not P2P matching).
