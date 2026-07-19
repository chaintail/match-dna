import {
  canonicalBytes,
  compileTimeline,
  createJournalRecord,
  hashCanonical,
  intervalForTimestamp,
  type JournalRecord,
  type MatchAction,
  type MatchStats,
  type NormalizedOddsRecord,
  type NormalizedScoreRecord,
  type ProofAnchor,
} from "@match-dna/core";
import { buildMerkleTree, type MerkleProofNode } from "@match-dna/txline";

const SHOWCASE_ROOT_PDAS = {
  odds: "HBJnbyV8UiEtsD4zbzgK2b6g75gDQRQPKHriApF9W3CF",
  score: "C9vY83pzub2a4d3Qve5NuR4cuXc8Yq68fKRRad4xR4bi",
} as const;

export const showcaseFixture = {
  id: "match-dna-showcase-001",
  name: "Aurora FC vs Meridian Athletic",
  home: "Aurora FC",
  away: "Meridian Athletic",
  competition: "World Championship Showcase",
  venue: "Orbit Stadium",
  kickoffAt: Date.UTC(2026, 6, 18, 18, 0, 0),
  synthetic: true,
} as const;
const minute = (value: number) => showcaseFixture.kickoffAt + value * 60_000;
const oddsFrames: Array<[number, number, number, number]> = [
  [0, 0.22, 0.28, 0.5],
  [5, 0.21, 0.29, 0.5],
  [12, 0.1, 0.2, 0.7],
  [20, 0.12, 0.25, 0.63],
  [31, 0.39, 0.27, 0.34],
  [33, 0.15, 0.28, 0.57],
  [37, 0.33, 0.34, 0.33],
  [45, 0.34, 0.36, 0.3],
  [52, 0.48, 0.33, 0.19],
  [60, 0.51, 0.31, 0.18],
  [68, 0.78, 0.17, 0.05],
  [75, 0.82, 0.14, 0.04],
  [84, 0.84, 0.13, 0.03],
  [88, 0.79, 0.18, 0.03],
  [91, 0.63, 0.34, 0.03],
  [92, 0.91, 0.08, 0.01],
  [96, 0.999, 0.0007, 0.0003],
  [100, 0.999, 0.0007, 0.0003],
];
function interpolate(frameMinute: number): [number, number, number] {
  let left = oddsFrames[0]!,
    right = oddsFrames.at(-1)!;
  for (let i = 0; i < oddsFrames.length - 1; i++) {
    if (frameMinute >= oddsFrames[i]![0] && frameMinute <= oddsFrames[i + 1]![0]) {
      left = oddsFrames[i]!;
      right = oddsFrames[i + 1]!;
      break;
    }
  }
  const span = Math.max(1, right[0] - left[0]);
  const t = Math.max(0, Math.min(1, (frameMinute - left[0]) / span));
  return [
    left[1] + (right[1] - left[1]) * t,
    left[2] + (right[2] - left[2]) * t,
    left[3] + (right[3] - left[3]) * t,
  ];
}
const oddsMinutes = [
  0, 2, 5, 8, 12, 13, 17, 22, 27, 31, 32, 33, 37, 40, 45, 48, 52, 53, 58, 63, 68, 69, 73, 78, 83, 88, 89,
  91, 92, 94, 96, 99,
];
const oddsRecords = oddsMinutes.map((m, index) => {
  const [home, draw, away] = interpolate(m);
  return createJournalRecord({
    payload: {
      kind: "odds",
      fixtureId: showcaseFixture.id,
      messageId: `stable-${String(index + 1).padStart(4, "0")}`,
      timestamp: minute(m) + index * 37,
      market: "match_result",
      inRunning: m > 0,
      probabilities: { home, draw, away },
      sourceLabel: "StablePrice synthetic replay",
    } satisfies NormalizedOddsRecord,
    receivedTimestamp: minute(m) + index * 37 + 250 + (index % 4) * 140,
  });
});
const emptyStats = (): MatchStats => ({
  homeYellowCards: 0,
  awayYellowCards: 0,
  homeRedCards: 0,
  awayRedCards: 0,
  homeCorners: 0,
  awayCorners: 0,
  homeShots: 0,
  awayShots: 0,
});
interface EventInput {
  minute: number;
  action: MatchAction;
  participant?: "home" | "away" | null;
  home: number;
  away: number;
  period: number;
  statusId: number;
  mutate?: (stats: MatchStats) => void;
  confirmed?: boolean;
}
const events: EventInput[] = [
  { minute: 0, action: "kickoff", home: 0, away: 0, period: 1, statusId: 10 },
  {
    minute: 6,
    action: "corner",
    participant: "away",
    home: 0,
    away: 0,
    period: 1,
    statusId: 20,
    mutate: (s) => {
      s.awayCorners++;
    },
  },
  { minute: 12, action: "goal", participant: "away", home: 0, away: 1, period: 1, statusId: 20 },
  {
    minute: 18,
    action: "yellow_card",
    participant: "home",
    home: 0,
    away: 1,
    period: 1,
    statusId: 20,
    mutate: (s) => {
      s.homeYellowCards++;
    },
  },
  {
    minute: 24,
    action: "shot",
    participant: "home",
    home: 0,
    away: 1,
    period: 1,
    statusId: 20,
    mutate: (s) => {
      s.homeShots++;
    },
  },
  {
    minute: 31,
    action: "possible_goal",
    participant: "home",
    home: 1,
    away: 1,
    period: 1,
    statusId: 20,
    confirmed: false,
  },
  {
    minute: 31.15,
    action: "var_start",
    participant: "home",
    home: 1,
    away: 1,
    period: 1,
    statusId: 20,
    confirmed: false,
  },
  {
    minute: 32.6,
    action: "goal_cancelled",
    participant: "home",
    home: 0,
    away: 1,
    period: 1,
    statusId: 20,
    confirmed: true,
  },
  {
    minute: 37,
    action: "goal",
    participant: "home",
    home: 1,
    away: 1,
    period: 1,
    statusId: 20,
    confirmed: true,
  },
  { minute: 45, action: "period_end", home: 1, away: 1, period: 1, statusId: 30 },
  { minute: 46, action: "period_start", home: 1, away: 1, period: 2, statusId: 20 },
  {
    minute: 52,
    action: "red_card",
    participant: "away",
    home: 1,
    away: 1,
    period: 2,
    statusId: 20,
    mutate: (s) => {
      s.awayRedCards++;
    },
  },
  {
    minute: 57,
    action: "corner",
    participant: "home",
    home: 1,
    away: 1,
    period: 2,
    statusId: 20,
    mutate: (s) => {
      s.homeCorners++;
    },
  },
  {
    minute: 64,
    action: "shot",
    participant: "home",
    home: 1,
    away: 1,
    period: 2,
    statusId: 20,
    mutate: (s) => {
      s.homeShots++;
    },
  },
  { minute: 68, action: "goal", participant: "home", home: 2, away: 1, period: 2, statusId: 20 },
  {
    minute: 76,
    action: "yellow_card",
    participant: "away",
    home: 2,
    away: 1,
    period: 2,
    statusId: 20,
    mutate: (s) => {
      s.awayYellowCards++;
    },
  },
  {
    minute: 86,
    action: "corner",
    participant: "away",
    home: 2,
    away: 1,
    period: 2,
    statusId: 20,
    mutate: (s) => {
      s.awayCorners++;
    },
  },
  {
    minute: 91,
    action: "possible_goal",
    participant: "away",
    home: 2,
    away: 2,
    period: 2,
    statusId: 20,
    confirmed: false,
  },
  {
    minute: 91.1,
    action: "var_start",
    participant: "away",
    home: 2,
    away: 2,
    period: 2,
    statusId: 20,
    confirmed: false,
  },
  {
    minute: 92.2,
    action: "goal_cancelled",
    participant: "away",
    home: 2,
    away: 1,
    period: 2,
    statusId: 20,
    confirmed: true,
  },
  {
    minute: 96,
    action: "game_finalised",
    home: 2,
    away: 1,
    period: 100,
    statusId: 100,
    confirmed: true,
  },
];
const stats = emptyStats();
let sequence = 900;
const scoreRecords = events.map((event, index) => {
  event.mutate?.(stats);
  const payload: NormalizedScoreRecord = {
    kind: "score",
    fixtureId: showcaseFixture.id,
    sequence: sequence++,
    timestamp: minute(event.minute) + index * 19,
    action: event.action,
    statusId: event.statusId,
    period: event.period,
    score: { home: event.home, away: event.away },
    stats: { ...stats },
    participant: event.participant ?? null,
    confirmed: event.confirmed ?? true,
  };
  return createJournalRecord({
    payload,
    receivedTimestamp: payload.timestamp + 350 + (index % 3) * 220,
  });
});
export const showcaseRecords: JournalRecord[] = [...oddsRecords, ...scoreRecords];
function jitter(record: JournalRecord, index: number): number {
  return record.receivedTimestamp + ((index * 7919) % 4200);
}
export interface WitnessDelivery {
  deliveredAt: number;
  record: JournalRecord;
  deliveryKind: "normal" | "duplicate" | "late";
}
export const showcaseDeliveries: WitnessDelivery[] = showcaseRecords
  .flatMap((record, index) => {
    const boundaryLate =
      index % 11 === 4 ||
      (record.payload.kind === "score" &&
        ["goal_cancelled", "red_card"].includes(record.payload.action));
    const deliveredAt = boundaryLate
      ? intervalForTimestamp(record.sourceTimestamp).end + 28_000 + (index % 4) * 4_000
      : jitter(record, index);
    const base: WitnessDelivery = {
      deliveredAt,
      record,
      deliveryKind: boundaryLate ? "late" : "normal",
    };
    return index % 9 === 3
      ? [base, { deliveredAt: deliveredAt + 1_100, record, deliveryKind: "duplicate" as const }]
      : [base];
  })
  .sort((a, b) => a.deliveredAt - b.deliveredAt);
const first = intervalForTimestamp(showcaseFixture.kickoffAt);
const intervals = Array.from({ length: 20 }, (_, ordinal) => {
  const interval = {
    ...first,
    index: first.index + ordinal,
    start: first.start + ordinal * 300_000,
    end: first.end + ordinal * 300_000,
  };
  return {
    interval,
    records: showcaseRecords.filter(
      (record) => record.sourceTimestamp >= interval.start && record.sourceTimestamp < interval.end,
    ),
  };
});
export const showcaseTimeline = compileTimeline({
  fixtureId: showcaseFixture.id,
  fixtureName: showcaseFixture.name,
  kickoffAt: showcaseFixture.kickoffAt,
  compiledAt: showcaseFixture.kickoffAt + 101 * 60_000,
  intervals,
});
export interface SyntheticLeafProof {
  leaf: import("@match-dna/core").Hex;
  root: import("@match-dna/core").Hex;
  proof: MerkleProofNode[];
  anchor: ProofAnchor;
}
export interface SyntheticProofBundle {
  ringIndex: number;
  availableAt: number;
  odds: SyntheticLeafProof;
  score: SyntheticLeafProof;
  metadataRoot: import("@match-dna/core").Hex;
}
export const showcaseProofBundles: SyntheticProofBundle[] = showcaseTimeline.rings.map(
  (ring, ordinal) => {
    const tree = buildMerkleTree([
      canonicalBytes({
        kind: "closing-odds",
        fixtureId: ring.fixtureId,
        interval: ring.interval.index,
        probabilities: ring.closingState.probabilities,
      }),
      canonicalBytes({
        kind: "closing-score",
        fixtureId: ring.fixtureId,
        interval: ring.interval.index,
        score: ring.closingState.score,
        stats: ring.closingState.stats,
        statusId: ring.closingState.statusId,
        period: ring.closingState.period,
      }),
      canonicalBytes({
        kind: "ring-metadata",
        ringHash: ring.canonicalRingHash,
        journalHead: ring.journalHeadHash,
      }),
    ]);
    const availableAt =
      ring.interval.end +
      18_000 +
      (ordinal % 5) * 4_000 +
      (ordinal === 6 ? 155_000 : ordinal === 14 ? 205_000 : 0);
    const make = (kind: "odds" | "score", leafIndex: number): SyntheticLeafProof => {
      const rootPda = SHOWCASE_ROOT_PDAS[kind];
      const anchor: ProofAnchor = {
        kind,
        sourceId: `${kind}-ring-${ordinal}`,
        sourceTimestamp: ring.interval.end,
        leafHash: tree.leaves[leafIndex]!,
        rootPda,
        rootHash: tree.root,
        proofBundleHash: hashCanonical(tree.proofs[leafIndex]),
        verifiedAt: availableAt,
        verificationMode: "synthetic",
      };
      return { leaf: tree.leaves[leafIndex]!, root: tree.root, proof: tree.proofs[leafIndex]!, anchor };
    };
    return {
      ringIndex: ring.interval.index,
      availableAt,
      odds: make("odds", 0),
      score: make("score", 1),
      metadataRoot: tree.leaves[2]!,
    };
  },
);
export const showcaseMoments = events.map((event) => ({
  minute: event.minute,
  timestamp: minute(event.minute),
  action: event.action,
  participant: event.participant ?? null,
  label: event.action.replaceAll("_", " "),
}));
