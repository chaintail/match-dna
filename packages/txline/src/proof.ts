import { type Hex, hashCanonical, hexFromBytes, type ProofAnchor } from "@match-dna/core";
import type { TxLineNetwork } from "./config.js";
import { decodeBytes32 } from "./merkle.js";
import { deriveOddsRootPda, deriveScoreRootPda, normalizeTimestampSeconds } from "./pda.js";
export interface ScoreProofV2 {
  fixtureId: string | number;
  sequence: number;
  timestamp: number;
  statKeys: number[];
  statValues: number[];
  statisticsRoot: unknown;
  fixtureRoot: unknown;
  batchRoot: unknown;
  statisticsProof: unknown[];
  fixtureProof: unknown[];
  mainProof: unknown[];
  [key: string]: unknown;
}
export function toAnchorScoreV2Payload(proof: ScoreProofV2) {
  return {
    fixtureId: BigInt(proof.fixtureId),
    sequence: BigInt(proof.sequence),
    timestamp: BigInt(normalizeTimestampSeconds(proof.timestamp)),
    statKeys: proof.statKeys,
    statValues: proof.statValues.map(BigInt),
    statisticsRoot: Array.from(decodeBytes32(proof.statisticsRoot)),
    fixtureRoot: Array.from(decodeBytes32(proof.fixtureRoot)),
    batchRoot: Array.from(decodeBytes32(proof.batchRoot)),
    statisticsProof: proof.statisticsProof.map((value) => Array.from(decodeBytes32(value))),
    fixtureProof: proof.fixtureProof.map((value) => Array.from(decodeBytes32(value))),
    mainProof: proof.mainProof.map((value) => Array.from(decodeBytes32(value))),
  };
}
export function scoreProofDescriptor(input: {
  sourceId: string;
  timestamp: number;
  leafHash: Hex;
  rootHash: Hex;
  rawProof: unknown;
  network?: TxLineNetwork;
  verifiedAt?: number;
  verificationMode?: ProofAnchor["verificationMode"];
}): ProofAnchor {
  return {
    kind: "score",
    sourceId: input.sourceId,
    sourceTimestamp: input.timestamp,
    leafHash: input.leafHash,
    rootPda: deriveScoreRootPda(input.timestamp, input.network ?? "devnet").toBase58(),
    rootHash: input.rootHash,
    proofBundleHash: hashCanonical(input.rawProof),
    verifiedAt: input.verifiedAt ?? Date.now(),
    verificationMode: input.verificationMode ?? "local",
  };
}
export function oddsProofDescriptor(input: {
  sourceId: string;
  timestamp: number;
  leafHash: Hex;
  rootHash: Hex;
  rawProof: unknown;
  network?: TxLineNetwork;
  verifiedAt?: number;
  verificationMode?: ProofAnchor["verificationMode"];
}): ProofAnchor {
  return {
    kind: "odds",
    sourceId: input.sourceId,
    sourceTimestamp: input.timestamp,
    leafHash: input.leafHash,
    rootPda: deriveOddsRootPda(input.timestamp, input.network ?? "devnet").toBase58(),
    rootHash: input.rootHash,
    proofBundleHash: hashCanonical(input.rawProof),
    verifiedAt: input.verifiedAt ?? Date.now(),
    verificationMode: input.verificationMode ?? "local",
  };
}
