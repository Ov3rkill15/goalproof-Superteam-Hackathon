// One-time demo setup: mint a devnet SPL token to stand in for escrow "USDC"
// (the brief bans wagering TxL, so we use our own SPL). Creates the mint with the
// keeper as authority, opens the keeper's ATA, and mints a starting balance so
// take-position has something to deposit. Records the mint in demo-state.json.
//
//   npm run setup-mint [-- --decimals 6 --supply 1000000]
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { makeClient } from "./goalproof-client.js";
import { readState, writeState } from "./demo-state.js";

function arg(name: string, def: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
}

const decimals = arg("decimals", 6);
const supply = arg("supply", 1_000_000); // whole tokens minted to the keeper

const { connection, wallet } = makeClient();

console.log(`keeper: ${wallet.publicKey.toBase58()}`);
const bal = await connection.getBalance(wallet.publicKey);
console.log(`balance: ${bal / 1e9} SOL`);
if (bal < 0.05 * 1e9) throw new Error("keeper wallet is nearly empty — airdrop devnet SOL first");

const mint = await createMint(connection, wallet, wallet.publicKey, null, decimals);
console.log(`mint created: ${mint.toBase58()} (${decimals} decimals)`);

const ata = await getOrCreateAssociatedTokenAccount(connection, wallet, mint, wallet.publicKey);
const raw = BigInt(supply) * 10n ** BigInt(decimals);
await mintTo(connection, wallet, mint, ata.address, wallet, raw);
console.log(`minted ${supply} tokens to keeper ATA ${ata.address.toBase58()}`);

const state = readState();
state.mint = mint.toBase58();
state.decimals = decimals;
writeState(state);
console.log("saved mint to demo-state.json");
