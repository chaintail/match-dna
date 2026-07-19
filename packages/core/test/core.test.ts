import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  canonicalizeJournal,
  canonicalStringify,
  compileRing,
  createJournalRecord,
  createWitnessCommitment,
  crystallizeRing,
  initialMatchState,
  intervalForTimestamp,
  type JournalRecord,
  type NormalizedOddsRecord,
  type ProofAnchor,
  safeProbabilityShock,
  timeScaledFragility,
  transitionRing,
} from "../src/index.js";

const kickoff = Date.UTC(2026, 6, 18, 18);
const fixtureId = "demo";
const make = (id: string, seconds: number, p: [number, number, number]) =>
  createJournalRecord({
    payload: {
      kind: "odds",
      fixtureId,
      messageId: id,
      timestamp: kickoff + seconds * 1000,
      market: "match_result",
      inRunning: true,
      probabilities: { home: p[0], draw: p[1], away: p[2] },
    } satisfies NormalizedOddsRecord,
  });
const records = [
  make("a", 30, [0.4, 0.3, 0.3]),
  make("b", 120, [0.45, 0.3, 0.25]),
  make("c", 220, [0.5, 0.28, 0.22]),
];
describe("core", () => {
  it("canonicalizes objects", () =>
    expect(canonicalStringify({ z: -0, a: { y: 2, x: 1 } })).toBe('{"a":{"x":1,"y":2},"z":0}'));
  it("is duplicate and order insensitive", () =>
    fc.assert(
      fc.property(fc.shuffledSubarray([0, 1, 2, 0, 2], { minLength: 3 }), (indexes) => {
        const a = canonicalizeJournal(indexes.map((i) => records[i]!).concat(records));
        expect(a.headHash).toBe(canonicalizeJournal(records).headHash);
      }),
    ));
  it("quarantines identity conflicts", () => {
    const conflict: JournalRecord = { ...records[0]!, payloadHash: `0x${"11".repeat(32)}` };
    const ring = compileRing({
      fixtureId,
      interval: intervalForTimestamp(kickoff),
      ordinal: 0,
      records: [records[0]!, conflict],
      openingState: initialMatchState(fixtureId, kickoff),
      kickoffAt: kickoff,
    });
    expect(ring.material).toBe("quarantined");
  });
  it("crystallizes without changing geometry", () => {
    const ring = compileRing({
      fixtureId,
      interval: intervalForTimestamp(kickoff),
      ordinal: 0,
      records,
      openingState: initialMatchState(fixtureId, kickoff),
      kickoffAt: kickoff,
    });
    const anchor: ProofAnchor = {
      kind: "synthetic",
      sourceId: "a",
      sourceTimestamp: kickoff,
      leafHash: `0x${"01".repeat(32)}`,
      rootPda: "pda",
      rootHash: `0x${"02".repeat(32)}`,
      proofBundleHash: `0x${"03".repeat(32)}`,
      verifiedAt: kickoff,
      verificationMode: "synthetic",
    };
    const sealed = crystallizeRing(ring, [anchor]);
    expect(sealed.geometry).toEqual(ring.geometry);
    expect(sealed.material).toBe("crystal");
  });
  it("captures late fragility", () =>
    expect(
      timeScaledFragility({ home: 0.8, draw: 0.15, away: 0.05 }, { home: 1, away: 0 }, 88),
    ).toBeGreaterThan(
      timeScaledFragility({ home: 0.8, draw: 0.15, away: 0.05 }, { home: 1, away: 0 }, 25),
    ));
  it("bounds malformed shock", () =>
    expect(
      safeProbabilityShock(
        { home: 0.999999, draw: 0.0000005, away: 0.0000005 },
        { home: 0.0000005, draw: 0.0000005, away: 0.999999 },
        [0.02, 0.03, 0.04, 0.03, 0.02],
      ),
    ).toBeLessThanOrEqual(1));
  it("binds commitment choices", () => {
    const input = {
      fixtureId,
      wallet: "wallet",
      allegiance: "home" as const,
      lens: "hope" as const,
      species: "crystal",
      generatorVersion: "v1",
      secret: "long-enough-secret-value",
    };
    expect(createWitnessCommitment(input)).not.toBe(
      createWitnessCommitment({ ...input, lens: "chaos" }),
    );
  });
  it("enforces lifecycle", () => {
    expect(transitionRing("liquid", "reconciling")).toBe("reconciling");
    expect(() => transitionRing("liquid", "crystal")).toThrow();
  });
});
