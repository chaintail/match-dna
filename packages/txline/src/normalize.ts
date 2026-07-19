import {
  type MatchAction,
  type MatchStats,
  type NormalizedOddsRecord,
  type NormalizedScoreRecord,
  normalizeProbabilities,
} from "@match-dna/core";

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}
function first(source: Record<string, any>, ...keys: string[]): any {
  for (const key of keys) if (source[key] !== undefined && source[key] !== null) return source[key];
}
function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function timestampValue(value: unknown): number {
  const parsed = numberValue(value);
  return parsed > 100_000_000_000 ? parsed : parsed * 1000;
}
function action(value: unknown): MatchAction {
  const normalized = String(value ?? "unknown")
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
  const allowed: MatchAction[] = [
    "kickoff",
    "period_start",
    "period_end",
    "goal",
    "possible_goal",
    "goal_cancelled",
    "yellow_card",
    "red_card",
    "corner",
    "shot",
    "var_start",
    "var_end",
    "game_finalised",
    "heartbeat",
    "unknown",
  ];
  return allowed.includes(normalized as MatchAction) ? (normalized as MatchAction) : "unknown";
}
const emptyStats = (): MatchStats => ({
  homeYellowCards: 0,
  awayYellowCards: 0,
  homeRedCards: 0,
  awayRedCards: 0,
  homeCorners: 0,
  awayCorners: 0,
  homeShots: 0,
  awayShots: 0,
});
function pricesFrom(payload: Record<string, any>): { home: number; draw: number; away: number } {
  const direct = first(payload, "probabilities", "Percentages", "percentages");
  if (direct && !Array.isArray(direct)) {
    const d = record(direct);
    return normalizeProbabilities({
      home: numberValue(first(d, "home", "participant1", "1")),
      draw: numberValue(first(d, "draw", "x", "2")),
      away: numberValue(first(d, "away", "participant2", "3")),
    });
  }
  const prices = first(payload, "prices", "Prices", "selections", "Selections");
  if (Array.isArray(prices)) {
    const map: Record<string, number> = {};
    for (const item of prices) {
      const row = record(item);
      const name = String(first(row, "name", "Name", "priceName", "PriceName") ?? "").toLowerCase();
      const percentage = numberValue(
        first(row, "percentage", "Percentage", "probability", "Probability"),
      );
      const decimal = numberValue(first(row, "price", "Price", "decimal", "Decimal"));
      const p =
        percentage > 1 ? percentage / 100 : percentage > 0 ? percentage : decimal > 0 ? 1 / decimal : 0;
      if (name.includes("draw") || name === "x") map.draw = p;
      else if (name.includes("home") || name.includes("participant 1") || name === "1") map.home = p;
      else if (name.includes("away") || name.includes("participant 2") || name === "2") map.away = p;
    }
    return normalizeProbabilities({
      home: map.home ?? 1 / 3,
      draw: map.draw ?? 1 / 3,
      away: map.away ?? 1 / 3,
    });
  }
  return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
}
export function normalizeOddsPayload(input: unknown): NormalizedOddsRecord {
  const p = record(input);
  return {
    kind: "odds",
    fixtureId: String(first(p, "fixtureId", "FixtureId", "fixture_id")),
    messageId: String(first(p, "messageId", "MessageId", "id", "Id")),
    timestamp: timestampValue(first(p, "timestamp", "Timestamp", "createdAt", "CreatedAt")),
    market: String(first(p, "market", "Market", "superOddsType", "SuperOddsType") ?? "match_result"),
    inRunning: Boolean(first(p, "inRunning", "InRunning", "isInPlay", "IsInPlay")),
    probabilities: pricesFrom(p),
    ...(first(p, "source", "Source") ? { sourceLabel: String(first(p, "source", "Source")) } : {}),
  };
}
export function normalizeScorePayload(input: unknown): NormalizedScoreRecord {
  const p = record(input);
  const score = record(first(p, "score", "Score"));
  const statsInput = record(first(p, "stats", "Stats", "statistics", "Statistics"));
  const stats = {
    ...emptyStats(),
    homeYellowCards: numberValue(first(statsInput, "homeYellowCards", "3")),
    awayYellowCards: numberValue(first(statsInput, "awayYellowCards", "4")),
    homeRedCards: numberValue(first(statsInput, "homeRedCards", "5")),
    awayRedCards: numberValue(first(statsInput, "awayRedCards", "6")),
    homeCorners: numberValue(first(statsInput, "homeCorners", "7")),
    awayCorners: numberValue(first(statsInput, "awayCorners", "8")),
    homeShots: numberValue(first(statsInput, "homeShots")),
    awayShots: numberValue(first(statsInput, "awayShots")),
  };
  const homeScore = first(score, "home", "participant1", "1") ?? first(p, "homeScore", "HomeScore");
  const awayScore = first(score, "away", "participant2", "2") ?? first(p, "awayScore", "AwayScore");
  const participant = first(p, "participant", "Participant");
  const confirmed = first(p, "confirmed", "Confirmed");
  return {
    kind: "score",
    fixtureId: String(first(p, "fixtureId", "FixtureId", "fixture_id")),
    sequence: numberValue(first(p, "sequence", "Sequence", "seq", "Seq")),
    timestamp: timestampValue(first(p, "timestamp", "Timestamp", "createdAt", "CreatedAt")),
    action: action(first(p, "action", "Action", "type", "Type")),
    statusId: numberValue(first(p, "statusId", "StatusId", "status_id")),
    period: numberValue(first(p, "period", "Period")),
    score: {
      home: numberValue(homeScore),
      away: numberValue(awayScore),
    },
    stats,
    participant:
      participant === 1 || participant === "1" || participant === "home"
        ? "home"
        : participant === 2 || participant === "2" || participant === "away"
          ? "away"
          : null,
    confirmed: confirmed === undefined ? true : Boolean(confirmed),
  };
}
