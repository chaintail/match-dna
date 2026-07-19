import type { RingMaterial } from "@match-dna/core";
export const formatMinute = (minute: number) =>
  minute < 0
    ? "PRE"
    : Math.floor(minute) <= 90
      ? `${Math.floor(minute)}′`
      : `90+${Math.floor(minute) - 90}′`;
export const formatProbability = (value: number) => `${Math.round(value * 100)}%`;
export const shortHash = (value: string, size = 8) =>
  value.length <= size * 2 + 3 ? value : `${value.slice(0, size + 2)}…${value.slice(-size)}`;
export const materialLabel = (material: RingMaterial) =>
  material === "liquid"
    ? "Witnessing"
    : material === "amber"
      ? "Canonical / awaiting proof"
      : material === "crystal"
        ? "Proven on Solana"
        : "Quarantined";
