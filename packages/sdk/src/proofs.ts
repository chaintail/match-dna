import {
  applyPartialProofs,
  type CanonicalMatchState,
  canonicalizeJournal,
  compileRing,
  crystallizeRing,
  type Hex,
  type IntervalWindow,
  type JournalRecord,
  type ProofAnchor,
  type RingManifest,
} from "@match-dna/core";
import { TxLineClient, TxLineHttpError } from "@match-dna/txline";
export interface RetryPolicy {
  initialDelayMs?: number;
  maximumDelayMs?: number;
  multiplier?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}
export class ProofPendingError extends Error {
  constructor(message = "Proof is not available yet") {
    super(message);
    this.name = "ProofPendingError";
  }
}
const sleepDefault = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
export async function waitUntilProofAvailable<T>(
  fetchProof: () => Promise<T>,
  isPending: (error: unknown) => boolean,
  policy: RetryPolicy = {},
): Promise<T> {
  const started = (policy.now ?? Date.now)();
  let delay = policy.initialDelayMs ?? 750;
  for (;;) {
    policy.signal?.throwIfAborted();
    try {
      return await fetchProof();
    } catch (error) {
      if (!isPending(error)) throw error;
      if ((policy.now ?? Date.now)() - started >= (policy.timeoutMs ?? 360_000))
        throw new ProofPendingError(`Proof remained unavailable for ${policy.timeoutMs ?? 360_000}ms`);
      await (policy.sleep ?? sleepDefault)(delay, policy.signal);
      delay = Math.min(policy.maximumDelayMs ?? 8_000, Math.ceil(delay * (policy.multiplier ?? 1.7)));
    }
  }
}
export class MatchDnaProofKit {
  constructor(public readonly txline: TxLineClient) {}
  canonicalizeInterval(input: {
    fixtureId: string;
    interval: IntervalWindow;
    ordinal: number;
    records: readonly JournalRecord[];
    openingState: CanonicalMatchState;
    kickoffAt: number;
    previousRingHash?: Hex;
    previousVolatility?: number;
  }): RingManifest {
    const journal = canonicalizeJournal(input.records);
    return compileRing({ ...input, records: journal.records });
  }
  attachPartialProofs(ring: RingManifest, anchors: readonly ProofAnchor[]) {
    return applyPartialProofs(ring, anchors);
  }
  sealRing(ring: RingManifest, anchors: readonly ProofAnchor[]) {
    if (!anchors.length) throw new TypeError("At least one verified proof anchor is required");
    return crystallizeRing(ring, anchors);
  }
  waitForScoreProof(
    fixtureId: string | number,
    sequence: number,
    statKeys: readonly number[],
    timeoutMs = 360_000,
  ) {
    return waitUntilProofAvailable(
      () => this.txline.scoreProofV2(fixtureId, sequence, statKeys),
      (error) => error instanceof TxLineHttpError && [404, 409, 425].includes(error.status),
      { timeoutMs },
    );
  }
}
