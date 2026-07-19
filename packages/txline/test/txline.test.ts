import { canonicalBytes } from "@match-dna/core";
import { describe, expect, it, vi } from "vitest";
import {
  buildMerkleTree,
  deriveOddsRootPda,
  deriveScoreRootPda,
  normalizeOddsPayload,
  normalizeScorePayload,
  parseSseChunk,
  proofNodes,
  TxLineClient,
  toAnchorScoreV2Payload,
  verifyMerkleProof,
} from "../src/index.js";

describe("txline", () => {
  it("derives stable distinct PDAs", () => {
    const t = Date.UTC(2026, 6, 18);
    expect(deriveScoreRootPda(t).equals(deriveScoreRootPda(t / 1000))).toBe(true);
    expect(deriveScoreRootPda(t).equals(deriveOddsRootPda(t))).toBe(false);
  });
  it("parses SSE chunks", () => {
    const out = parseSseChunk('id: 7\nevent: score\ndata: {"x":1}\n\npartial');
    expect(out.messages[0]).toMatchObject({ id: "7", event: "score", data: '{"x":1}' });
    expect(out.remainder).toBe("partial");
  });
  it("normalizes mixed casing", () => {
    expect(
      normalizeOddsPayload({
        FixtureId: 1,
        MessageId: "m",
        Timestamp: 1_700_000_000,
        Prices: [
          { Name: "1", Price: 2 },
          { Name: "Draw", Price: 4 },
          { Name: "2", Price: 4 },
        ],
      }).probabilities.home,
    ).toBeCloseTo(0.5);
    expect(
      normalizeScorePayload({
        FixtureId: 1,
        Sequence: 2,
        Timestamp: 1_700_000_000,
        Action: "game-finalised",
        Score: { home: 2, away: 1 },
      }).action,
    ).toBe("game_finalised");
  });
  it("builds and verifies Merkle paths", () => {
    const tree = buildMerkleTree([
      canonicalBytes({ a: 1 }),
      canonicalBytes({ b: 2 }),
      canonicalBytes({ c: 3 }),
    ]);
    tree.leaves.forEach((leaf, i) => {
      expect(verifyMerkleProof(leaf, tree.proofs[i]!, tree.root)).toBe(true);
    });
    expect(verifyMerkleProof(tree.leaves[0]!, tree.proofs[1]!, tree.root)).toBe(false);
  });
  it("converts V2 proof bytes", () => {
    const z = `0x${"00".repeat(32)}`;
    const payload = toAnchorScoreV2Payload({
      fixtureId: "8",
      sequence: 9,
      timestamp: 1_700_000_000,
      statKeys: [1, 2],
      statValues: [2, 1],
      statisticsRoot: z,
      fixtureRoot: z,
      batchRoot: z,
      statisticsProof: [z],
      fixtureProof: [z],
      mainProof: [z],
    });
    expect(payload.fixtureId).toBe(8n);
    expect(payload.statisticsRoot).toHaveLength(32);
  });
  it("sends credentials only in server client", async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      expect(h.get("authorization")).toBe("Bearer jwt");
      expect(h.get("x-api-token")).toBe("token");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = new TxLineClient({
      baseUrl: "https://example.test",
      credentials: { jwt: "jwt", apiToken: "token" },
      fetch: fetcher as typeof fetch,
    });
    await client.scoreProofV2(1, 2, [1, 2]);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("statKeys=1%2C2");
  });
});
