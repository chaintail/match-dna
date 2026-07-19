import type { MatchScore, ProbabilityVector, SignalVector, TeamSide } from "./types.js";

const EPSILON = 1e-6;
export function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}
export function normalizeProbabilities(input: ProbabilityVector): ProbabilityVector {
  const values = [input.home, input.draw, input.away].map((value) =>
    Number.isFinite(value) ? Math.max(value, EPSILON) : EPSILON,
  );
  const sum = values.reduce((total, value) => total + value, 0);
  return { home: values[0]! / sum, draw: values[1]! / sum, away: values[2]! / sum };
}
export function normalizedEntropy(input: ProbabilityVector): number {
  const probabilities = Object.values(normalizeProbabilities(input));
  return clamp(-probabilities.reduce((sum, p) => sum + p * Math.log(p), 0) / Math.log(3));
}
export function currentResultClass(score: MatchScore): TeamSide {
  return score.home > score.away ? "home" : score.away > score.home ? "away" : "draw";
}
export function timeScaledFragility(
  probabilities: ProbabilityVector,
  score: MatchScore,
  elapsedMinutes: number,
  scheduledMinutes = 90,
): number {
  const p = normalizeProbabilities(probabilities)[currentResultClass(score)];
  const hazard =
    -Math.log(clamp(p, EPSILON, 1 - EPSILON)) / Math.max(scheduledMinutes - elapsedMinutes, 1);
  return clamp(1 - Math.exp(-hazard * 20));
}
export function drawThreat(
  probabilities: ProbabilityVector,
  score: MatchScore,
  elapsedMinutes: number,
): number {
  if (Math.abs(score.home - score.away) !== 1) return 0;
  return clamp(normalizeProbabilities(probabilities).draw * (0.35 + 1.25 * clamp(elapsedMinutes / 90)));
}
function logit(p: number): number {
  const value = clamp(p, EPSILON, 1 - EPSILON);
  return Math.log(value / (1 - value));
}
export function rawProbabilityShock(previous: ProbabilityVector, current: ProbabilityVector): number {
  const a = normalizeProbabilities(previous);
  const b = normalizeProbabilities(current);
  const diffs = (["home", "draw", "away"] as TeamSide[]).map((key) => logit(b[key]) - logit(a[key]));
  return Math.sqrt(diffs.reduce((sum, value) => sum + value * value, 0));
}
export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
export function safeProbabilityShock(
  previous: ProbabilityVector,
  current: ProbabilityVector,
  recent: readonly number[] = [],
  eventAmplifier = 1,
): number {
  const raw = rawProbabilityShock(previous, current);
  const center = median(recent);
  const mad = median(recent.map((value) => Math.abs(value - center)));
  const robustCap = recent.length >= 4 ? center + 6 * Math.max(mad, 0.02) : Number.POSITIVE_INFINITY;
  return clamp(Math.tanh(Math.min(raw, robustCap, 4 * Math.min(eventAmplifier, 1.75)) / 1.25));
}
export function computeSignals(input: {
  probabilities: ProbabilityVector;
  previousProbabilities: ProbabilityVector;
  score: MatchScore;
  elapsedMinutes: number;
  previousVolatility: number;
  recentRawShocks?: readonly number[];
  eventAmplifier?: number;
}): SignalVector {
  const shock = safeProbabilityShock(
    input.previousProbabilities,
    input.probabilities,
    input.recentRawShocks ?? [],
    input.eventAmplifier ?? 1,
  );
  return {
    uncertainty: normalizedEntropy(input.probabilities),
    fragility: timeScaledFragility(input.probabilities, input.score, input.elapsedMinutes),
    drawThreat: drawThreat(input.probabilities, input.score, input.elapsedMinutes),
    volatility: clamp(0.25 * shock + 0.75 * input.previousVolatility),
    shock,
    dominance: clamp(
      normalizeProbabilities(input.probabilities).home -
        normalizeProbabilities(input.probabilities).away,
      -1,
      1,
    ),
  };
}
