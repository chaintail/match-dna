import { bytesFromHex, type RingManifest } from "@match-dna/core";
export interface Point {
  x: number;
  y: number;
}
export interface RingGeometry {
  points: Point[];
  branches: Array<{ from: Point; to: Point; weight: number }>;
}
function rng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateRingGeometry(
  ring: RingManifest,
  width: number,
  height: number,
  resolution = 180,
): RingGeometry {
  if (width <= 0 || height <= 0 || resolution < 24) throw new TypeError("Invalid geometry dimensions");
  const bytes = bytesFromHex(ring.canonicalRingHash),
    random = rng(((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0),
    cx = width / 2,
    cy = height / 2,
    radius = Math.min(width, height) * ring.geometry.baseRadius,
    waves = 3 + Math.floor(random() * 5),
    phase = ring.geometry.phase * Math.PI * 2,
    points: Point[] = [];
  for (let i = 0; i < resolution; i++) {
    const angle = (i / resolution) * Math.PI * 2,
      dominance = 1 + ring.geometry.asymmetry * 0.08 * Math.cos(angle),
      membrane = ring.geometry.membranePressure * 0.05 * Math.cos(angle * 2 - phase),
      turbulence =
        Math.sin(angle * waves + phase) * ring.geometry.radialVariance * 0.45 +
        Math.sin(angle * (waves + 5) - phase * 1.7) * ring.geometry.radialVariance * 0.2,
      noise = (random() - 0.5) * ring.geometry.radialVariance * 0.08,
      r = radius * (dominance + membrane + turbulence + noise);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  const branches = Array.from({ length: Math.floor(1 + ring.geometry.branchDensity * 8) }, () => {
    const angle = random() * Math.PI * 2,
      start = radius * (0.72 + random() * 0.23),
      length = radius * (0.15 + random() * 0.45) * (0.45 + ring.geometry.eventPulse),
      turn = (random() - 0.5) * 0.35;
    return {
      from: { x: cx + Math.cos(angle) * start, y: cy + Math.sin(angle) * start },
      to: {
        x: cx + Math.cos(angle + turn) * (start + length),
        y: cy + Math.sin(angle + turn) * (start + length),
      },
      weight: 0.4 + random() * 1.6,
    };
  });
  return { points, branches };
}
export function pointsToSvgPath(points: readonly Point[]): string {
  const first = points[0];
  if (!first) return "";
  return `M ${first.x.toFixed(3)} ${first.y.toFixed(3)} ${points
    .slice(1)
    .map((p) => `L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
    .join(" ")} Z`;
}
