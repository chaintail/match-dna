import { canonicalizeJournal } from "@match-dna/core";
import { verifyMerkleProof } from "@match-dna/txline";
import { describe, expect, it } from "vitest";
import {
  showcaseDeliveries,
  showcaseProofBundles,
  showcaseRecords,
  showcaseTimeline,
} from "../src/index.js";

describe("showcase fixture", () => {
  it("finishes 2-1 with the canonical final marker", () => {
    expect(showcaseTimeline.finalState.score).toEqual({ home: 2, away: 1 });
    expect(showcaseTimeline.finalState.finalised).toBe(true);
  });
  it("converges under adversarial delivery", () => {
    expect(canonicalizeJournal(showcaseDeliveries.map((d) => d.record)).headHash).toBe(
      canonicalizeJournal(showcaseRecords).headHash,
    );
  });
  it("ships valid synthetic proofs", () => {
    for (const bundle of showcaseProofBundles) {
      expect(verifyMerkleProof(bundle.odds.leaf, bundle.odds.proof, bundle.odds.root)).toBe(true);
      expect(verifyMerkleProof(bundle.score.leaf, bundle.score.proof, bundle.score.root)).toBe(true);
    }
  });
  it("contains intentionally delayed roots", () =>
    expect(
      showcaseProofBundles.some(
        (bundle, index) => bundle.availableAt - showcaseTimeline.rings[index]!.interval.end > 120_000,
      ),
    ).toBe(true));
});
