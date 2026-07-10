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

## Open questions for TxODDS (Discord)

- Is `validateStat` designed to be called via CPI from a third-party program, or only via
  `.view()` simulation? The track brief mentions CPI explicitly; the docs only show `.view()`.
