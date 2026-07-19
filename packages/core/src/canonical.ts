import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import type { Hex } from "./types.js";

const encoder = new TextEncoder();
function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON cannot encode non-finite numbers");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "bigint") return value.toString(10);
  if (value instanceof Uint8Array) return Array.from(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    );
  throw new TypeError(`Canonical JSON cannot encode ${typeof value}`);
}
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}
export function canonicalBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalStringify(value));
}
export function hexFromBytes(bytes: Uint8Array): Hex {
  return `0x${bytesToHex(bytes)}`;
}
export function bytesFromHex(value: string): Uint8Array {
  const raw = value.startsWith("0x") ? value.slice(2) : value;
  if (raw.length % 2 || !/^[0-9a-f]*$/i.test(raw)) throw new TypeError("Invalid hexadecimal value");
  return hexToBytes(raw);
}
export function hashBytes(bytes: Uint8Array): Hex {
  return hexFromBytes(sha256(bytes));
}
export function hashCanonical(value: unknown): Hex {
  return hashBytes(canonicalBytes(value));
}
export function hashParts(...parts: Array<string | Uint8Array>): Hex {
  return hexFromBytes(
    sha256(
      concatBytes(...parts.map((part) => (typeof part === "string" ? encoder.encode(part) : part))),
    ),
  );
}
export const ZERO_HASH: Hex = `0x${"00".repeat(32)}`;
