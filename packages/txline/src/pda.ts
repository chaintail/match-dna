import { PublicKey } from "@solana/web3.js";
import { TXLINE_CONFIGS, type TxLineNetwork } from "./config.js";
export type RootNamespace = "daily_scores_roots" | "daily_batch_roots" | "ten_daily_fixtures_roots";
export function normalizeTimestampSeconds(timestamp: number): number {
  if (!Number.isFinite(timestamp) || timestamp < 0)
    throw new TypeError("Timestamp must be a positive finite value");
  return timestamp > 100_000_000_000 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
}
export function epochDay(timestamp: number): number {
  return Math.floor(normalizeTimestampSeconds(timestamp) / 86_400);
}
function u16le(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 65_535)
    throw new RangeError("Root day seed exceeds u16");
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}
export function deriveRootPda(input: {
  namespace: RootNamespace;
  timestamp: number;
  programId: PublicKey;
}): PublicKey {
  const day = epochDay(input.timestamp);
  const bucket = input.namespace === "ten_daily_fixtures_roots" ? Math.floor(day / 10) * 10 : day;
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode(input.namespace), u16le(bucket)],
    input.programId,
  )[0];
}
export function deriveScoreRootPda(timestamp: number, network: TxLineNetwork = "devnet"): PublicKey {
  return deriveRootPda({
    namespace: "daily_scores_roots",
    timestamp,
    programId: TXLINE_CONFIGS[network].programId,
  });
}
export function deriveOddsRootPda(timestamp: number, network: TxLineNetwork = "devnet"): PublicKey {
  return deriveRootPda({
    namespace: "daily_batch_roots",
    timestamp,
    programId: TXLINE_CONFIGS[network].programId,
  });
}
export function deriveFixtureRootPda(timestamp: number, network: TxLineNetwork = "devnet"): PublicKey {
  return deriveRootPda({
    namespace: "ten_daily_fixtures_roots",
    timestamp,
    programId: TXLINE_CONFIGS[network].programId,
  });
}
