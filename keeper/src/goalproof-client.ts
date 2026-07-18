// Anchor client for the deployed goalproof program. Everything the on-chain
// scripts (create-market / take-position / resolve / claim) share lives here:
// the Program handle, the wallet, and the PDA derivations that mirror the
// program's seeds in program/programs/goalproof/src/lib.rs.
import fs from "node:fs";
import path from "node:path";
import { AnchorProvider, Program, Wallet, type Idl } from "@coral-xyz/anchor";
// @coral-xyz/anchor is CJS; under NodeNext its named ESM export for `BN` isn't
// statically visible (cjs-module-lexer misses it), so `import { BN }` compiles
// but is undefined at runtime. Reach it through the default (= module.exports).
import anchorPkg from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const BN = anchorPkg.BN;
import { repoRoot, SOLANA_RPC_URL } from "./env.js";

const MARKET_SEED = Buffer.from("market");
const VAULT_SEED = Buffer.from("vault");
const POSITION_SEED = Buffer.from("position");

/** Load the keeper signing keypair (keeper/wallet.json, a raw 64-byte secret). */
export function loadKeypair(): Keypair {
  const p = path.join(repoRoot, "keeper", "wallet.json");
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")));
  return Keypair.fromSecretKey(secret);
}

/** goalproof IDL, vendored from program/target/idl at build time. */
export function loadIdl(): Idl {
  const p = path.join(repoRoot, "keeper", "idl", "goalproof.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as Idl;
}

export interface Client {
  connection: Connection;
  wallet: Keypair;
  provider: AnchorProvider;
  program: Program;
  programId: PublicKey;
}

/** Wire up connection + provider + Program against devnet. */
export function makeClient(payer: Keypair = loadKeypair()): Client {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(payer), {
    commitment: "confirmed",
  });
  const idl = loadIdl();
  const program = new Program(idl, provider);
  return { connection, wallet: payer, provider, program, programId: program.programId };
}

/** u64/i64 little-endian, the byte layout the program uses for the market_id seed. */
export function u64le(n: number | bigint): Buffer {
  return new BN(n.toString()).toArrayLike(Buffer, "le", 8);
}

export function marketPda(programId: PublicKey, creator: PublicKey, marketId: number | bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [MARKET_SEED, creator.toBuffer(), u64le(marketId)],
    programId,
  )[0];
}

export function vaultPda(programId: PublicKey, market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([VAULT_SEED, market.toBuffer()], programId)[0];
}

/** Position PDA — one per (market, owner, side); side is a single 0/1 byte. */
export function positionPda(
  programId: PublicKey,
  market: PublicKey,
  owner: PublicKey,
  side: boolean,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, market.toBuffer(), owner.toBuffer(), Buffer.from([side ? 1 : 0])],
    programId,
  )[0];
}

export { BN, PublicKey };
