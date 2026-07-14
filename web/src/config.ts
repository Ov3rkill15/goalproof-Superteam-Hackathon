// On-chain constants. The goalproof program is really deployed on devnet — these
// explorer links resolve to live accounts.

export const CLUSTER = "devnet" as const;

/** goalproof program — LIVE on devnet (see program/, deploy 2026-07-11). */
export const PROGRAM_ID = "8RnQwJk6FN5rioUaGqEruyXENxQZNBdgJQUHCgpr4MNP";
/** TxLINE (txoracle) program CPI'd into during resolve. */
export const TXORACLE_ID = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";

export function explorerAddress(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;
}
export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
}

/**
 * DATA SOURCE flag. "mock" = markets/pools/resolutions come from the simulated
 * feed + mock adapter (current). "chain" = read Market/Position accounts from the
 * deployed program (wired once the keeper creates markets on devnet).
 */
export const DATA_SOURCE: "mock" | "chain" = "mock";
