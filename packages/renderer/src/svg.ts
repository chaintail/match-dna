import { hashBytes, type RingManifest, type TimelineManifest } from "@match-dna/core";
import { generateRingGeometry, pointsToSvgPath } from "./geometry.js";

const encoder = new TextEncoder();
const escapeXml = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const color = (r: RingManifest) =>
  r.material === "crystal"
    ? "#cffff4"
    : r.material === "amber"
      ? "#ffb955"
      : r.material === "quarantined"
        ? "#ff547b"
        : "#75ddff";
export function renderCanonicalSvg(
  timeline: TimelineManifest,
  options: { width?: number; height?: number; title?: string; subtitle?: string } = {},
): { svg: string; hash: `0x${string}` } {
  const width = options.width ?? 1600,
    height = options.height ?? 1600;
  if (width < 320 || height < 320) throw new TypeError("Canonical SVG must be at least 320px");
  const title = options.title ?? timeline.fixtureName,
    subtitle = options.subtitle ?? "A canonical match memory";
  const rings = timeline.rings
    .map((ring, index) => {
      const geometry = generateRingGeometry(ring, width, height, 240),
        stroke = color(ring),
        path = pointsToSvgPath(geometry.points),
        opacity = (0.35 + (index / Math.max(1, timeline.rings.length - 1)) * 0.62).toFixed(3),
        branches = geometry.branches
          .map(
            (branch) =>
              `<line x1="${branch.from.x.toFixed(3)}" y1="${branch.from.y.toFixed(3)}" x2="${branch.to.x.toFixed(3)}" y2="${branch.to.y.toFixed(3)}" stroke="${stroke}" stroke-width="${branch.weight.toFixed(2)}" opacity=".44"/>`,
          )
          .join("");
      return `<g data-ring="${ring.ordinal}" data-hash="${ring.canonicalRingHash}"><path d="${path}" fill="none" stroke="${stroke}" stroke-width="2" opacity="${opacity}" filter="url(#glow)"/>${branches}</g>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(subtitle)}</desc><defs><radialGradient id="bg"><stop offset="0" stop-color="#17233f"/><stop offset=".48" stop-color="#080d1c"/><stop offset="1" stop-color="#02040a"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100%" height="100%" fill="url(#bg)"/>${rings}<g font-family="monospace" fill="#eef8ff"><text x="72" y="96" font-size="26" letter-spacing="8" opacity=".72">MATCH DNA / CANONICAL</text><text x="72" y="146" font-size="36" font-weight="650">${escapeXml(title)}</text><text x="72" y="190" font-size="22" opacity=".62">${escapeXml(subtitle)}</text><text x="72" y="${height - 86}" font-size="24">${timeline.finalState.score.home} — ${timeline.finalState.score.away}</text><text x="${width - 72}" y="${height - 86}" font-size="17" text-anchor="end" opacity=".55">${timeline.timelineHash.slice(0, 22)}…</text></g></svg>`;
  return { svg, hash: hashBytes(encoder.encode(svg)) };
}
