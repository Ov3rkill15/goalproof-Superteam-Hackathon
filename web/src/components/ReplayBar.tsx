import { REPLAY_END, REPLAY_START, SPEED_OPTIONS, type Replay } from "../replay/useReplay";
import { clockLabel } from "../data/timeline";

/** Playback controls for the simulated feed: play/pause, scrub, speed. */
export function ReplayBar({ replay }: { replay: Replay }) {
  const { minute, playing, speed, toggle, setMinute, setSpeed, restart } = replay;
  const pct = ((minute - REPLAY_START) / (REPLAY_END - REPLAY_START)) * 100;

  return (
    <div className="sticky bottom-0 z-20 mt-6 rounded-2xl border border-ink-700/70 bg-ink-850/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pitch-500 text-ink-950 hover:bg-pitch-400 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          onClick={restart}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-100 transition-colors"
          title="Restart from pre-match"
        >
          ↺ Restart
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={REPLAY_START}
            max={REPLAY_END}
            step={0.1}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-full accent-pitch-500"
            style={{ background: `linear-gradient(to right, var(--color-pitch-600) ${pct}%, var(--color-ink-700) ${pct}%)` }}
            aria-label="Scrub match minute"
          />
        </div>

        <span className="w-16 shrink-0 text-center font-mono text-sm tabular-nums text-slate-200">{clockLabel(minute)}</span>

        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-ink-800 p-0.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                speed === s ? "bg-pitch-500 text-ink-950" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Simulated TxLINE feed · replay of fixture 18213979 · ingestion records the real SSE stream to <span className="font-mono">ingestion/recordings/</span>
      </p>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 2.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
    </svg>
  );
}
