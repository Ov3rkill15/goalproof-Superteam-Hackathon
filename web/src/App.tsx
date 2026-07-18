import { useMemo } from "react";
import { MatchHeader } from "./components/MatchHeader";
import { MarketCard } from "./components/MarketCard";
import { ReplayBar } from "./components/ReplayBar";
import { useReplay } from "./replay/useReplay";
import { type Lifecycle } from "./data/markets";
import { source } from "./data/adapter";
import { PROGRAM_ID, TXORACLE_ID, explorerAddress } from "./config";

const ORDER: Record<Lifecycle, number> = { open: 0, locked: 1, resolved: 2, upcoming: 3 };

export function App() {
  const replay = useReplay();
  const markets = useMemo(() => source.markets(replay.minute), [replay.minute]);

  const visible = markets
    .filter((m) => m.lifecycle !== "upcoming")
    .sort((a, b) => ORDER[a.lifecycle] - ORDER[b.lifecycle] || a.index - b.index);

  const liveCount = markets.filter((m) => m.lifecycle === "open" || m.lifecycle === "locked").length;
  const settled = markets.filter((m) => m.lifecycle === "resolved").length;
  const volume = visible.reduce((s, m) => s + m.yesPool + m.noPool, 0);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-4 pt-6 sm:px-6">
      <Brand />
      <div className="mt-5">
        <MatchHeader minute={replay.minute} />
      </div>

      <StatStrip liveCount={liveCount} settled={settled} volume={volume} />

      <main className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </main>

      <ReplayBar replay={replay} />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-pitch-400 to-pitch-600 shadow-lg shadow-pitch-500/20 ring-1 ring-white/20">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-950" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 5v6c0 5 3.4 8.3 8 11 4.6-2.7 8-6 8-11V5l-8-3Z" fill="currentColor" fillOpacity="0.15" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-50">GoalProof</h1>
          <p className="text-[11px] text-slate-500">Provable micro-markets, settled on Solana against TxLINE Merkle proofs</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <a href={explorerAddress(PROGRAM_ID)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pitch-400">
          program ↗
        </a>
        <a href={explorerAddress(TXORACLE_ID)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pitch-400">
          txoracle ↗
        </a>
        <span className="rounded-md bg-ink-800 px-2 py-0.5 font-mono text-slate-500">devnet</span>
      </div>
    </div>
  );
}

function StatStrip({ liveCount, settled, volume }: { liveCount: number; settled: number; volume: number }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      <Stat label="Live markets" value={String(liveCount)} accent="text-pitch-400" />
      <Stat label="Settled" value={String(settled)} accent="text-slate-200" />
      <Stat label="Pool volume" value={`$${volume.toLocaleString("en-US")}`} accent="text-slate-200" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-700/60 bg-ink-900/60 px-4 py-3 shadow-lg shadow-black/20">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-pitch-500/60 to-transparent" />
      <div className={`font-mono text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}
