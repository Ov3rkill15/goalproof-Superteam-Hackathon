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
    <header className="relative overflow-hidden rounded-3xl border border-ink-700/70 shadow-2xl shadow-black/50">
      <StadiumBackdrop />

      <div className="relative px-5 py-5 sm:px-8 sm:py-7">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 font-medium uppercase tracking-widest text-slate-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-pitch-400" /> {FIXTURE.competition}
          </span>
          <a
            href={explorerAddress(PROGRAM_ID)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-black/35 px-3 py-1 font-mono text-[11px] text-pitch-300 backdrop-blur-sm transition-colors hover:text-pitch-400"
            title="goalproof program on Solana devnet"
          >
            program {PROGRAM_ID.slice(0, 4)}…{PROGRAM_ID.slice(-4)} ↗
          </a>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          <TeamBlock name={FIXTURE.home} align="right" />
          <ScoreBlock home={home} away={away} label={clockLabel(minute)} live={live} phase={phase} />
          <TeamBlock name={FIXTURE.away} align="left" />
        </div>

        <div className="mt-5 flex h-7 justify-center">
          {showEvent && (
            <span
              key={frame.minute}
              className="animate-card-in inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-1 text-sm text-slate-100 backdrop-blur-sm"
            >
              <span>{EVENT_ICON[frame.event!.kind] ?? "•"}</span>
              <span className="font-medium">{frame.event!.text}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function TeamBlock({ name, align }: { name: string; align: "left" | "right" }) {
  const flag = <Flag team={name} className="h-12 w-12 sm:h-16 sm:w-16" />;
  const label = (
    <span className="text-base font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] sm:text-2xl">
      {name}
    </span>
  );
  return (
    <div className={`flex items-center gap-2.5 sm:gap-4 ${align === "right" ? "flex-row justify-end" : "flex-row-reverse justify-start"}`}>
      <div className={align === "right" ? "text-right" : "text-left"}>{label}</div>
      {flag}
    </div>
  );
}

function ScoreBlock({
  home,
  away,
  label,
  live,
  phase,
}: {
  home: number;
  away: number;
  label: string;
  live: boolean;
  phase: string;
}) {
  const tone =
    phase === "FT"
      ? "text-slate-300 border-white/15 bg-black/40"
      : live
        ? "text-pitch-300 border-pitch-400/40 bg-pitch-500/10"
        : "text-amber-300 border-amber-400/30 bg-amber-500/10";
  return (
    <div className="flex flex-col items-center px-1">
      <div className="flex items-center gap-2.5 rounded-2xl bg-black/40 px-4 py-1.5 font-mono text-4xl font-black tabular-nums text-white shadow-lg shadow-black/40 ring-1 ring-white/10 backdrop-blur-sm sm:gap-4 sm:text-6xl">
        <span>{home}</span>
        <span className="text-slate-500">:</span>
        <span>{away}</span>
      </div>
      <div className={`mt-2.5 inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-xs font-semibold backdrop-blur-sm ${tone}`}>
        {live && <span className="h-1.5 w-1.5 rounded-full bg-pitch-400 animate-live" />}
        {label}
      </div>
    </div>
  );
}

/** Self-contained "stadium at night" scene behind the scoreline — SVG + CSS only. */
function StadiumBackdrop() {
  const stripes = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div aria-hidden className="absolute inset-0">
      {/* night sky */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_140%_at_50%_-20%,#1c2c42_0%,#0d1420_58%,#080c12_100%)]" />
      {/* floodlight glows */}
      <div className="absolute -top-16 left-[10%] h-52 w-52 rounded-full bg-pitch-400/10 blur-3xl" />
      <div className="absolute -top-16 right-[10%] h-52 w-52 rounded-full bg-sky-300/10 blur-3xl" />
      {/* pitch with mowing stripes */}
      <svg className="absolute inset-x-0 bottom-0 h-3/5 w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#124a30" />
            <stop offset="1" stopColor="#0a2418" />
          </linearGradient>
        </defs>
        <rect y="14" width="100" height="26" fill="url(#pitchGrad)" />
        {stripes.map((i) => (
          <rect key={i} x={i * 10} y="14" width="5" height="26" fill="#ffffff" opacity="0.03" />
        ))}
        {/* halfway line + centre circle */}
        <line x1="50" y1="14" x2="50" y2="40" stroke="#ffffff" strokeWidth="0.3" opacity="0.12" />
        <circle cx="50" cy="30" r="6" fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.12" />
      </svg>
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_45%,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
