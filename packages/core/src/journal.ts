import { hashCanonical, hashParts, ZERO_HASH } from "./canonical.js";
import type {
  CanonicalJournal,
  Hex,
  JournalRecord,
  NormalizedTxLineRecord,
  SourceKind,
} from "./types.js";
export function sourceIdFor(payload: NormalizedTxLineRecord): string {
  return payload.kind === "odds"
    ? payload.messageId
    : `${payload.fixtureId}:${payload.sequence.toString().padStart(8, "0")}`;
}
export function createJournalRecord<T extends NormalizedTxLineRecord>(input: {
  payload: T;
  receivedTimestamp?: number;
}): JournalRecord<T> {
  const { payload } = input;
  return {
    source: payload.kind,
    fixtureId: payload.fixtureId,
    sourceId: sourceIdFor(payload),
    sourceTimestamp: payload.timestamp,
    receivedTimestamp: input.receivedTimestamp ?? payload.timestamp,
    payloadHash: hashCanonical(payload),
    payload,
  };
}
export function compareJournalRecords(left: JournalRecord, right: JournalRecord): number {
  if (left.sourceTimestamp !== right.sourceTimestamp)
    return left.sourceTimestamp - right.sourceTimestamp;
  if (left.source !== right.source) return left.source === "score" ? -1 : 1;
  return (
    left.sourceId.localeCompare(right.sourceId) || left.payloadHash.localeCompare(right.payloadHash)
  );
}
export function canonicalizeJournal(records: readonly JournalRecord[]): CanonicalJournal {
  const exact = new Map<string, JournalRecord>();
  const byIdentity = new Map<string, Set<Hex>>();
  for (const record of records) {
    const identity = `${record.source}:${record.sourceId}`;
    exact.set(`${identity}:${record.payloadHash}`, record);
    const set = byIdentity.get(identity) ?? new Set<Hex>();
    set.add(record.payloadHash);
    byIdentity.set(identity, set);
  }
  const conflicts = [...byIdentity.entries()]
    .filter(([, hashes]) => hashes.size > 1)
    .map(([identity, hashes]) => {
      const [source, ...rest] = identity.split(":");
      return { source: source as SourceKind, sourceId: rest.join(":"), hashes: [...hashes].sort() };
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const canonical = [...exact.values()].sort(compareJournalRecords);
  let headHash: Hex = ZERO_HASH;
  for (const record of canonical)
    headHash = hashParts(
      "MATCH_DNA_JOURNAL_V1",
      headHash,
      record.source,
      record.sourceId,
      String(record.sourceTimestamp),
      record.payloadHash,
    );
  return { records: canonical, conflicts, headHash };
}
export const DEFAULT_INTERVAL_MS = 300_000;
export function intervalForTimestamp(
  timestamp: number,
  durationMs = DEFAULT_INTERVAL_MS,
): import("./types.js").IntervalWindow {
  if (!Number.isFinite(timestamp) || durationMs <= 0) throw new TypeError("Invalid interval parameters");
  const index = Math.floor(timestamp / durationMs);
  return { index, start: index * durationMs, end: (index + 1) * durationMs, durationMs };
}
export function bucketJournalRecords(
  records: readonly JournalRecord[],
  durationMs = DEFAULT_INTERVAL_MS,
): Map<number, JournalRecord[]> {
  const buckets = new Map<number, JournalRecord[]>();
  for (const record of records) {
    const index = intervalForTimestamp(record.sourceTimestamp, durationMs).index;
    const list = buckets.get(index) ?? [];
    list.push(record);
    buckets.set(index, list);
  }
  return buckets;
}
