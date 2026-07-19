import { showcaseTimeline } from "@match-dna/fixtures";
import { describe, expect, it } from "vitest";
import { generateRingGeometry, renderCanonicalSvg } from "../src/index.js";

describe("renderer", () => {
  it("generates deterministic geometry", () => {
    const ring = showcaseTimeline.rings[8]!;
    expect(generateRingGeometry(ring, 800, 800)).toEqual(generateRingGeometry(ring, 800, 800));
  });
  it("renders stable SVG", () => {
    const a = renderCanonicalSvg(showcaseTimeline, { width: 800, height: 800 }),
      b = renderCanonicalSvg(showcaseTimeline, { width: 800, height: 800 });
    expect(a.hash).toBe(b.hash);
    expect(a.svg).toBe(b.svg);
    expect(a.svg).toContain(showcaseTimeline.timelineHash.slice(0, 22));
  });
});
