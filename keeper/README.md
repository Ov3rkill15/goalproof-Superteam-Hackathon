# keeper/ — autonomous resolution bot (TypeScript)

Not implemented yet — depends on the Anchor program IDL.

Responsibilities:
1. Watch the scores feed (via ingestion service or directly) for finished fixtures.
2. Fetch the Merkle proof: `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=`.
3. Build and send the `resolve` transaction (compute budget ~1.4M units for proof verification).
4. Log every action — this log is demo material for the "autonomous operation" criterion.

Runs fully unattended after deploy. Wallet keypair path comes from `KEEPER_WALLET_PATH` in `.env`
(never committed).
