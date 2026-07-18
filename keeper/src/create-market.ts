// Open one on-chain goalproof market from the fixture catalog.
//
//   npm run create-market -- --fixture 12345 --home "Brazil" --away "Croatia" \
//                             [--pick 0] [--close-in-min 60]
//
// --pick indexes into fixturePack() (0 = "total goals > 2?"). market_id is a
// timestamp so reruns don't collide. The predicate stored on-chain is the market's
// immutable resolution contract; resolve.ts later proves it against TxLINE.
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  makeClient,
  marketPda,
  vaultPda,
  BN,
  PublicKey,
} from "./goalproof-client.js";
import { fixturePack, type Comparison } from "./market-catalog.js";
import { readState, upsertMarket } from "./demo-state.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const fixtureId = Number(arg("fixture") ?? NaN);
const home = arg("home") ?? "Home";
const away = arg("away") ?? "Away";
const pick = Number(arg("pick") ?? 0);
const closeInMin = Number(arg("close-in-min") ?? 60);
if (!Number.isFinite(fixtureId)) throw new Error("--fixture <id> is required");

const state = readState();
if (!state.mint) throw new Error("no escrow mint — run `npm run setup-mint` first");

const spec = fixturePack(home, away)[pick];
if (!spec) throw new Error(`--pick ${pick} out of range (fixturePack has ${fixturePack(home, away).length})`);

// Anchor enum encodings for the program's Comparison / BinaryExpr.
const comparison = { [spec.comparison]: {} } as Record<Comparison, Record<string, never>>;
const op = spec.op ? { [spec.op]: {} } : null;

const { program, wallet, programId } = makeClient();
const mint = new PublicKey(state.mint);
const marketId = BigInt(Date.now());
const market = marketPda(programId, wallet.publicKey, marketId);
const vault = vaultPda(programId, market);
const closeTs = Math.floor(Date.now() / 1000) + closeInMin * 60;

console.log(`opening market "${spec.title}"`);
console.log(`  market_id ${marketId}  fixture ${fixtureId}  closes in ${closeInMin}m`);
console.log(`  market PDA ${market.toBase58()}`);

const sig = await program.methods
  .createMarket(
    new BN(marketId.toString()),
    new BN(fixtureId),
    spec.period,
    spec.statAKey,
    spec.statBKey ?? null,
    op,
    { threshold: spec.threshold, comparison },
    new BN(closeTs),
    spec.title,
  )
  .accountsPartial({
    creator: wallet.publicKey,
    market,
    mint,
    vault,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log(`✔ created — tx ${sig}`);

upsertMarket({
  marketId: marketId.toString(),
  address: market.toBase58(),
  title: spec.title,
  fixtureId,
  period: spec.period,
  statAKey: spec.statAKey,
  statBKey: spec.statBKey ?? null,
  op: spec.op ?? null,
  threshold: spec.threshold,
  comparison: spec.comparison,
  createSig: sig,
});
console.log("recorded in demo-state.json");
