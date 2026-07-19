# TxLINE API feedback log

Friction and highlights recorded during development — the submission form has a mandatory
"feedback on the TxLINE API" field, so this file is written as we go, not reconstructed later.

## Friction

- **2026-07-10** — `POST /auth/guest/start` lives at the origin root while everything else is
  under `/api`. Calling `/api/auth/guest/start` returns a bare 401 with no body, which reads
  like an auth failure rather than a wrong path. A 404 or an error message would save time.
  (The quickstart does distinguish `${apiOrigin}` vs `${apiBaseUrl}`, but it's easy to miss.)

## Highlights

- **2026-07-10** — Guest session flow is genuinely zero-friction: one empty POST, no signup,
  and the token came back instantly on devnet.
- **2026-07-10** — `https://txline-docs.txodds.com/llms.txt` (full docs index) plus the OpenAPI
  YAML at `/docs/docs.yaml` made machine-assisted onboarding fast.
- **2026-07-10** — `validateStat` supporting predicates (threshold + comparison) and two-stat
  operations enables prop-bet style markets without any custom oracle logic.

## Resolved questions

- **2026-07-10** — *Is `validateStat` callable via CPI from a third-party program?* **Yes.**
  Fetched the on-chain IDL (`program/idl/txoracle.json`): `validate_stat` takes a single
  read-only account (`daily_scores_merkle_roots`, a public PDA) and **no signer**, so any
  program can CPI into it. Semantics: the instruction succeeds iff the Merkle proofs verify
  against the on-chain daily root **and** the predicate holds; otherwise it errors
  (`PredicateFailed` 6021, `InvalidMainTreeProof` 6004, `InvalidStatProof` 6023, …).
  There is no declared return value — "no error" is the attestation.

## More friction

- **2026-07-10** — The published devnet IDL has no PDA seed metadata and the docs don't list
  the fixed accounts `subscribe` needs (`pricing_matrix`, treasury vault/PDA). We had to scan
  recent devnet transactions for a successful `subscribe` and copy its account list
  (`keeper/src/discover-accounts.ts`). Publishing these addresses on the Program Reference
  page (like the TxL mint) would remove that step.
- **2026-07-10** — Devnet SOL is the real onboarding bottleneck: the public faucet rate-limits
  aggressively, and the free-tier `subscribe` cannot be sent without it. A devnet
  `request_devnet_faucet`-style instruction exists for USDT — a small SOL top-up equivalent
  (or a relayer that co-pays the subscribe fee) would make the free tier truly zero-friction.

- **2026-07-10** — `subscribe` fails with `AccountNotInitialized` (3012) on `user_token_account`
  unless the user's TxL ATA (Token-2022) already exists, even on the free tier where 0 TxL is
  charged. The instruction takes the Associated Token Program as an account, so init-if-needed
  seems intended but isn't wired. Workaround: prepend a `CreateIdempotent` ATA instruction in
  the same transaction (`keeper/src/activate-txline.ts`).

## Friction found while proving settlement end-to-end (2026-07-18)

- **Merkle hashes are 32-element byte arrays, not base64/hex.** Every hash/root in the
  `/api/scores/stat-validation` response is a JSON array of 32 numbers. Most SDKs expect
  base64 or hex for binary blobs; documenting the wire format (or offering hex) would
  prevent a decode-guessing round-trip. (Fixed in `keeper/src/resolve.ts` `toBytes32`.)
- **Full-match period is `100`, not `0`.** The proof payload reports period `100` for
  full-time stats, while the scores-feed composite keys use `0` as the "no prefix" period.
  Any program that stores the period at market-creation time and compares it at resolve
  (like ours) hits a mismatch until this is discovered empirically. One line in the docs
  ("proof-side period codes: 100 = full match, …") would save an afternoon.
- **`daily_scores_roots` PDA seed is `[b"daily_scores_roots", u16 LE epochDay]`** with
  `epochDay = floor(unixSeconds / 86400)`. Not documented; recovered by brute-forcing seed
  encodings against the owner check. Belongs on the Program Reference page.
- **CPI compute budget:** verifying the Merkle proof via CPI `validate_stat` exceeds the
  default 200k CU (we run with a 1.4M CU limit ix). Worth a note in the integration docs so
  teams don't misread "exceeded CUs meter" as a proof failure.
- **Choosing the right proof event:** the stat-validation endpoint is seq-scoped; the final
  stats live on the max-seq scores event for the fixture. A convenience alias (e.g.
  `?seq=latest`) would remove the client-side scan.

## Highlights (cont.)

- **2026-07-10** — The txoracle program ships a full P2P trading layer on devnet
  (`create_intent`, `execute_match`, `settle_matched_trade`, `claim_via_resolution`) —
  useful as a reference for how TxODDS themselves consume `validate_stat`-style proofs.
