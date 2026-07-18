import { FIXTURE, clockLabel, currentFrame, phaseAtMinute, scoreAtMinute } from "../data/timeline";
import { PROGRAM_ID, explorerAddress } from "../config";
import { Flag } from "./Flag";

const EVENT_ICON: Record<string, string> = {
  kickoff: "▶",
  goal: "⚽",
  yellow: "\u{1F7E8}",
  red: "\u{1F7E5}",
  corner: "\u{1F6A9}",
  whistle: "\u{1F3C1}",
};

export function MatchHeader({ minute }: { minute: number }) {
  const phase = phaseAtMinute(minute);
  const { home, away } = scoreAtMinute(minute);
  const frame = currentFrame(minute);
  const showEvent = minute >= 0 && frame.event;
  const live = phase === "H1" || phase === "H2";

  return (
    <header className="relative overflow-hidden rounded-3xl border border-ink-700/60 bg-ink-900/60 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <ProofMesh />

      <div className="relative px-5 py-5 sm:px-8 sm:py-6">
        {/* meta row */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-pitch-400 animate-live" : "bg-slate-600"}`} />
            {FIXTURE.competition}
          </span>
          <a
            href={explorerAddress(PROGRAM_ID)}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 rounded-full border border-ink-700/80 bg-ink-850/80 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition-colors hover:border-pitch-500/50 hover:text-pitch-300"
            title="goalproof program on Solana devnet"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pitch-500" />
            devnet · {PROGRAM_ID.slice(0, 4)}…{PROGRAM_ID.slice(-4)}
            <span className="opacity-50 transition-transform group-hover:translate-x-0.5">↗</span>
          </a>
        </div>

        {/* scoreline */}
        <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <TeamBlock name={FIXTURE.home} align="right" />
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-3 font-display text-5xl font-bold tabular-nums text-white sm:gap-5 sm:text-7xl">
              <span>{home}</span>
              <span className="translate-y-[-0.1em] text-2xl font-light text-slate-600 sm:text-4xl">–</span>
              <span>{away}</span>
            </div>
            <ClockBadge label={clockLabel(minute)} live={live} phase={phase} />
          </div>
          <TeamBlock name={FIXTURE.away} align="left" />
        </div>

        {/* event ticker */}
        <div className="mt-6 flex h-6 items-center justify-center">
          {showEvent && (
            <span key={frame.minute} className="animate-float-up inline-flex items-center gap-2 text-sm text-slate-300">
              <span>{EVENT_ICON[frame.event!.kind] ?? "•"}</span>
              <span className="font-medium text-slate-200">{frame.event!.text}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function TeamBlock({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${align === "right" ? "flex-row justify-end" : "flex-row-reverse justify-start"}`}>
      <span className={`font-display text-base font-semibold leading-tight text-slate-100 sm:text-2xl ${align === "right" ? "text-right" : "text-left"}`}>
        {name}
      </span>
      <Flag team={name} className="h-11 w-11 sm:h-14 sm:w-14" />
    </div>
  );
}

function ClockBadge({ label, live, phase }: { label: string; live: boolean; phase: string }) {
  const tone =
    phase === "FT"
      ? "border-ink-600 text-slate-400"
      : live
        ? "border-pitch-500/40 bg-pitch-500/10 text-pitch-300"
        : "border-amber-500/30 bg-amber-500/5 text-amber-300/90";
  return (
    <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${tone}`}>
      {live && <span className="h-1.5 w-1.5 rounded-full bg-pitch-400 animate-live" />}
      {label}
    </div>
  );
}

/** Faint Merkle-tree motif — the identity texture. Not a football pitch. */
function ProofMesh() {
  // a small binary tree: 1 root, 2, 4 leaves
  const nodes = [
    [50, 16],
    [30, 45],
    [70, 45],
    [18, 74],
    [42, 74],
    [58, 74],
    [82, 74],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-pitch-500/10 blur-3xl" />
      <svg className="absolute right-0 top-0 h-full w-1/2 opacity-[0.13]" viewBox="0 0 100 90" fill="none" preserveAspectRatio="xMidYMid meet">
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#9a8cff" strokeWidth="0.4" />
        ))}
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 0 ? 2.4 : 1.6} fill={i === 0 ? "#c2f24a" : "#9a8cff"} />
        ))}
      </svg>
    </div>
  );
}
