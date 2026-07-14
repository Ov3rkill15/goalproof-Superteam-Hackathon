import { FIXTURE, clockLabel, currentFrame, phaseAtMinute, scoreAtMinute } from "../data/timeline";
import { PROGRAM_ID, explorerAddress } from "../config";

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
    <header className="rounded-2xl border border-ink-700/70 bg-ink-900/80 backdrop-blur px-5 py-4 sm:px-7 sm:py-5 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
        <span className="uppercase tracking-widest">{FIXTURE.competition}</span>
        <a
          href={explorerAddress(PROGRAM_ID)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-pitch-400 hover:text-pitch-500 transition-colors"
          title="goalproof program on Solana devnet"
        >
          program {PROGRAM_ID.slice(0, 4)}…{PROGRAM_ID.slice(-4)} ↗
        </a>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 sm:gap-8">
        <TeamName name={FIXTURE.home} align="right" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 font-mono text-4xl sm:text-5xl font-bold tabular-nums">
            <span>{home}</span>
            <span className="text-slate-600">:</span>
            <span>{away}</span>
          </div>
          <ClockBadge label={clockLabel(minute)} live={live} phase={phase} />
        </div>
        <TeamName name={FIXTURE.away} align="left" />
      </div>

      <div className="mt-3 h-6 text-center text-sm text-slate-300">
        {showEvent && (
          <span key={frame.minute} className="animate-card-in inline-flex items-center gap-2">
            <span>{EVENT_ICON[frame.event!.kind] ?? "•"}</span>
            <span className="font-medium">{frame.event!.text}</span>
          </span>
        )}
      </div>
    </header>
  );
}

function TeamName({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <span className="text-lg sm:text-2xl font-semibold text-slate-100">{name}</span>
    </div>
  );
}

function ClockBadge({ label, live, phase }: { label: string; live: boolean; phase: string }) {
  const tone =
    phase === "FT" ? "text-slate-400 border-ink-600" : live ? "text-pitch-400 border-pitch-500/40" : "text-amber-300 border-amber-500/30";
  return (
    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-xs font-semibold ${tone}`}>
      {live && <span className="h-1.5 w-1.5 rounded-full bg-pitch-500 animate-live" />}
      {label}
    </div>
  );
}
