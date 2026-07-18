// Settle a market against a TxLINE Merkle proof, then (optionally) claim.
//
//   npm run resolve -- --market <marketId> --seq <n> [--roots <pubkey>] [--claim]
//
// Flow: fetch the stat-validation proof from TxLINE for the market's fixture/stats,
// map it onto the program's resolve args, decide YES vs NO from the *proven* stat
// values (never asserted), and submit. The program CPIs into txoracle validate_stat,
// which fails the whole tx unless the proof + predicate verify on-chain.
//
// ── Step-3 verification points (can't be exercised until a finished fixture has a
//    published proof + a live TXLINE_API_TOKEN) — validate each against a real
//    payload before the demo:
//   1. --seq: which scores event carries the final stats for the fixture.
//   2. statKey encoding: whether TxLINE wants the period-prefixed key or base key.
//   3. ProofNode.hash / root binary format in JSON (base64 vs hex) — toBytes32.
//   4. stat_b reuses the response's single eventStatRoot (both stats share one event).
//   5. daily_scores_roots PDA derivation (txoracle IDL ships no seed metadata).
import { makeClient, vaultPda, positionPda, BN, PublicKey } from "./goalproof-client.js";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { readState, findMarket } from "./demo-state.js";
import { statValidation } from "./txline-api.js";
import { TXLINE_PROGRAM_ID } from "./env.js";

// ── TxLINE legacy ScoresStatValidation payload (docs/txline-openapi.yaml) ──
// TxLINE returns every Merkle hash/root as a 32-element byte array (not base64/hex).
interface RespScoreStat { key: number; value: number; period: number }
interface RespProofNode { hash: number[]; isRightSibling: boolean }
interface RespSummary {
  fixtureId: number;
  updateStats: { updateCount: number; minTimestamp: number; maxTimestamp: number };
  eventStatsSubTreeRoot: number[];
}
interface StatValidationResp {
  ts: number;
  statToProve: RespScoreStat;
  eventStatRoot: number[];
  summary: RespSummary;
  statProof: RespProofNode[];
  subTreeProof: RespProofNode[];
  mainTreeProof: RespProofNode[];
  statToProve2?: RespScoreStat;
  statProof2?: RespProofNode[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Merkle field → 32-byte number array for Anchor. TxLINE ships these as raw byte
 *  arrays; keep the base64/hex string path as a fallback for other encodings. */
function toBytes32(s: number[] | string): number[] {
  if (Array.isArray(s)) {
    if (s.length !== 32) throw new Error(`expected 32-byte hash array, got ${s.length}`);
    return s;
  }
  const buf = /^[0-9a-fA-F]{64}$/.test(s) ? Buffer.from(s, "hex") : Buffer.from(s, "base64");
  if (buf.length !== 32) throw new Error(`expected 32-byte hash, got ${buf.length} from "${s.slice(0, 12)}…"`);
  return [...buf];
}
const toNodes = (ns: RespProofNode[]) =>
  ns.map((n) => ({ hash: toBytes32(n.hash), isRightSibling: n.isRightSibling }));

/** Apply the market's op to two stat values (matches BinaryExpr add/subtract). */
function combine(a: number, b: number | undefined, op: string | null): number {
  if (op === "add") return a + (b ?? 0);
  if (op === "subtract") return a - (b ?? 0);
  return a; // one-stat market
}
/** Does `predicate` hold for observed integer value? */
function holds(value: number, threshold: number, comparison: string): boolean {
  if (comparison === "greaterThan") return value > threshold;
  if (comparison === "lessThan") return value < threshold;
  return value === threshold;
}
/** Complement predicate for settling NO — mirrors TraderPredicate::is_complement. */
function complement(threshold: number, comparison: string): { threshold: number; comparison: string } {
  if (comparison === "greaterThan") return { threshold: threshold + 1, comparison: "lessThan" };
  if (comparison === "lessThan") return { threshold: threshold - 1, comparison: "greaterThan" };
  return { threshold, comparison: "greaterThan" };
}
const cmpEnum = (c: string) => ({ [c]: {} });

async function findDailyScoresRoots(
  connection: import("@solana/web3.js").Connection,
  override: string | undefined,
  ts: number,
): Promise<PublicKey> {
  if (override) return new PublicKey(override);
  const txoracle = new PublicKey(TXLINE_PROGRAM_ID);
  // Proof ts is epoch milliseconds; insert_scores_root seeds the PDA with epoch_day
  // as a u16 LE. Verified on devnet: [b"daily_scores_roots", u16le(epochDay)].
  const day = Math.floor(ts / 1000 / 86400);
  const candidates: Buffer[][] = [
    [Buffer.from("daily_scores_roots"), new BN(day).toArrayLike(Buffer, "le", 2)],
    [Buffer.from("daily_scores_roots"), new BN(day).toArrayLike(Buffer, "le", 8)],
    [Buffer.from("daily_scores_roots"), new BN(day).toArrayLike(Buffer, "le", 4)],
    [Buffer.from("daily_scores_roots")],
  ];
  for (const seeds of candidates) {
    const [pda] = PublicKey.findProgramAddressSync(seeds, txoracle);
    const info = await connection.getAccountInfo(pda);
    if (info && info.owner.equals(txoracle)) return pda;
  }
  throw new Error(
    "could not locate daily_scores_roots PDA — pass --roots <pubkey> (see the account " +
      "used by a recent txoracle validate_stat/insert_scores_root tx on devnet)",
  );
}

// ── main ──
const marketId = arg("market");
const seq = Number(arg("seq") ?? NaN);
if (!marketId) throw new Error("--market <marketId> is required");
if (!Number.isFinite(seq)) throw new Error("--seq <n> is required (scores event sequence)");

const rec = findMarket(marketId);
if (!rec) throw new Error(`market ${marketId} not in demo-state`);

const { program, connection, wallet, programId } = makeClient();
const market = new PublicKey(rec.address);

console.log(`fetching proof for fixture ${rec.fixtureId} seq ${seq} (stats ${rec.statAKey}${rec.statBKey != null ? `,${rec.statBKey}` : ""})`);
const resp = (await statValidation(rec.fixtureId, seq, rec.statAKey, rec.statBKey ?? undefined)) as StatValidationResp;

// Decide the outcome from the *proven* values, then pick the predicate that backs it.
const observed = combine(resp.statToProve.value, resp.statToProve2?.value, rec.op);
const yes = holds(observed, rec.threshold, rec.comparison);
const predUsed = yes ? { threshold: rec.threshold, comparison: rec.comparison } : complement(rec.threshold, rec.comparison);
console.log(`observed ${observed} → settling ${yes ? "YES" : "NO"} (predicate ${predUsed.comparison} ${predUsed.threshold})`);

const eventStatRoot = toBytes32(resp.eventStatRoot);
const statA = {
  statToProve: { key: resp.statToProve.key, value: resp.statToProve.value, period: resp.statToProve.period },
  eventStatRoot,
  statProof: toNodes(resp.statProof),
};
const statB = rec.statBKey != null && resp.statToProve2
  ? {
      statToProve: { key: resp.statToProve2.key, value: resp.statToProve2.value, period: resp.statToProve2.period },
      eventStatRoot, // both stats live in the same scores event → same root (verify pt.4)
      statProof: toNodes(resp.statProof2 ?? []),
    }
  : null;

const fixtureSummary = {
  fixtureId: new BN(resp.summary.fixtureId),
  updateStats: {
    updateCount: resp.summary.updateStats.updateCount,
    minTimestamp: new BN(resp.summary.updateStats.minTimestamp),
    maxTimestamp: new BN(resp.summary.updateStats.maxTimestamp),
  },
  eventsSubTreeRoot: toBytes32(resp.summary.eventStatsSubTreeRoot),
};

const dailyScoresRoots = await findDailyScoresRoots(connection, arg("roots"), resp.ts);
console.log(`daily_scores_roots ${dailyScoresRoots.toBase58()}`);

const sig = await program.methods
  .resolve(
    yes,
    new BN(resp.ts),
    fixtureSummary,
    toNodes(resp.subTreeProof),
    toNodes(resp.mainTreeProof),
    { threshold: predUsed.threshold, comparison: cmpEnum(predUsed.comparison) },
    statA,
    statB,
  )
  .accountsPartial({
    market,
    dailyScoresRoots,
    txoracleProgram: new PublicKey(TXLINE_PROGRAM_ID),
  })
  // Merkle-proof verification in the txoracle CPI is compute-heavy — the default
  // 200k CU limit isn't enough, so raise it to the per-tx max.
  .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })])
  .rpc();
console.log(`✔ resolved ${yes ? "YES" : "NO"} — tx ${sig}`);

if (flag("claim")) {
  const state = readState();
  const ata = await getOrCreateAssociatedTokenAccount(connection, wallet, new PublicKey(state.mint!), wallet.publicKey);
  const position = positionPda(programId, market, wallet.publicKey, yes);
  const claimSig = await program.methods
    .claim()
    .accountsPartial({
      user: wallet.publicKey,
      market,
      position,
      vault: vaultPda(programId, market),
      userTokenAccount: ata.address,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  console.log(`✔ claimed winnings — tx ${claimSig}`);
}
