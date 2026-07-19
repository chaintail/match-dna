import {
  bytesFromHex,
  createWitnessCommitment,
  type Hex,
  hashCanonical,
  type TimelineManifest,
  type WitnessCommitmentInput,
  witnessCommitmentPreimage,
} from "@match-dna/core";
import { TXLINE_CONFIGS, type TxLineNetwork } from "@match-dna/txline";
import { type AccountMeta, PublicKey } from "@solana/web3.js";
export const MATCH_DNA_PROGRAM_ID = new PublicKey("CuNH1eDimEDxxgomwG7VzYd9RDdiKPVkTBjXWeg9jkVF");
export function fixtureHash(fixtureId: string): Uint8Array {
  return bytesFromHex(hashCanonical({ domain: "MATCH_DNA_FIXTURE_V1", fixtureId }));
}
export function deriveWitnessPda(
  owner: PublicKey,
  fixtureId: string,
  programId = MATCH_DNA_PROGRAM_ID,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("witness"), owner.toBytes(), fixtureHash(fixtureId)],
    programId,
  )[0];
}
export function deriveGenomePda(witness: PublicKey, programId = MATCH_DNA_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("genome"), witness.toBytes()],
    programId,
  )[0];
}
export function buildWitnessCommitmentEnvelope(
  input: WitnessCommitmentInput,
  owner: PublicKey,
  programId = MATCH_DNA_PROGRAM_ID,
) {
  if (input.wallet !== owner.toBase58())
    throw new TypeError("Witness commitment wallet must match the signing owner");
  const witnessPda = deriveWitnessPda(owner, input.fixtureId, programId);
  return {
    commitment: createWitnessCommitment(input),
    preimage: witnessCommitmentPreimage(input),
    fixtureHash: fixtureHash(input.fixtureId),
    witnessPda,
    genomePda: deriveGenomePda(witnessPda, programId),
  };
}
export interface GenomeSealHashes {
  timelineHash: Hex;
  proofBundleHash: Hex;
  finalStateHash: Hex;
  canonicalAudioHash: Hex;
  canonicalMediaHash: Hex;
}
export function genomeSealHashes(
  timeline: TimelineManifest,
  proofBundleHash: Hex,
  canonicalAudioHash: Hex,
  canonicalMediaHash: Hex,
): GenomeSealHashes {
  return {
    timelineHash: timeline.timelineHash,
    proofBundleHash,
    finalStateHash: hashCanonical(timeline.finalState),
    canonicalAudioHash,
    canonicalMediaHash,
  };
}
export function rawTxLineCpiAccounts(
  network: TxLineNetwork,
  txlineRoot: PublicKey,
): { txlineProgram: PublicKey; txlineRoot: PublicKey; accountMetas: AccountMeta[] } {
  return {
    txlineProgram: TXLINE_CONFIGS[network].programId,
    txlineRoot,
    accountMetas: [{ pubkey: txlineRoot, isSigner: false, isWritable: false }],
  };
}
