import { hashCanonical, hashParts, ZERO_HASH } from "./canonical.js";
import { canonicalizeJournal } from "./journal.js";
import { computeSignals, normalizeProbabilities, rawProbabilityShock } from "./signals.js";
import type {
  CanonicalAudioParameters,
  CanonicalGeometryParameters,
  CanonicalMatchState,
  Hex,
  IntervalWindow,
  JournalRecord,
  MatchAction,
  MatchStats,
  NormalizedOddsRecord,
  NormalizedScoreRecord,
  ProofAnchor,
  RingManifest,
  TimelineManifest,
} from "./types.js";
export const COMPILER_VERSION = "1.0.0";
export const SELECTION_POLICY_VERSION = "closing-anchor-v1";
export const GENERATOR_VERSION = "radial-organism-v1";
const EMPTY_STATS: MatchStats = {
  homeYellowCards: 0,
  awayYellowCards: 0,
  homeRedCards: 0,
  awayRedCards: 0,
  homeCorners: 0,
  awayCorners: 0,
  homeShots: 0,
  awayShots: 0,
};
export function initialMatchState(fixtureId: string, timestamp: number): CanonicalMatchState {
  return {
    fixtureId,
    timestamp,
    probabilities: { home: 1 / 3, draw: 1 / 3, away: 1 / 3 },
    score: { home: 0, away: 0 },
    stats: { ...EMPTY_STATS },
    statusId: 0,
    period: 0,
    finalised: false,
  };
}
function latestOdds(records: readonly JournalRecord[]): NormalizedOddsRecord | undefined {
  return records
    .filter((record): record is JournalRecord<NormalizedOddsRecord> => record.payload.kind === "odds")
    .at(-1)?.payload;
}
function latestScore(records: readonly JournalRecord[]): NormalizedScoreRecord | undefined {
  return records
    .filter((record): record is JournalRecord<NormalizedScoreRecord> => record.payload.kind === "score")
    .at(-1)?.payload;
}
function countEvents(records: readonly JournalRecord[]): Partial<Record<MatchAction, number>> {
  const counts: Partial<Record<MatchAction, number>> = {};
  for (const record of records)
    if (record.payload.kind === "score")
      counts[record.payload.action] = (counts[record.payload.action] ?? 0) + 1;
  return counts;
}
function closeState(
  opening: CanonicalMatchState,
  records: readonly JournalRecord[],
  interval: IntervalWindow,
): CanonicalMatchState {
  const odds = latestOdds(records);
  const score = latestScore(records);
  return {
    fixtureId: opening.fixtureId,
    timestamp: interval.end,
    probabilities: odds ? normalizeProbabilities(odds.probabilities) : opening.probabilities,
    score: score?.score ?? opening.score,
    stats: score?.stats ?? opening.stats,
    statusId: score?.statusId ?? opening.statusId,
    period: score?.period ?? opening.period,
    finalised: score?.action === "game_finalised" || opening.finalised,
  };
}
function amplify(events: Partial<Record<MatchAction, number>>): number {
  return (events.goal ?? 0) || (events.red_card ?? 0)
    ? 1.55
    : (events.possible_goal ?? 0) || (events.var_start ?? 0)
      ? 1.3
      : 1;
}
function geometry(
  signals: ReturnType<typeof computeSignals>,
  events: Partial<Record<MatchAction, number>>,
  ordinal: number,
): CanonicalGeometryParameters {
  const goals = events.goal ?? 0;
  const cards = (events.yellow_card ?? 0) + 2 * (events.red_card ?? 0);
  const corners = events.corner ?? 0;
  const shots = events.shot ?? 0;
  return {
    baseRadius: Math.min(0.44, 0.14 + 0.0145 * ordinal),
    radialVariance: 0.04 + 0.18 * signals.volatility + 0.07 * signals.shock,
    branchDensity: Math.min(1, 0.16 + 0.28 * goals + 0.16 * signals.shock),
    scarDensity: Math.min(1, 0.08 * cards + 0.2 * signals.drawThreat),
    spikeDensity: Math.min(1, 0.06 * corners + 0.025 * shots + 0.1 * signals.fragility),
    turbulence: Math.min(1, 0.12 + 0.55 * signals.volatility + 0.22 * signals.uncertainty),
    asymmetry: signals.dominance,
    membranePressure: Math.min(1, 0.25 * signals.drawThreat + 0.75 * signals.fragility),
    eventPulse: Math.min(1, goals * 0.65 + cards * 0.08 + corners * 0.04),
    phase: (ordinal * 0.61803398875) % 1,
  };
}
function audio(
  signals: ReturnType<typeof computeSignals>,
  events: Partial<Record<MatchAction, number>>,
  opening: CanonicalMatchState["probabilities"],
): CanonicalAudioParameters {
  const bias = opening.home - opening.away;
  return {
    rootMidi: 48 + Math.round((bias + 1) * 4),
    mode: signals.uncertainty > 0.78 ? "dorian" : bias > 0.15 ? "mixolydian" : "minor",
    tempo: 68 + Math.round(38 * signals.volatility + 24 * signals.fragility),
    density: Math.min(1, 0.18 + 0.52 * signals.volatility + 0.22 * signals.uncertainty),
    dissonance: Math.min(1, 0.12 + 0.58 * signals.uncertainty + 0.18 * signals.drawThreat),
    heartbeat: Math.min(1, 0.15 + 0.85 * signals.fragility),
    mutation: Math.min(1, (events.goal ?? 0) * 0.7 + signals.shock * 0.4),
  };
}
export interface CompileRingInput {
  fixtureId: string;
  interval: IntervalWindow;
  ordinal: number;
  records: readonly JournalRecord[];
  openingState: CanonicalMatchState;
  kickoffAt: number;
  previousRingHash?: Hex;
  previousVolatility?: number;
  recentRawShocks?: readonly number[];
}
export function compileRing(input: CompileRingInput): RingManifest {
  const journal = canonicalizeJournal(input.records);
  const closingState = closeState(input.openingState, journal.records, input.interval);
  const eventCounts = countEvents(journal.records);
  const signals = computeSignals({
    probabilities: closingState.probabilities,
    previousProbabilities: input.openingState.probabilities,
    score: closingState.score,
    elapsedMinutes: Math.max(0, (input.interval.end - input.kickoffAt) / 60_000),
    previousVolatility: input.previousVolatility ?? 0,
    recentRawShocks: input.recentRawShocks,
    eventAmplifier: amplify(eventCounts),
  });
  const payload = {
    schemaVersion: "match-dna-ring@1" as const,
    fixtureId: input.fixtureId,
    interval: input.interval,
    ordinal: input.ordinal,
    compilerVersion: COMPILER_VERSION,
    selectionPolicyVersion: SELECTION_POLICY_VERSION,
    generatorVersion: GENERATOR_VERSION,
    previousRingHash: input.previousRingHash ?? ZERO_HASH,
    journalHeadHash: journal.headHash,
    openingState: input.openingState,
    closingState,
    signals,
    geometry: geometry(signals, eventCounts, input.ordinal),
    audio: audio(signals, eventCounts, input.openingState.probabilities),
    eventCounts,
  };
  const ring: RingManifest = {
    ...payload,
    canonicalRingHash: hashCanonical(payload),
    material: journal.conflicts.length ? "quarantined" : "amber",
    proofStatus: journal.conflicts.length ? "quarantined" : "pending",
    proofAnchors: [],
    ...(journal.conflicts.length
      ? {
          quarantineReason: `Conflicting source records: ${journal.conflicts.map((conflict) => conflict.sourceId).join(", ")}`,
        }
      : {}),
  };
  return ring;
}
export function crystallizeRing(ring: RingManifest, anchors: readonly ProofAnchor[]): RingManifest {
  if (ring.material === "quarantined") return ring;
  const sorted = [...anchors].sort(
    (a, b) => a.sourceTimestamp - b.sourceTimestamp || a.sourceId.localeCompare(b.sourceId),
  );
  const proofFingerprint = hashCanonical(sorted.map((anchor) => anchor.rootHash));
  return {
    ...ring,
    material: "crystal",
    proofStatus: "verified",
    proofAnchors: sorted,
    proofFingerprint,
    sealedRingHash: hashParts(
      "MATCH_DNA_SEALED_RING_V1",
      ring.canonicalRingHash,
      proofFingerprint,
      hashCanonical(sorted),
    ),
  };
}
export function applyPartialProofs(ring: RingManifest, anchors: readonly ProofAnchor[]): RingManifest {
  return ring.material === "quarantined"
    ? ring
    : { ...ring, proofStatus: anchors.length ? "partial" : "pending", proofAnchors: [...anchors] };
}
export function compileTimeline(input: {
  fixtureId: string;
  fixtureName: string;
  kickoffAt: number;
  compiledAt?: number;
  intervals: Array<{ interval: IntervalWindow; records: readonly JournalRecord[] }>;
}): TimelineManifest {
  let state = initialMatchState(input.fixtureId, input.kickoffAt);
  let previous: Hex = ZERO_HASH;
  let volatility = 0;
  const recent: number[] = [];
  const rings: RingManifest[] = [];
  [...input.intervals]
    .sort((a, b) => a.interval.index - b.interval.index)
    .forEach((item, ordinal) => {
      const ring = compileRing({
        fixtureId: input.fixtureId,
        interval: item.interval,
        ordinal,
        records: item.records,
        openingState: state,
        kickoffAt: input.kickoffAt,
        previousRingHash: previous,
        previousVolatility: volatility,
        recentRawShocks: recent,
      });
      rings.push(ring);
      recent.push(rawProbabilityShock(state.probabilities, ring.closingState.probabilities));
      if (recent.length > 12) recent.shift();
      state = ring.closingState;
      previous = ring.canonicalRingHash;
      volatility = ring.signals.volatility;
    });
  const base = {
    schemaVersion: "match-dna-timeline@1" as const,
    fixtureId: input.fixtureId,
    fixtureName: input.fixtureName,
    kickoffAt: input.kickoffAt,
    compiledAt: input.compiledAt ?? Date.now(),
    compilerVersion: COMPILER_VERSION,
    generatorVersion: GENERATOR_VERSION,
    rings,
    finalState: state,
  };
  return { ...base, timelineHash: hashCanonical({ ...base, compiledAt: 0 }) };
}
