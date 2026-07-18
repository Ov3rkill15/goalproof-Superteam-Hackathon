import { type MarketState, predicateLabel } from "../data/markets";
import { explorerTx, explorerAddress } from "../config";
import { COMPARISON_SYMBOL } from "../data/catalog";

const NOUN: Record<number, string> = { 1: "goals", 2: "goals", 3: "yellows", 4: "yellows", 5: "reds", 6: "reds", 7: "corners", 8: "corners" };

function statNoun(key: number): string {
  return NOUN[key % 1000] ?? "stat";
}
function side(key: number): "Home" | "Away" {
  return (key % 1000) % 2 === 1 ? "Home" : "Away";
}

/** Plain-language description of what the market resolves on. */
function statExpr(m: MarketState): string {
  const { spec } = m;
  const noun = statNoun(spec.statAKey);
  if (spec.statBKey === undefined) return `${side(spec.statAKey)} ${noun}`;
  if (spec.op === "subtract") return `${noun} margin (home − away)`;
  return `Total ${noun}`;
}

const USD = (n: number) => `$${n.toLocaleString("en-US")}`;

export function MarketCard({ market }: { market: MarketState }) {
  const { lifecycle, resolution } = market;
  const yesPct = Math.round(market.impliedYes * 100);
  const noPct = 100 - yesPct;

  return (
    <article className="animate-card-in flex flex-col rounded-2xl border border-ink-700/70 bg-ink-850/70 p-4 shadow-lg shadow-black/30 transition-colors hover:border-ink-600">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">{market.periodLabel}</span>
        <LifecycleBadge market={market} />
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-100">{market.spec.title}</h3>

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span className="font-mono">
          {statExpr(market)} {COMPARISON_SYMBOL[market.spec.comparison]} {market.spec.threshold}
        </span>
        <span
          className={`ml-auto rounded-md px-2 py-0.5 font-mono tabular-nums ${
            market.currentlyTrue ? "bg-yes/15 text-pitch-400" : "bg-ink-800 text-slate-300"
          }`}
          title="live value from the feed"
        >
          now: {market.statValue}
        </span>
      </div>

      {/* implied-probability bar */}
      <div className="mt-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-ink-800">
          <div className="bg-yes/70" style={{ width: `${yesPct}%` }} />
          <div className="bg-no/70" style={{ width: `${noPct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-mono tabular-nums">
          <span className="text-pitch-400">YES {yesPct}% · {USD(market.yesPool)}</span>
          <span className="text-rose-400">{USD(market.noPool)} · {noPct}% NO</span>
        </div>
      </div>

      <div className="mt-3 border-t border-ink-700/60 pt-3 text-xs">
        {lifecycle === "resolved" && resolution ? (
          <Resolved market={market} />
        ) : lifecycle === "open" ? (
          <span className="text-pitch-400">● Betting open — closes at kick-off</span>
        ) : lifecycle === "upcoming" ? (
          <span className="text-slate-500">Opens at half-time</span>
        ) : (
          <span className="text-amber-300/90">🔒 Locked — settles on proof at {market.resolveMinute === 45 ? "half-time" : "full-time"}</span>
        )}
      </div>
    </article>
  );
}

function LifecycleBadge({ market }: { market: MarketState }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "OPEN", cls: "bg-pitch-500/15 text-pitch-400" },
    locked: { label: "LIVE", cls: "bg-amber-500/15 text-amber-300" },
    upcoming: { label: "SOON", cls: "bg-ink-800 text-slate-500" },
    resolved: { label: "SETTLED", cls: "bg-ink-800 text-slate-400" },
  };
  const s = map[market.lifecycle];
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function Resolved({ market }: { market: MarketState }) {
  const r = market.resolution!;
  const won = r.outcome;
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 font-semibold ${won ? "text-pitch-400" : "text-rose-400"}`}>
        <span>{won ? "✓ YES" : "✗ NO"} wins</span>
        {r.onChain ? (
          <span className="rounded bg-pitch-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-pitch-400" title="settled by real CPI into txoracle validate_stat on devnet">
            ✓ VERIFIED ON-CHAIN
          </span>
        ) : (
          <span className="font-normal text-slate-500">· proof-backed on-chain</span>
        )}
      </div>
      <div className="rounded-lg bg-ink-900/70 p-2 font-mono text-[10.5px] leading-relaxed text-slate-400">
        <div>
          predicate: <span className="text-slate-300">value {predicateLabel(r.predicateUsed.threshold, r.predicateUsed.comparison)}</span>{" "}
          {won ? "(market)" : "(complement)"}
        </div>
        <div className="truncate">
          root: <span className="text-slate-300">{r.proofRootPreview.slice(0, 16)}…</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href={explorerTx(r.txSignature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-pitch-400 hover:text-pitch-500 transition-colors"
          title="resolve tx: CPI into txoracle validate_stat"
        >
          <span className="font-mono">resolve {r.txSignature.slice(0, 6)}…{r.txSignature.slice(-4)}</span>
          <span>↗</span>
        </a>
        {r.onChain && (
          <>
            <a
              href={explorerTx(r.onChain.claimTx)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="claim tx: winner paid out from the market vault"
            >
              <span className="font-mono">claim {r.onChain.claimTx.slice(0, 6)}…</span>
              <span>↗</span>
            </a>
            <a
              href={explorerAddress(r.onChain.marketAddress)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="the market account on devnet"
            >
              <span className="font-mono">market ↗</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
