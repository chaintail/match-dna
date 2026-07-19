import {
  type CanonicalMatchState,
  canonicalizeJournal,
  compileRing,
  crystallizeRing,
  initialMatchState,
  intervalForTimestamp,
  type JournalRecord,
  type ProofAnchor,
  type RingManifest,
  type TimelineManifest,
} from "@match-dna/core";
export interface WitnessDelivery {
  deliveredAt: number;
  record: JournalRecord;
  deliveryKind?: "normal" | "duplicate" | "late";
}
export interface ScheduledProofBundle<T = unknown> {
  ringIndex: number;
  availableAt: number;
  anchors: ProofAnchor[];
  valid?: boolean;
  details?: T;
}
export interface ReplayFixtureDefinition<T = unknown> {
  fixtureId: string;
  fixtureName: string;
  kickoffAt: number;
  timeline: TimelineManifest;
  deliveries: readonly WitnessDelivery[];
  proofBundles: readonly ScheduledProofBundle<T>[];
  reconciliationWindowMs?: number;
}
export interface ReconciliationReport {
  intervalIndex: number;
  witnessHash: string;
  canonicalHash: string;
  changed: boolean;
  deliveredRecords: number;
  canonicalRecords: number;
}
export interface ReplaySnapshot<T = unknown> {
  now: number;
  progress: number;
  currentMinute: number;
  canonicalRings: RingManifest[];
  liveRing?: RingManifest;
  currentState: CanonicalMatchState;
  deliveredRecords: JournalRecord[];
  reconciliation?: ReconciliationReport;
  latestProofBundle?: ScheduledProofBundle<T>;
  complete: boolean;
}
const recordsFor = (records: readonly JournalRecord[], start: number, end: number) =>
  records.filter((record) => record.sourceTimestamp >= start && record.sourceTimestamp < end);
export class MatchDnaReplayEngine<T = unknown> {
  readonly startAt: number;
  readonly endAt: number;
  constructor(public readonly definition: ReplayFixtureDefinition<T>) {
    this.startAt = definition.kickoffAt - 30_000;
    const finalEnd = definition.timeline.rings.at(-1)?.interval.end ?? this.startAt;
    const proofEnd = Math.max(
      this.startAt,
      ...definition.proofBundles.map((bundle) => bundle.availableAt),
    );
    this.endAt = Math.max(finalEnd, proofEnd) + 10_000;
  }
  timeAtProgress(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    return this.startAt + (this.endAt - this.startAt) * p;
  }
  snapshotAt(now: number): ReplaySnapshot<T> {
    const clamped = Math.max(this.startAt, Math.min(now, this.endAt));
    const delivered = this.definition.deliveries
      .filter((d) => d.deliveredAt <= clamped)
      .map((d) => d.record);
    const canonicalRings: RingManifest[] = [];
    let latestProofBundle: ScheduledProofBundle<T> | undefined;
    for (const source of this.definition.timeline.rings) {
      if (clamped < source.interval.end) break;
      const proof = this.definition.proofBundles.find(
        (bundle) => bundle.ringIndex === source.interval.index,
      );
      if (proof && proof.valid !== false && proof.anchors.length && clamped >= proof.availableAt) {
        canonicalRings.push(crystallizeRing(source, proof.anchors));
        latestProofBundle = proof;
      } else canonicalRings.push(source);
    }
    const currentInterval = intervalForTimestamp(clamped);
    const timelineIndex = this.definition.timeline.rings.findIndex(
      (r) => r.interval.index === currentInterval.index,
    );
    const opening =
      timelineIndex > 0
        ? this.definition.timeline.rings[timelineIndex - 1]!.closingState
        : initialMatchState(this.definition.fixtureId, this.definition.kickoffAt);
    let liveRing: RingManifest | undefined;
    if (timelineIndex >= 0 && clamped < currentInterval.end) {
      const witness = canonicalizeJournal(
        recordsFor(delivered, currentInterval.start, currentInterval.end),
      ).records;
      const compiled = compileRing({
        fixtureId: this.definition.fixtureId,
        interval: currentInterval,
        ordinal: timelineIndex,
        records: witness,
        openingState: opening,
        kickoffAt: this.definition.kickoffAt,
        previousRingHash:
          timelineIndex > 0
            ? this.definition.timeline.rings[timelineIndex - 1]!.canonicalRingHash
            : undefined,
        previousVolatility:
          timelineIndex > 0 ? this.definition.timeline.rings[timelineIndex - 1]!.signals.volatility : 0,
      });
      liveRing = { ...compiled, material: "liquid", proofStatus: "pending", proofAnchors: [] };
    }
    const currentState = liveRing?.closingState ?? canonicalRings.at(-1)?.closingState ?? opening;
    const window = this.definition.reconciliationWindowMs ?? 60_000;
    const justClosed = this.definition.timeline.rings.find(
      (r) => clamped >= r.interval.end && clamped < r.interval.end + window,
    );
    let reconciliation: ReconciliationReport | undefined;
    if (justClosed) {
      const witnessRecords = canonicalizeJournal(
        recordsFor(delivered, justClosed.interval.start, justClosed.interval.end),
      ).records;
      const previous = justClosed.ordinal - 1;
      const witnessRing = compileRing({
        fixtureId: this.definition.fixtureId,
        interval: justClosed.interval,
        ordinal: justClosed.ordinal,
        records: witnessRecords,
        openingState:
          previous >= 0
            ? this.definition.timeline.rings[previous]!.closingState
            : initialMatchState(this.definition.fixtureId, this.definition.kickoffAt),
        kickoffAt: this.definition.kickoffAt,
        previousRingHash:
          previous >= 0 ? this.definition.timeline.rings[previous]!.canonicalRingHash : undefined,
        previousVolatility:
          previous >= 0 ? this.definition.timeline.rings[previous]!.signals.volatility : 0,
      });
      const allRecords = this.definition.deliveries
        .filter((d) => d.deliveryKind !== "duplicate")
        .map((d) => d.record);
      reconciliation = {
        intervalIndex: justClosed.interval.index,
        witnessHash: witnessRing.canonicalRingHash,
        canonicalHash: justClosed.canonicalRingHash,
        changed: witnessRing.canonicalRingHash !== justClosed.canonicalRingHash,
        deliveredRecords: witnessRecords.length,
        canonicalRecords: canonicalizeJournal(
          recordsFor(allRecords, justClosed.interval.start, justClosed.interval.end),
        ).records.length,
      };
    }
    return {
      now: clamped,
      progress: (clamped - this.startAt) / (this.endAt - this.startAt),
      currentMinute: Math.max(0, (clamped - this.definition.kickoffAt) / 60_000),
      canonicalRings,
      ...(liveRing ? { liveRing } : {}),
      currentState,
      deliveredRecords: delivered,
      ...(reconciliation ? { reconciliation } : {}),
      ...(latestProofBundle ? { latestProofBundle } : {}),
      complete: clamped >= this.endAt,
    };
  }
}
