// The txoracle IDL ships without PDA seed metadata, so the fixed accounts that
// `subscribe` needs (pricing_matrix, token_mint, treasury vault/PDA) are not
// derivable offline. Instead, read them from a recent successful `subscribe`
// transaction on devnet — the account order in the instruction matches the IDL.
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_URL, TXLINE_PROGRAM_ID } from "./env.js";

const SUBSCRIBE_DISC = Buffer.from([254, 28, 191, 138, 156, 179, 183, 53]);
const ACCOUNT_NAMES = [
  "user", "pricing_matrix", "token_mint", "user_token_account",
  "token_treasury_vault", "token_treasury_pda", "token_program",
  "system_program", "associated_token_program",
];

const conn = new Connection(SOLANA_RPC_URL, "confirmed");
const programId = new PublicKey(TXLINE_PROGRAM_ID);

const sigs = await conn.getSignaturesForAddress(programId, { limit: 100 });
console.log(`scanning ${sigs.length} recent transactions on ${programId.toBase58()}…`);

for (const s of sigs) {
  if (s.err) continue;
  const tx = await conn.getTransaction(s.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) continue;
  const msg = tx.transaction.message;
  const keys = msg.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
  for (const ix of msg.compiledInstructions) {
    if (!keys.get(ix.programIdIndex)?.equals(programId)) continue;
    const data = Buffer.from(ix.data);
    if (data.length < 8 || !data.subarray(0, 8).equals(SUBSCRIBE_DISC)) continue;
    console.log(`\nfound subscribe tx: ${s.signature}`);
    console.log(`args: service_level_id=${data.readUInt16LE(8)} weeks=${data.readUInt8(10)}`);
    ix.accountKeyIndexes.forEach((ki, i) => {
      console.log(`  ${ACCOUNT_NAMES[i] ?? `extra_${i}`} = ${keys.get(ki)?.toBase58()}`);
    });
    process.exit(0);
  }
}
console.log("no subscribe transaction found in the last 100 — increase limit or paginate");
