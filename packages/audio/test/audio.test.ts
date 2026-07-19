import { showcaseTimeline } from "@match-dna/fixtures";
import { describe, expect, it } from "vitest";
import { encodePcm16Wav, renderCanonicalAudio } from "../src/index.js";

describe("audio", () => {
  it("is bit-identical", () => {
    const options = { sampleRate: 8000, secondsPerRing: 0.05, proofCodaSeconds: 0.1 };
    const a = renderCanonicalAudio(showcaseTimeline, options),
      b = renderCanonicalAudio(showcaseTimeline, options);
    expect(a.hash).toBe(b.hash);
    expect(a.wav).toEqual(b.wav);
  });
  it("has RIFF/WAVE headers", () => {
    const out = renderCanonicalAudio(showcaseTimeline, {
      sampleRate: 8000,
      secondsPerRing: 0.02,
      proofCodaSeconds: 0.03,
    });
    expect(new TextDecoder().decode(out.wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(out.wav.slice(8, 12))).toBe("WAVE");
  });
  it("rejects malformed channels", () =>
    expect(() => encodePcm16Wav(new Float32Array([0, 1, 0]), { sampleRate: 8000, channels: 2 })).toThrow(
      /divisible/,
    ));
});
