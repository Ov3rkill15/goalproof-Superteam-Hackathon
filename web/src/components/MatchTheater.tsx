import { useMemo, useRef } from "react";
import { FRAMES, currentFrame, phaseAtMinute, type Frame } from "../data/timeline";
import type { MarketState } from "../data/markets";

// Match Theater — a CSS-3D perspective pitch driven by the replay feed.
//
// HONESTY NOTE: TxLINE provides event-level stats (goals, cards, corners), NOT
// player tracking. Marker *positions* on the pitch are therefore illustrative
// (goal side / corner side are inferred from which team the event belongs to);
// the events, minutes and stats themselves are the real feed data. The caption
// under the pitch says exactly that.
//
// Pure CSS 3D transforms — no three.js, no new dependencies. The "camera" is
// mouse-driven: pointer position nudges the plane's tilt/orbit via CSS vars
// (set directly on the element, so mousemove never re-renders React).

const TILT = 52; // degrees the pitch plane is rotated back by

interface Marker {
  minute: number;
  kind: "goal" | "yellow" | "red" | "corner" | "whistle" | "kickoff";
  x: number; // % across the pitch (0 = home goal line, 100 = away goal line)
  y: number; // % down the pitch
  text: string;
}

/** Deterministic jitter so card markers don't stack, stable across renders. */
function jitter(seed: number, span: number): number {
  const h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 16;
  return ((h % 1000) / 1000 - 0.5) * span;
}

/** Place an event on the pitch. Home attacks right (scores at x≈94). */
function place(f: Frame, idx: number): Marker | null {
  const e = f.event;
  if (!e) return null;
  const base = { minute: f.minute, kind: e.kind, text: e.text } as const;
  switch (e.kind) {
    case "goal":
      return { ...base, x: e.team === "home" ? 94 : 6, y: 50 + jitter(f.minute, 26) };
    case "corner": {
      // corner taken beside the goal the attacking team shoots at
      if (e.team === undefined) return { ...base, x: 50, y: 50 };
      const x = e.team === "home" ? 97 : 3;
      const y = idx % 2 === 0 ? 3 : 97;
      return { ...base, x, y };
    }
    case "yellow":
    case "red":
      return { ...base, x: 50 + jitter(f.minute * 7, 44), y: 50 + jitter(f.minute * 13, 56) };
    case "kickoff":
    case "whistle":
      return { ...base, x: 50, y: 50 };
  }
}

const MARKER_GLYPH: Record<Marker["kind"], string> = {
  goal: "⚽",
  yellow: "▮",
  red: "▮",
  corner: "⚑",
  whistle: "◉",
  kickoff: "◉",
};

/** Short labels for the 7-market fixture pack, indexed like fixturePack(). */
const CHIP_LABEL = ["Goals > 2", "Home win", "Red card", "Corners > 9", "Yellows > 4", "1H goal", "2H goal"];

export function MatchTheater({ minute, markets }: { minute: number; markets: MarketState[] }) {
  const phase = phaseAtMinute(minute);
  const pitchRef = useRef<HTMLDivElement>(null);

  const markers = useMemo(
    () =>
      FRAMES.filter((f) => f.minute <= minute && f.event)
        .map((f, i) => place(f, i))
        .filter((m): m is Marker => m !== null && m.kind !== "kickoff" && m.kind !== "whistle"),
    [minute],
  );

  const frame = currentFrame(minute);
  const last = markers[markers.length - 1];
  const liveMarker = last && frame.event && frame.minute === last.minute ? last : null;
  const liveGoal = liveMarker?.kind === "goal" ? liveMarker : null;

  // The proof moment: markets resolve at HT (45) and FT (90) — citron beam sweep.
  const proofSweep = (minute >= 45 && minute < 48) || (minute >= 90 && minute < 93);
  const sweepKey = minute >= 90 ? "ft" : "ht";

  if (phase === "PRE") return null;

  // Mouse-driven camera: nudge tilt (±5°) and orbit (±6°) toward the pointer.
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = pitchRef.current;
    if (!el) return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--dy", `${(nx * 12).toFixed(2)}deg`);
    el.style.setProperty("--dx", `${(-ny * 10).toFixed(2)}deg`);
  };
  const onLeave = () => {
    const el = pitchRef.current;
    if (!el) return;
    el.style.setProperty("--dx", "0deg");
    el.style.setProperty("--dy", "0deg");
  };

  return (
    <section
      aria-label="Match theater"
      className="relative mt-4 overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/40 backdrop-blur-sm"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* floodlight glows, fixed to the scene (not the plane) */}
      <div aria-hidden className="theater-floodlight theater-floodlight-l" />
      <div aria-hidden className="theater-floodlight theater-floodlight-r" />

      <div className={`theater-scene ${liveGoal ? "theater-punch" : ""}`} key={liveGoal ? `g${liveGoal.minute}` : "scene"}>
        <div
          ref={pitchRef}
          className="theater-pitch"
          style={{ transform: `rotateX(calc(${TILT}deg + var(--dx, 0deg))) rotateZ(var(--dy, 0deg))` }}
        >
          {/* stadium bowl: apron around the pitch + extruded slab beneath it */}
          <div aria-hidden className="theater-apron" />
          <div aria-hidden className="theater-slab" />

          <PitchLines />

          {/* proof beam — the on-chain settlement moment, citron by design system */}
          {proofSweep && <div key={sweepKey} aria-hidden className="theater-beam" />}

          {/* the ball, gliding from the centre to the goal mouth on a live goal */}
          {liveGoal && (
            <span
              key={`ball-${liveGoal.minute}`}
              aria-hidden
              className="theater-ball"
              style={{ "--bx": `${liveGoal.x}%`, "--by": `${liveGoal.y}%` } as React.CSSProperties}
            />
          )}

          {/* floating market chips along the far touchline */}
          <div className="hidden sm:block" aria-hidden>
            {markets.slice(0, 7).map((m, i) => (
              <MarketChip key={m.id} market={m} label={CHIP_LABEL[i] ?? m.spec.title} x={8 + i * 14} tier={i % 2} />
            ))}
          </div>

          {/* event markers, standing up from the plane */}
          {markers.map((m, i) => {
            const isLive = liveMarker === m;
            return (
              <div key={`${m.minute}-${i}`} className="theater-anchor" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                <div
                  className={`theater-billboard ${isLive ? "theater-pop" : ""}`}
                  style={{ transform: `translate(-50%, -100%) rotateX(${-TILT}deg)` }}
                >
                  {isLive && m.kind === "goal" && <span className="theater-burst" aria-hidden />}
                  <span
                    className={`theater-glyph ${
                      m.kind === "goal"
                        ? "text-pitch-300"
                        : m.kind === "yellow"
                          ? "text-amber-300"
                          : m.kind === "red"
                            ? "text-no"
                            : "text-slate-400"
                    } ${isLive ? "text-base" : "text-[10px] opacity-60"}`}
                  >
                    {MARKER_GLYPH[m.kind]}
                  </span>
                  {isLive && <span className="theater-caption">{m.text}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="relative border-t border-ink-700/40 px-4 py-2 text-center text-[10.5px] text-slate-500">
        <span className="hidden sm:inline">Move the mouse — the camera follows · </span>
        Events, minutes &amp; stats are feed data · marker positions illustrative (TxLINE has no player tracking) ·{" "}
        <span className="text-proof-400">citron sweep = proofs verified on-chain</span>
      </p>
    </section>
  );
}

/** One market as a standing billboard on the far side of the pitch.
 *  Perspective shrinks the far touchline hard, so chips are counter-scaled and
 *  staggered on two heights (like tiered stadium ad boards) to stay readable
 *  without colliding — 7 chips at 14% spacing leave ~95px per chip at 680px. */
function MarketChip({ market, label, x, tier }: { market: MarketState; label: string; x: number; tier: number }) {
  const resolved = market.lifecycle === "resolved";
  const yesPct = Math.round(market.impliedYes * 100);
  const lift = tier === 1 ? 52 : 0; // px up the standing plane for the raised row
  return (
    <div className="theater-anchor" style={{ left: `${x}%`, top: "-5%" }}>
      <div
        className={`theater-chip ${resolved ? "theater-chip-resolved" : ""}`}
        style={{
          transform: `translate(-50%, -100%) rotateX(${-TILT}deg) translateY(${-lift}px) scale(1.3)`,
          "--stalk": `${12 + lift}px`,
        } as React.CSSProperties}
      >
        <span className="block truncate font-semibold text-slate-100">{label}</span>
        <span className={`block font-mono ${resolved ? "text-proof-300" : "text-slate-300"}`}>
          {resolved ? (market.resolution?.outcome ? "✓ YES" : "✓ NO") : `YES ${yesPct}%`}
        </span>
      </div>
    </div>
  );
}

/** Wireframe pitch — violet hairlines on ink, deliberately not turf-green. */
function PitchLines() {
  const s = "rgba(154, 140, 255, 0.28)"; // pitch-400, low alpha
  return (
    <svg viewBox="0 0 100 64" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <rect x="1" y="1" width="98" height="62" fill="rgba(124,108,255,0.04)" stroke={s} strokeWidth="0.35" />
      <line x1="50" y1="1" x2="50" y2="63" stroke={s} strokeWidth="0.3" />
      <circle cx="50" cy="32" r="7.5" fill="none" stroke={s} strokeWidth="0.3" />
      <circle cx="50" cy="32" r="0.7" fill={s} />
      {/* penalty boxes */}
      <rect x="1" y="15" width="13" height="34" fill="none" stroke={s} strokeWidth="0.3" />
      <rect x="86" y="15" width="13" height="34" fill="none" stroke={s} strokeWidth="0.3" />
      <rect x="1" y="24" width="5" height="16" fill="none" stroke={s} strokeWidth="0.3" />
      <rect x="94" y="24" width="5" height="16" fill="none" stroke={s} strokeWidth="0.3" />
      {/* goals */}
      <rect x="0" y="27.5" width="1" height="9" fill="none" stroke={s} strokeWidth="0.35" />
      <rect x="99" y="27.5" width="1" height="9" fill="none" stroke={s} strokeWidth="0.35" />
      {/* corner arcs */}
      <path d="M 1 4 A 3 3 0 0 0 4 1" fill="none" stroke={s} strokeWidth="0.3" />
      <path d="M 96 1 A 3 3 0 0 0 99 4" fill="none" stroke={s} strokeWidth="0.3" />
      <path d="M 99 60 A 3 3 0 0 0 96 63" fill="none" stroke={s} strokeWidth="0.3" />
      <path d="M 4 63 A 3 3 0 0 0 1 60" fill="none" stroke={s} strokeWidth="0.3" />
    </svg>
  );
}
