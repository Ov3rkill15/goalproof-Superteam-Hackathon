import { useCallback, useEffect, useRef, useState } from "react";

export const REPLAY_START = -8; // pre-match: markets open for betting
export const REPLAY_END = 92; // a touch past full-time so FT resolutions land

export interface Replay {
  minute: number;
  playing: boolean;
  speed: number; // match-minutes advanced per real second
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setMinute: (m: number) => void;
  setSpeed: (s: number) => void;
  restart: () => void;
}

export const SPEED_OPTIONS = [2, 4, 8] as const;

/** Drives a match clock over wall time so the dashboard replays a fixture. */
export function useReplay(initialSpeed = 4): Replay {
  const [minute, setMinuteState] = useState(REPLAY_START);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);

  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) return;
    const tick = (t: number) => {
      if (last.current != null) {
        const dt = (t - last.current) / 1000;
        setMinuteState((m) => {
          const next = m + dt * speedRef.current;
          if (next >= REPLAY_END) {
            setPlaying(false);
            return REPLAY_END;
          }
          return next;
        });
      }
      last.current = t;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
      last.current = null;
    };
  }, [playing]);

  const play = useCallback(() => {
    setMinuteState((m) => (m >= REPLAY_END ? REPLAY_START : m));
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const setMinute = useCallback((m: number) => {
    setPlaying(false);
    setMinuteState(Math.min(REPLAY_END, Math.max(REPLAY_START, m)));
  }, []);
  const restart = useCallback(() => {
    setMinuteState(REPLAY_START);
    setPlaying(true);
  }, []);

  return { minute, playing, speed, play, pause, toggle, setMinute, setSpeed, restart };
}
