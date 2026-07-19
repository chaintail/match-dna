import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDemoArtifacts, verifyDemoArtifacts } from "../src/artifacts.js";

describe("artifact CLI", () => {
  it("generates and verifies complete artifacts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "match-dna-"));
    try {
      const index = await generateDemoArtifacts(dir),
        result = await verifyDemoArtifacts(dir);
      expect(result.ok).toBe(true);
      expect(index.files["canonical.wav"]?.bytes).toBeGreaterThan(44);
      expect(await readFile(join(dir, "canonical.svg"), "utf8")).toContain("<svg");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
