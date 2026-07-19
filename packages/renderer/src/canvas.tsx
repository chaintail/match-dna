import type { RingManifest } from "@match-dna/core";
import { type MouseEvent, useEffect, useRef } from "react";
import { generateRingGeometry } from "./geometry.js";

const styles = {
  liquid: { stroke: "rgba(116,221,255,.78)", glow: "rgba(73,189,255,.35)" },
  amber: { stroke: "rgba(255,185,85,.94)", glow: "rgba(255,151,55,.3)" },
  crystal: { stroke: "rgba(207,255,244,.98)", glow: "rgba(131,255,228,.4)" },
  quarantined: { stroke: "rgba(255,84,123,.94)", glow: "rgba(255,47,91,.4)" },
} as const;
function trace(ctx: CanvasRenderingContext2D, points: readonly { x: number; y: number }[]) {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
}
export function drawMatchDnaScene(
  ctx: CanvasRenderingContext2D,
  input: {
    width: number;
    height: number;
    timeSeconds: number;
    rings: readonly RingManifest[];
    liveRing?: RingManifest;
    selectedRingIndex?: number;
  },
) {
  const g = ctx.createRadialGradient(
    input.width * 0.5,
    input.height * 0.45,
    0,
    input.width * 0.5,
    input.height * 0.5,
    Math.max(input.width, input.height) * 0.72,
  );
  g.addColorStop(0, "#17233f");
  g.addColorStop(0.46, "#080d1c");
  g.addColorStop(1, "#02040a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, input.width, input.height);
  const draw = (ring: RingManifest, selected: boolean) => {
    const geometry = generateRingGeometry(ring, input.width, input.height),
      style = styles[ring.material];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = (ring.material === "crystal" ? 2 : 1.5) + (selected ? 1.4 : 0);
    ctx.globalAlpha = 0.4 + ring.ordinal / 28;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = selected ? 25 : 11;
    trace(ctx, geometry.points);
    ctx.stroke();
    if (ring.material === "crystal") {
      ctx.setLineDash([1.5, 7]);
      ctx.lineDashOffset = -input.timeSeconds * 7;
      ctx.strokeStyle = "rgba(255,255,255,.82)";
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = selected ? 0.85 : 0.35;
    for (const branch of geometry.branches) {
      ctx.lineWidth = branch.weight;
      ctx.beginPath();
      ctx.moveTo(branch.from.x, branch.from.y);
      ctx.lineTo(branch.to.x, branch.to.y);
      ctx.stroke();
    }
    ctx.restore();
  };
  input.rings.forEach((ring, index) => {
    draw(ring, input.selectedRingIndex === index);
  });
  if (input.liveRing) {
    const wobble = 1 + Math.sin(input.timeSeconds * 2.4) * 0.007;
    ctx.save();
    ctx.translate(input.width / 2, input.height / 2);
    ctx.scale(wobble, wobble);
    ctx.translate(-input.width / 2, -input.height / 2);
    draw({ ...input.liveRing, material: "liquid" }, false);
    ctx.restore();
  }
}
export interface MatchDnaCanvasProps {
  rings: readonly RingManifest[];
  liveRing?: RingManifest;
  selectedRingIndex?: number;
  className?: string;
  onRingSelect?: (index: number) => void;
}
export function MatchDnaCanvas({
  rings,
  liveRing,
  selectedRingIndex,
  className,
  onRingSelect,
}: MatchDnaCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null),
    frame = useRef<number | null>(null),
    started = useRef(typeof performance === "undefined" ? 0 : performance.now());
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const render = () => {
      const b = canvas.getBoundingClientRect(),
        ratio = Math.min(window.devicePixelRatio || 1, 2),
        w = Math.max(1, Math.floor(b.width * ratio)),
        h = Math.max(1, Math.floor(b.height * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawMatchDnaScene(ctx, {
        width: b.width,
        height: b.height,
        timeSeconds: (performance.now() - started.current) / 1000,
        rings,
        ...(liveRing ? { liveRing } : {}),
        ...(selectedRingIndex === undefined ? {} : { selectedRingIndex }),
      });
      frame.current = requestAnimationFrame(render);
    };
    frame.current = requestAnimationFrame(render);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [rings, liveRing, selectedRingIndex]);
  const select = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!onRingSelect || !rings.length) return;
    const b = event.currentTarget.getBoundingClientRect(),
      distance = Math.hypot(event.clientX - b.left - b.width / 2, event.clientY - b.top - b.height / 2),
      base = Math.min(b.width, b.height);
    let closest = 0,
      best = Infinity;
    rings.forEach((ring, index) => {
      const d = Math.abs(distance - base * ring.geometry.baseRadius);
      if (d < best) {
        best = d;
        closest = index;
      }
    });
    onRingSelect(closest);
  };
  return (
    <canvas ref={ref} className={className} aria-label="Living Match DNA organism" onClick={select} />
  );
}
