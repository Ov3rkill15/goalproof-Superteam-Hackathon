// Fetches the TxLINE (txoracle) Anchor IDL from devnet and saves it to
// program/idl/txoracle.json. The IDL drives both the activation script's
// `subscribe` call and the CPI-vs-view investigation for `validateStat`.
import fs from "node:fs";
import path from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { repoRoot, SOLANA_RPC_URL, TXLINE_PROGRAM_ID } from "./env.js";

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const provider = new AnchorProvider(connection, new Wallet(Keypair.generate()), {});

const idl = await Program.fetchIdl(new PublicKey(TXLINE_PROGRAM_ID), provider);
if (!idl) {
  console.error("No IDL published on-chain for", TXLINE_PROGRAM_ID);
  process.exit(1);
}

const out = path.join(repoRoot, "program", "idl", "txoracle.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(idl, null, 2));

console.log("IDL saved to", out);
console.log("address:", (idl as any).address);
console.log("instructions:");
for (const ix of (idl as any).instructions ?? []) {
  const args = (ix.args ?? []).map((a: any) => `${a.name}: ${JSON.stringify(a.type)}`).join(", ");
  console.log(`  - ${ix.name}(${args})`);
}
