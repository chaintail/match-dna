import { bytesFromHex, type Hex, hexFromBytes } from "@match-dna/core";
import { sha256 } from "@noble/hashes/sha256";
import { concatBytes } from "@noble/hashes/utils";
export interface MerkleProofNode {
  hash: Hex;
  position: "left" | "right";
}
export function decodeBytes32(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    if (value.length !== 32) throw new TypeError("Expected bytes32");
    return value;
  }
  if (Array.isArray(value)) {
    const bytes = Uint8Array.from(value as number[]);
    if (bytes.length !== 32) throw new TypeError("Expected bytes32");
    return bytes;
  }
  if (typeof value !== "string") throw new TypeError("Unsupported bytes32 value");
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(value)) return bytesFromHex(value);
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length !== 32) throw new TypeError("Expected bytes32");
  return bytes;
}
export function hashPair(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concatBytes(left, right));
}
export function verifyMerkleProof(
  leaf: Hex | Uint8Array,
  proof: readonly MerkleProofNode[],
  root: Hex | Uint8Array,
): boolean {
  let value = typeof leaf === "string" ? bytesFromHex(leaf) : leaf;
  for (const node of proof) {
    const sibling = bytesFromHex(node.hash);
    value = node.position === "left" ? hashPair(sibling, value) : hashPair(value, sibling);
  }
  const expected = typeof root === "string" ? bytesFromHex(root) : root;
  return expected.every((byte, index) => byte === value[index]);
}
export interface BuiltMerkleTree {
  root: Hex;
  proofs: MerkleProofNode[][];
  leaves: Hex[];
}
export function buildMerkleTree(rawLeaves: readonly Uint8Array[]): BuiltMerkleTree {
  if (!rawLeaves.length) throw new TypeError("At least one leaf required");
  const leaves = rawLeaves.map((leaf) => sha256(leaf));
  const proofs = leaves.map(() => [] as MerkleProofNode[]);
  let layer = leaves.map((hash, index) => ({ hash, indexes: [index] }));
  while (layer.length > 1) {
    const next: typeof layer = [];
    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index]!;
      const right = layer[index + 1] ?? left;
      for (const leafIndex of left.indexes)
        proofs[leafIndex]!.push({ hash: hexFromBytes(right.hash), position: "right" });
      for (const leafIndex of right.indexes)
        if (right !== left) proofs[leafIndex]!.push({ hash: hexFromBytes(left.hash), position: "left" });
      next.push({
        hash: hashPair(left.hash, right.hash),
        indexes: right === left ? [...left.indexes] : [...left.indexes, ...right.indexes],
      });
    }
    layer = next;
  }
  return { root: hexFromBytes(layer[0]!.hash), proofs, leaves: leaves.map(hexFromBytes) };
}
export function proofNodes(
  nodes: readonly { hash: unknown; position?: string; side?: string }[],
): MerkleProofNode[] {
  return nodes.map((node) => ({
    hash: hexFromBytes(decodeBytes32(node.hash)),
    position: (node.position ?? node.side)?.toLowerCase() === "left" ? "left" : "right",
  }));
}
