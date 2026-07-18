import { type ReactElement } from "react";

// Inline SVG national flags — real imagery, self-contained (no external assets),
// so the dashboard renders identically online and offline for the demo recording.

function NorwayFlag(): ReactElement {
  return (
    <svg viewBox="0 0 22 16" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="22" height="16" fill="#ba0c2f" />
      <rect x="6" width="4" height="16" fill="#fff" />
      <rect y="6" width="22" height="4" fill="#fff" />
      <rect x="7" width="2" height="16" fill="#00205b" />
      <rect y="7" width="22" height="2" fill="#00205b" />
    </svg>
  );
}

function EnglandFlag(): ReactElement {
  return (
    <svg viewBox="0 0 22 16" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="22" height="16" fill="#fff" />
      <rect x="9" width="4" height="16" fill="#ce1124" />
      <rect y="6" width="22" height="4" fill="#ce1124" />
    </svg>
  );
}

const FLAGS: Record<string, () => ReactElement> = {
  Norway: NorwayFlag,
  England: EnglandFlag,
};

/** Circular flag crest. Falls back to team initials when no flag is known. */
export function Flag({ team, className = "h-14 w-14" }: { team: string; className?: string }) {
  const F = FLAGS[team];
  return (
    <span
      className={`inline-grid ${className} shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-white/20 shadow-lg shadow-black/50`}
    >
      {F ? (
        <F />
      ) : (
        <span className="grid h-full w-full place-items-center bg-ink-700 text-sm font-bold text-slate-200">
          {team.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
