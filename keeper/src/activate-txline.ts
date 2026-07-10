// One-time TxLINE free-tier activation on devnet:
//   1. load or create the keeper wallet (needs devnet SOL for fees)
//   2. guest JWT from POST {origin}/auth/guest/start
//   3. on-chain subscribe(service_level_id=1, weeks=4) — free World Cup tier, 0 TxL charged
//   4. sign `${txSig}::${jwt}` with the wallet key (empty leagues bundle)
//   5. POST /api/token/activate → API token, written to .env as TXLINE_API_TOKEN
//
// Fixed accounts below were read from a confirmed subscribe tx on devnet
// (4mgkugHBYjMnWjGAVP9DGQopHEY2RW5bXjsMuYNgYVn1s7V1SFfSg7Tv3wxq1HANcgCY3bCzeB5xECsVhbpcAgzb)
// because the published IDL carries no PDA seed metadata — see discover-accounts.ts.
import fs from "node:fs";
import path from "node:path";
import nacl from "tweetnacl";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import anchorPkg from "@coral-xyz/anchor";
const { AnchorProvider, Program, Wallet } = anchorPkg;
import { repoRoot, TXLINE_ORIGIN, SOLANA_RPC_URL } from "./env.js";

const DEVNET = {
  pricingMatrix: new PublicKey("B4hHn1FpD1YPPrcM4yUrQhBPF18zFWgijHLTsumGzeKi"),
  tokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  tokenTreasuryVault: new PublicKey("dc6rQSPk8GJAeyyAtC1F62JoigmgEuLnW4k9zmgAeuM"),
  tokenTreasuryPda: new PublicKey("Eqqd7rZQGzn2HA9L11NwBMhknxArM3L4KETyUuujK3LB"),
  token2022: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  ataProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
};
const SERVICE_LEVEL_ID = 1; // devnet free World Cup tier (SL1)
const DURATION_WEEKS = 4;

// --- wallet ---
const walletPath = path.resolve(repoRoot, process.env.KEEPER_WALLET_PATH ?? "keeper/wallet.json");
let keypair: Keypair;
if (fs.existsSync(walletPath)) {
  keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8"))));
  console.log("loaded wallet", keypair.publicKey.toBase58());
} else {
  keypair = Keypair.generate();
  fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
  console.log("created wallet", keypair.publicKey.toBase58(), "->", walletPath);
}

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// --- ensure SOL for fees ---
let balance = await connection.getBalance(keypair.publicKey);
console.log(`balance: ${balance / 1e9} SOL`);
if (balance < 0.01 * 1e9) {
  for (const amount of [1, 0.5]) {
    try {
      console.log(`requesting ${amount} SOL airdrop…`);
      const sig = await connection.requestAirdrop(keypair.publicKey, amount * 1e9);
      await connection.confirmTransaction(sig, "confirmed");
      break;
    } catch (e) {
      console.log("airdrop failed:", (e as Error).message);
    }
  }
  balance = await connection.getBalance(keypair.publicKey);
  console.log(`balance: ${balance / 1e9} SOL`);
  if (balance < 0.005 * 1e9) {
    console.error(
      `still unfunded — get devnet SOL manually at https://faucet.solana.com for ${keypair.publicKey.toBase58()} then re-run`,
    );
    process.exit(1);
  }
}

// --- guest JWT ---
const authResp = await fetch(`${TXLINE_ORIGIN}/auth/guest/start`, { method: "POST" });
if (!authResp.ok) throw new Error(`guest auth: HTTP ${authResp.status} ${await authResp.text()}`);
const { token: jwt } = (await authResp.json()) as { token: string };
console.log("guest JWT acquired");

// --- on-chain subscribe ---
const idl = JSON.parse(fs.readFileSync(path.join(repoRoot, "program", "idl", "txoracle.json"), "utf8"));
const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment: "confirmed" });
const program = new Program(idl, provider);

// ATA(user, TxL mint) under Token-2022
const [userTokenAccount] = PublicKey.findProgramAddressSync(
  [keypair.publicKey.toBuffer(), DEVNET.token2022.toBuffer(), DEVNET.tokenMint.toBuffer()],
  DEVNET.ataProgram,
);

console.log(`sending subscribe(service_level_id=${SERVICE_LEVEL_ID}, weeks=${DURATION_WEEKS})…`);
const txSig = await program.methods
  .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
  .accounts({
    user: keypair.publicKey,
    pricingMatrix: DEVNET.pricingMatrix,
    tokenMint: DEVNET.tokenMint,
    userTokenAccount,
    tokenTreasuryVault: DEVNET.tokenTreasuryVault,
    tokenTreasuryPda: DEVNET.tokenTreasuryPda,
    tokenProgram: DEVNET.token2022,
    systemProgram: new PublicKey("11111111111111111111111111111111"),
    associatedTokenProgram: DEVNET.ataProgram,
  })
  .rpc();
console.log("subscribe confirmed:", txSig);
console.log(`explorer: https://explorer.solana.com/tx/${txSig}?cluster=devnet`);

// --- activation (empty leagues bundle → message is `${txSig}::${jwt}`) ---
const message = new TextEncoder().encode(`${txSig}::${jwt}`);
const walletSignature = Buffer.from(nacl.sign.detached(message, keypair.secretKey)).toString("base64");

const actResp = await fetch(`${TXLINE_ORIGIN}/api/token/activate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ txSig, walletSignature, leagues: [] }),
});
const actBody = await actResp.text();
if (!actResp.ok) throw new Error(`activate: HTTP ${actResp.status} ${actBody}`);

// response is text/plain per OpenAPI, but the quickstart shows JSON {token} — accept both
let apiToken = actBody.trim();
try {
  const parsed = JSON.parse(actBody);
  if (parsed && typeof parsed.token === "string") apiToken = parsed.token;
} catch {
  /* plain string */
}
console.log("API token issued:", apiToken.slice(0, 12) + "…");

// --- persist into .env ---
const envPath = path.join(repoRoot, ".env");
let env = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");
if (env.charCodeAt(0) === 0xfeff) env = env.slice(1);
if (/^TXLINE_API_TOKEN=.*$/m.test(env)) {
  env = env.replace(/^TXLINE_API_TOKEN=.*$/m, `TXLINE_API_TOKEN=${apiToken}`);
} else {
  env += `\nTXLINE_API_TOKEN=${apiToken}\n`;
}
fs.writeFileSync(envPath, env);
console.log("TXLINE_API_TOKEN written to", envPath);
