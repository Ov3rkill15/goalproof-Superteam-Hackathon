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
  if (spec.op === "subtract") return `${noun} margin (H − A)`;
  return `Total ${noun}`;
}

const USD = (n: number) => `$${n.toLocaleString("en-US")}`;

export function MarketCard({ market }: { market: MarketState }) {
  const { lifecycle, resolution } = market;
  const onChain = resolution?.onChain;
  const yesPct = Math.round(market.impliedYes * 100);

  return (
    <article
      className={`animate-card-in group relative flex flex-col rounded-2xl border bg-ink-850/50 p-4 backdrop-blur-sm transition-all duration-300 ${
        onChain
          ? "border-proof-500/40 shadow-[0_0_0_1px_rgba(166,224,47,0.15),0_10px_40px_-12px_rgba(166,224,47,0.25)]"
          : "border-ink-700/60 hover:border-ink-600 hover:bg-ink-850/80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-500">{market.periodLabel}</span>
        <ProofChip market={market} />
      </div>

      <h3 className="mt-2.5 font-display text-[15px] font-semibold leading-snug text-slate-50">{market.spec.title}</h3>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-mono text-slate-400">
          {statExpr(market)} <span className="text-slate-500">{COMPARISON_SYMBOL[market.spec.comparison]}</span> {market.spec.threshold}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 font-mono tabular-nums ${
            market.currentlyTrue ? "bg-pitch-500/15 text-pitch-300" : "bg-ink-800 text-slate-400"
          }`}
          title="live value from the feed"
        >
          now {market.statValue}
        </span>
      </div>

      {lifecycle === "resolved" && resolution ? (
        <ResolvedReceipt market={market} />
      ) : (
        <>
          {/* market-implied probability — quiet, desaturated */}
          <div className="mt-3.5">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-ink-800">
              <div className="bg-yes/60" style={{ width: `${yesPct}%` }} />
              <div className="bg-no/50" style={{ width: `${100 - yesPct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-500">
              <span><span className="text-yes">YES {yesPct}%</span> · {USD(market.yesPool)}</span>
              <span>{USD(market.noPool)} · <span className="text-no">NO {100 - yesPct}%</span></span>
            </div>
          </div>
          <div className="mt-3 border-t border-ink-700/50 pt-2.5 text-[11px]">
            {lifecycle === "open" ? (
              <span className="inline-flex items-center gap-1.5 text-pitch-300">
                <span className="h-1.5 w-1.5 rounded-full bg-pitch-400" /> Open — closes at kick-off
              </span>
            ) : lifecycle === "upcoming" ? (
              <span className="text-slate-500">Opens at half-time</span>
            ) : (
              <LockedAwaitingProof minute={market.resolveMinute} />
            )}
          </div>
        </>
      )}
    </article>
  );
}

function ProofChip({ market }: { market: MarketState }) {
  const onChain = market.resolution?.onChain;
  if (market.lifecycle === "resolved") {
    return onChain ? (
      <span className="inline-flex items-center gap-1 rounded-md bg-proof-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-proof-300 ring-1 ring-proof-500/30">
        ✓ On-chain
      </span>
    ) : (
      <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Settled</span>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Open", cls: "bg-pitch-500/15 text-pitch-300" },
    locked: { label: "Locked", cls: "bg-amber-500/15 text-amber-300" },
    upcoming: { label: "Soon", cls: "bg-ink-800 text-slate-500" },
  };
  const s = map[market.lifecycle];
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>{s.label}</span>;
}

function LockedAwaitingProof({ minute }: { minute: number }) {
  return (
    <span className="relative inline-flex items-center gap-1.5 overflow-hidden text-amber-300/90">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-live" />
      Locked — awaiting proof at {minute === 45 ? "half-time" : "full-time"}
    </span>
  );
}

function ResolvedReceipt({ market }: { market: MarketState }) {
  const r = market.resolution!;
  const won = r.outcome;
  const onChain = r.onChain;
  return (
    <div className="mt-3.5 border-t border-ink-700/60 pt-3">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 font-display text-sm font-bold ${won ? "text-yes" : "text-no"}`}>
          {won ? "YES" : "NO"} settled
        </span>
        <span className={`font-mono text-[11px] ${onChain ? "text-proof-300" : "text-slate-500"}`}>
          {onChain ? "proof verified on-chain" : "proof-backed"}
        </span>
      </div>

      <dl className="mt-2.5 space-y-1.5 rounded-lg bg-ink-900/60 p-2.5 font-mono text-[10.5px] leading-relaxed">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">predicate</dt>
          <dd className="text-slate-300">value {predicateLabel(r.predicateUsed.threshold, r.predicateUsed.comparison)} {won ? "" : "(complement)"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">merkle root</dt>
          <dd className="truncate text-slate-400">{r.proofRootPreview.slice(0, 18)}…</dd>
        </div>
      </dl>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <a
          href={explorerTx(r.txSignature)}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-1 font-mono transition-colors ${onChain ? "text-proof-400 hover:text-proof-300" : "text-pitch-300 hover:text-pitch-400"}`}
          title="resolve tx — CPI into txoracle validate_stat"
        >
          resolve {r.txSignature.slice(0, 6)}… <span className="opacity-60">↗</span>
        </a>
        {onChain && (
          <>
            <a href={explorerTx(onChain.claimTx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-slate-400 transition-colors hover:text-slate-200" title="claim tx — winner paid from the vault">
              claim {onChain.claimTx.slice(0, 6)}… <span className="opacity-60">↗</span>
            </a>
            <a href={explorerAddress(onChain.marketAddress)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-slate-400 transition-colors hover:text-slate-200" title="market account on devnet">
              market <span className="opacity-60">↗</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
