import {
  type SyntheticProofBundle,
  showcaseDeliveries,
  showcaseFixture,
  showcaseProofBundles,
  showcaseTimeline,
} from "@match-dna/fixtures";
import { MatchDnaReplayEngine, type ReplaySnapshot, type ScheduledProofBundle } from "@match-dna/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const RATE = 90_000;
const proofs = (): ScheduledProofBundle<SyntheticProofBundle>[] =>
  showcaseProofBundles.map((b) => ({
    ringIndex: b.ringIndex,
    availableAt: b.availableAt,
    anchors: [b.odds.anchor, b.score.anchor],
    details: b,
  }));
export function useReplay(): {
  snapshot: ReplaySnapshot<SyntheticProofBundle>;
  playing: boolean;
  speed: number;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  seekProgress: (v: number) => void;
  seekMinute: (v: number) => void;
  restart: () => void;
} {
  const engine = useMemo(
      () =>
        new MatchDnaReplayEngine<SyntheticProofBundle>({
          fixtureId: showcaseFixture.id,
          fixtureName: showcaseFixture.name,
          kickoffAt: showcaseFixture.kickoffAt,
          timeline: showcaseTimeline,
          deliveries: showcaseDeliveries,
          proofBundles: proofs(),
          reconciliationWindowMs: 60_000,
        }),
      [],
    ),
    [now, setNow] = useState(engine.startAt),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(4),
    frame = useRef<number | null>(null),
    previous = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      previous.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      return;
    }
    const tick = (real: number) => {
      const before = previous.current ?? real,
        delta = Math.min(100, real - before);
      previous.current = real;
      setNow((current) => {
        const next = Math.min(engine.endAt, current + (delta / 1000) * RATE * speed);
        if (next >= engine.endAt) setPlaying(false);
        return next;
      });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [engine, playing, speed]);
  return {
    snapshot: engine.snapshotAt(now),
    playing,
    speed,
    setPlaying,
    setSpeed,
    seekProgress: useCallback((v) => setNow(engine.timeAtProgress(v)), [engine]),
    seekMinute: useCallback((v) => setNow(showcaseFixture.kickoffAt + v * 60_000), []),
    restart: useCallback(() => {
      setNow(engine.startAt);
      setPlaying(false);
    }, [engine]),
  };
}
