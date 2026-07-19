import { createWitnessCommitment, hashBytes, hashCanonical } from "@match-dna/core";
import { showcaseTimeline } from "@match-dna/fixtures";
import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  buildWitnessCommitmentEnvelope,
  deriveGenomePda,
  deriveWitnessPda,
  genomeSealHashes,
  rawTxLineCpiAccounts,
} from "../src/index.js";

const owner = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, i) => i + 1)).publicKey;
const input = {
  fixtureId: "fixture-1",
  wallet: owner.toBase58(),
  allegiance: "home" as const,
  lens: "hope" as const,
  species: "crystal",
  generatorVersion: "v1",
  secret: "a-long-deterministic-secret",
};
describe("solana", () => {
  it("derives stable PDAs", () => {
    const witness = deriveWitnessPda(owner, input.fixtureId);
    expect(deriveWitnessPda(owner, input.fixtureId).equals(witness)).toBe(true);
    expect(deriveGenomePda(witness).equals(witness)).toBe(false);
  });
  it("shares exact commitment preimage", () => {
    const envelope = buildWitnessCommitmentEnvelope(input, owner);
    expect(envelope.commitment).toBe(createWitnessCommitment(input));
    expect(hashBytes(envelope.preimage)).toBe(envelope.commitment);
  });
  it("binds CPI to official TxLINE", () => {
    const root = deriveWitnessPda(owner, "root");
    expect(rawTxLineCpiAccounts("devnet", root).txlineProgram.toBase58()).toBe(
      "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    );
  });
  it("builds genome hashes", () => {
    const h = hashCanonical({ x: 1 });
    const out = genomeSealHashes(showcaseTimeline, h, h, h);
    expect(out.timelineHash).toBe(showcaseTimeline.timelineHash);
  });
});
