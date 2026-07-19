import {
  showcaseDeliveries,
  showcaseFixture,
  showcaseProofBundles,
  showcaseTimeline,
} from "@match-dna/fixtures";
import { describe, expect, it } from "vitest";
import {
  MatchDnaReplayEngine,
  ProofPendingError,
  type ScheduledProofBundle,
  waitUntilProofAvailable,
} from "../src/index.js";

const proofs: ScheduledProofBundle[] = showcaseProofBundles.map((b) => ({
  ringIndex: b.ringIndex,
  availableAt: b.availableAt,
  anchors: [b.odds.anchor, b.score.anchor],
  details: b,
}));
const engine = new MatchDnaReplayEngine({
  fixtureId: showcaseFixture.id,
  fixtureName: showcaseFixture.name,
  kickoffAt: showcaseFixture.kickoffAt,
  timeline: showcaseTimeline,
  deliveries: showcaseDeliveries,
  proofBundles: proofs,
});
describe("sdk", () => {
  it("moves liquid to amber to crystal", () => {
    const ring = showcaseTimeline.rings[0]!,
      proof = proofs[0]!;
    expect(engine.snapshotAt(ring.interval.start + 60_000).liveRing?.material).toBe("liquid");
    expect(engine.snapshotAt(ring.interval.end + 1).canonicalRings[0]?.material).toBe("amber");
    expect(engine.snapshotAt(proof.availableAt + 1).canonicalRings[0]?.material).toBe("crystal");
  });
  it("keeps late roots amber", () => {
    const proof = proofs[14]!,
      ring = showcaseTimeline.rings[14]!;
    const snapshot = engine.snapshotAt(proof.availableAt - 1);
    expect(snapshot.canonicalRings.find((r) => r.interval.index === ring.interval.index)?.material).toBe(
      "amber",
    );
  });
  it("converges after browser sleep", () => {
    const snapshot = engine.snapshotAt(engine.endAt);
    expect(snapshot.currentState.score).toEqual({ home: 2, away: 1 });
    expect(snapshot.canonicalRings.every((r) => r.material === "crystal")).toBe(true);
  });
  it("retries pending proof", async () => {
    let attempts = 0;
    const value = await waitUntilProofAvailable(
      async () => {
        if (++attempts < 3) throw new Error("pending");
        return "ok";
      },
      (e) => e instanceof Error && e.message === "pending",
      { initialDelayMs: 0, maximumDelayMs: 0, timeoutMs: 50 },
    );
    expect(value).toBe("ok");
    expect(attempts).toBe(3);
  });
  it("times out", async () => {
    let clock = 0;
    await expect(
      waitUntilProofAvailable(
        async () => {
          throw new Error("pending");
        },
        () => true,
        {
          initialDelayMs: 1,
          maximumDelayMs: 1,
          timeoutMs: 2,
          now: () => clock,
          sleep: async (ms) => {
            clock += ms;
          },
        },
      ),
    ).rejects.toBeInstanceOf(ProofPendingError);
  });
});
