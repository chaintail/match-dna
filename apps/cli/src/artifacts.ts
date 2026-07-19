import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderCanonicalAudio } from "@match-dna/audio";
import { hashBytes, hashCanonical } from "@match-dna/core";
import {
  showcaseDeliveries,
  showcaseFixture,
  showcaseMoments,
  showcaseProofBundles,
  showcaseRecords,
  showcaseTimeline,
} from "@match-dna/fixtures";
import { renderCanonicalSvg } from "@match-dna/renderer";
import { verifyMerkleProof } from "@match-dna/txline";
export interface ArtifactIndex {
  schemaVersion: "match-dna-artifact-index@1";
  fixture: typeof showcaseFixture;
  timelineHash: string;
  proofBundleHash: string;
  canonicalAudioHash: string;
  canonicalMediaHash: string;
  files: Record<string, { sha256: string; bytes: number }>;
}
const encoder = new TextEncoder();
const CANONICAL_SVG_OPTIONS = {
  title: showcaseFixture.name,
  subtitle: "Liquid witness → amber memory → crystal proof",
} as const;
async function write(path: string, bytes: Uint8Array) {
  await writeFile(path, bytes);
  return { sha256: hashBytes(bytes), bytes: bytes.byteLength };
}
export async function generateDemoArtifacts(out: string): Promise<ArtifactIndex> {
  await mkdir(out, { recursive: true });
  const audio = renderCanonicalAudio(showcaseTimeline),
    media = renderCanonicalSvg(showcaseTimeline, CANONICAL_SVG_OPTIONS);
  const payloads: Record<string, Uint8Array> = {
    "timeline.json": encoder.encode(JSON.stringify(showcaseTimeline, null, 2)),
    "proofs.json": encoder.encode(JSON.stringify(showcaseProofBundles, null, 2)),
    "journal.json": encoder.encode(JSON.stringify(showcaseRecords, null, 2)),
    "deliveries.json": encoder.encode(JSON.stringify(showcaseDeliveries, null, 2)),
    "moments.json": encoder.encode(JSON.stringify(showcaseMoments, null, 2)),
    "canonical.wav": audio.wav,
    "canonical.svg": encoder.encode(media.svg),
  };
  const files: ArtifactIndex["files"] = {};
  for (const [name, bytes] of Object.entries(payloads))
    files[name] = await write(join(out, name), bytes);
  const index: ArtifactIndex = {
    schemaVersion: "match-dna-artifact-index@1",
    fixture: showcaseFixture,
    timelineHash: showcaseTimeline.timelineHash,
    proofBundleHash: hashCanonical(showcaseProofBundles),
    canonicalAudioHash: audio.hash,
    canonicalMediaHash: media.hash,
    files,
  };
  await writeFile(join(out, "artifact-index.json"), JSON.stringify(index, null, 2));
  return index;
}
export async function verifyDemoArtifacts(out?: string) {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  checks.push({
    name: "canonical ring hash chain",
    ok: showcaseTimeline.rings.every(
      (ring, index) =>
        index === 0 || ring.previousRingHash === showcaseTimeline.rings[index - 1]!.canonicalRingHash,
    ),
    detail: `${showcaseTimeline.rings.length} rings`,
  });
  checks.push({
    name: "synthetic proof vectors",
    ok: showcaseProofBundles.every(
      (bundle) =>
        verifyMerkleProof(bundle.odds.leaf, bundle.odds.proof, bundle.odds.root) &&
        verifyMerkleProof(bundle.score.leaf, bundle.score.proof, bundle.score.root),
    ),
    detail: `${showcaseProofBundles.length * 2} paths`,
  });
  checks.push({
    name: "finalised match state",
    ok:
      showcaseTimeline.finalState.finalised &&
      showcaseTimeline.finalState.score.home === 2 &&
      showcaseTimeline.finalState.score.away === 1,
    detail: "2-1",
  });
  const audio = renderCanonicalAudio(showcaseTimeline),
    media = renderCanonicalSvg(showcaseTimeline, CANONICAL_SVG_OPTIONS);
  checks.push({ name: "canonical audio", ok: audio.wav.byteLength > 44, detail: audio.hash });
  checks.push({ name: "canonical media", ok: media.svg.startsWith("<svg"), detail: media.hash });
  if (out) {
    try {
      const index = JSON.parse(
        await readFile(join(out, "artifact-index.json"), "utf8"),
      ) as ArtifactIndex;
      checks.push({
        name: "generated index",
        ok:
          index.timelineHash === showcaseTimeline.timelineHash &&
          index.canonicalAudioHash === audio.hash &&
          index.canonicalMediaHash === media.hash,
        detail: index.timelineHash,
      });
    } catch (error) {
      checks.push({
        name: "generated index",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}
