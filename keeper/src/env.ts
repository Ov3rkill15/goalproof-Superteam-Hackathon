// Minimal .env loader shared by keeper scripts. Strips a UTF-8 BOM first:
// editors sneak one in and it silently corrupts the first key.
import fs from "node:fs";
import path from "node:path";

export function loadDotEnv(...candidates: string[]) {
  for (const p of candidates) {
    let raw: string;
    try {
      raw = fs.readFileSync(p, "utf8");
    } catch {
      continue;
    }
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      if (!process.env[key]) process.env[key] = t.slice(eq + 1).trim();
    }
  }
}

/** Repo root = parent of keeper/. Lets scripts run from any cwd. */
export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

loadDotEnv(path.join(repoRoot, ".env"));

export const TXLINE_ORIGIN = (process.env.TXLINE_ORIGIN ?? "https://txline-dev.txodds.com").replace(/\/+$/, "");
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const TXLINE_PROGRAM_ID = process.env.TXLINE_PROGRAM_ID ?? "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";
