import { canonicalBytes, hashBytes } from "./canonical.js";
import type { Hex, WitnessCommitmentInput, WitnessTier } from "./types.js";
export const WITNESS_DOMAIN = "MATCH_DNA_WITNESS_V1";
export function witnessCommitmentPreimage(input: WitnessCommitmentInput): Uint8Array {
  if (input.secret.length < 16)
    throw new TypeError("Witness secret must contain at least 16 characters");
  return canonicalBytes({ domain: WITNESS_DOMAIN, ...input });
}
export function createWitnessCommitment(input: WitnessCommitmentInput): Hex {
  return hashBytes(witnessCommitmentPreimage(input));
}
export function derivePhenotypeSeed(input: {
  secret: string;
  fixtureId: string;
  generatorVersion: string;
  finalScoreLeafHash: Hex;
  finalOddsLeafHash: Hex;
}): Hex {
  return hashBytes(canonicalBytes({ domain: "MATCH_DNA_PHENOTYPE_V1", ...input }));
}
export function witnessTier(
  committedAt: number,
  kickoffAt: number,
  finalWhistleAt: number,
): WitnessTier {
  if (committedAt <= kickoffAt) return "genesis";
  if (committedAt <= kickoffAt + 45 * 60_000) return "first-half";
  if (committedAt <= finalWhistleAt) return "late";
  return "replay";
}
export type RingLifecycleState = import("./types.js").RingMaterial | "reconciling";
const transitions: Record<RingLifecycleState, readonly RingLifecycleState[]> = {
  liquid: ["reconciling", "quarantined"],
  reconciling: ["amber", "quarantined"],
  amber: ["crystal", "quarantined"],
  crystal: [],
  quarantined: [],
};
export function transitionRing(
  current: RingLifecycleState,
  next: RingLifecycleState,
): RingLifecycleState {
  if (!transitions[current].includes(next))
    throw new Error(`Invalid ring transition: ${current} -> ${next}`);
  return next;
}
