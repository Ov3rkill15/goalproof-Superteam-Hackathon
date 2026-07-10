// Thin TxLINE REST client for the keeper: guest JWT + long-lived API token.
import { TXLINE_ORIGIN } from "./env.js";

let jwt: string | null = null;

async function guestJwt(): Promise<string> {
  if (jwt) return jwt;
  const resp = await fetch(`${TXLINE_ORIGIN}/auth/guest/start`, { method: "POST" });
  if (!resp.ok) throw new Error(`guest auth: HTTP ${resp.status} ${await resp.text()}`);
  jwt = ((await resp.json()) as { token: string }).token;
  return jwt;
}

export async function txlineGet<T>(pathAndQuery: string): Promise<T> {
  const token = process.env.TXLINE_API_TOKEN;
  if (!token) throw new Error("TXLINE_API_TOKEN missing — run `npm run activate` first");
  const doFetch = async () =>
    fetch(`${TXLINE_ORIGIN}/api${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${await guestJwt()}`, "X-Api-Token": token },
    });
  let resp = await doFetch();
  if (resp.status === 401) {
    jwt = null; // guest JWT expired (30 days) — reacquire once
    resp = await doFetch();
  }
  if (!resp.ok) throw new Error(`GET ${pathAndQuery}: HTTP ${resp.status} ${await resp.text()}`);
  return (await resp.json()) as T;
}

/** Latest fixtures snapshot, optionally from an epoch day (days since 1970-01-01 UTC). */
export function fixturesSnapshot(epochDay?: number): Promise<unknown> {
  const q = epochDay != null ? `?epochDay=${epochDay}` : "";
  return txlineGet(`/fixtures/snapshot${q}`);
}

/** Merkle proofs tying stat(s) of a fixture to the on-chain daily root (legacy 1-2 stat mode). */
export function statValidation(fixtureId: number | bigint, seq: number, statKey: number, statKey2?: number): Promise<unknown> {
  const q2 = statKey2 != null ? `&statKey2=${statKey2}` : "";
  return txlineGet(`/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKey=${statKey}${q2}`);
}
