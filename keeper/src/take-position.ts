// Deposit escrow tokens on YES or NO of an existing market. Run twice (one YES,
// one NO) to seed both pools for the demo.
//
//   npm run take-position -- --market <marketId> --side yes --amount 100
//
// The bettor is the keeper wallet (funded by setup-mint). Distinct bettors per
// side are a demo nicety; the program keys positions by (market, owner, side), so
// the same wallet can hold both sides without collision.
import { SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  makeClient,
  positionPda,
  vaultPda,
  BN,
  PublicKey,
} from "./goalproof-client.js";
import { readState, findMarket } from "./demo-state.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const marketId = arg("market");
const sideArg = (arg("side") ?? "yes").toLowerCase();
const amount = Number(arg("amount") ?? 100);
if (!marketId) throw new Error("--market <marketId> is required");
if (sideArg !== "yes" && sideArg !== "no") throw new Error("--side must be yes or no");
const side = sideArg === "yes";

const state = readState();
if (!state.mint || state.decimals == null) throw new Error("no mint — run `npm run setup-mint` first");
const rec = findMarket(marketId);
if (!rec) throw new Error(`market ${marketId} not in demo-state — run create-market first`);

const { program, connection, wallet, programId } = makeClient();
const mint = new PublicKey(state.mint);
const market = new PublicKey(rec.address);
const vault = vaultPda(programId, market);
const position = positionPda(programId, market, wallet.publicKey, side);

const ata = await getOrCreateAssociatedTokenAccount(connection, wallet, mint, wallet.publicKey);
const raw = new BN(amount).mul(new BN(10).pow(new BN(state.decimals)));

console.log(`betting ${amount} on ${side ? "YES" : "NO"} of "${rec.title}"`);
console.log(`  position PDA ${position.toBase58()}`);

const sig = await program.methods
  .takePosition(side, raw)
  .accountsPartial({
    user: wallet.publicKey,
    market,
    position,
    vault,
    userTokenAccount: ata.address,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log(`✔ position taken — tx ${sig}`);
