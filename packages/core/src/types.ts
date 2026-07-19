export type Hex = `0x${string}`;
export type SourceKind = "odds" | "score";
export type TeamSide = "home" | "draw" | "away";
export type MatchAction =
  | "kickoff"
  | "period_start"
  | "period_end"
  | "goal"
  | "possible_goal"
  | "goal_cancelled"
  | "yellow_card"
  | "red_card"
  | "corner"
  | "shot"
  | "var_start"
  | "var_end"
  | "game_finalised"
  | "heartbeat"
  | "unknown";
export interface ProbabilityVector {
  home: number;
  draw: number;
  away: number;
}
export interface MatchScore {
  home: number;
  away: number;
}
export interface MatchStats {
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homeCorners: number;
  awayCorners: number;
  homeShots: number;
  awayShots: number;
}
export interface NormalizedOddsRecord {
  kind: "odds";
  fixtureId: string;
  messageId: string;
  timestamp: number;
  market: string;
  inRunning: boolean;
  probabilities: ProbabilityVector;
  sourceLabel?: string;
}
export interface NormalizedScoreRecord {
  kind: "score";
  fixtureId: string;
  sequence: number;
  timestamp: number;
  action: MatchAction;
  statusId: number;
  period: number;
  score: MatchScore;
  stats: MatchStats;
  participant?: "home" | "away" | null;
  confirmed?: boolean;
}
export type NormalizedTxLineRecord = NormalizedOddsRecord | NormalizedScoreRecord;
export interface JournalRecord<T extends NormalizedTxLineRecord = NormalizedTxLineRecord> {
  source: SourceKind;
  fixtureId: string;
  sourceId: string;
  sourceTimestamp: number;
  receivedTimestamp: number;
  payloadHash: Hex;
  payload: T;
}
export interface JournalConflict {
  source: SourceKind;
  sourceId: string;
  hashes: Hex[];
}
export interface CanonicalJournal {
  records: JournalRecord[];
  conflicts: JournalConflict[];
  headHash: Hex;
}
export interface IntervalWindow {
  index: number;
  start: number;
  end: number;
  durationMs: number;
}
export interface CanonicalMatchState {
  fixtureId: string;
  timestamp: number;
  probabilities: ProbabilityVector;
  score: MatchScore;
  stats: MatchStats;
  statusId: number;
  period: number;
  finalised: boolean;
}
export interface SignalVector {
  uncertainty: number;
  fragility: number;
  drawThreat: number;
  volatility: number;
  shock: number;
  dominance: number;
}
export interface CanonicalGeometryParameters {
  baseRadius: number;
  radialVariance: number;
  branchDensity: number;
  scarDensity: number;
  spikeDensity: number;
  turbulence: number;
  asymmetry: number;
  membranePressure: number;
  eventPulse: number;
  phase: number;
}
export interface CanonicalAudioParameters {
  rootMidi: number;
  mode: "minor" | "dorian" | "mixolydian";
  tempo: number;
  density: number;
  dissonance: number;
  heartbeat: number;
  mutation: number;
}
export type ProofKind = "odds" | "score" | "fixture" | "synthetic";
export interface ProofAnchor {
  kind: ProofKind;
  sourceId: string;
  sourceTimestamp: number;
  leafHash: Hex;
  rootPda: string;
  rootHash: Hex;
  proofBundleHash: Hex;
  verifiedAt: number;
  verificationMode: "local" | "solana-view" | "transaction" | "synthetic";
  verificationTransaction?: string;
}
export type RingMaterial = "liquid" | "amber" | "crystal" | "quarantined";
export interface RingManifest {
  schemaVersion: "match-dna-ring@1";
  fixtureId: string;
  interval: IntervalWindow;
  ordinal: number;
  compilerVersion: string;
  selectionPolicyVersion: string;
  generatorVersion: string;
  previousRingHash: Hex;
  journalHeadHash: Hex;
  openingState: CanonicalMatchState;
  closingState: CanonicalMatchState;
  signals: SignalVector;
  geometry: CanonicalGeometryParameters;
  audio: CanonicalAudioParameters;
  eventCounts: Partial<Record<MatchAction, number>>;
  canonicalRingHash: Hex;
  material: RingMaterial;
  proofStatus: "pending" | "partial" | "verified" | "quarantined";
  proofAnchors: ProofAnchor[];
  proofFingerprint?: Hex;
  sealedRingHash?: Hex;
  quarantineReason?: string;
}
export interface TimelineManifest {
  schemaVersion: "match-dna-timeline@1";
  fixtureId: string;
  fixtureName: string;
  kickoffAt: number;
  compiledAt: number;
  compilerVersion: string;
  generatorVersion: string;
  rings: RingManifest[];
  timelineHash: Hex;
  finalState: CanonicalMatchState;
  canonicalAudioHash?: Hex;
  canonicalMediaHash?: Hex;
}
export interface WitnessCommitmentInput {
  fixtureId: string;
  wallet: string;
  allegiance: "home" | "away" | "neutral";
  lens: "hope" | "chaos" | "analyst" | "ultra";
  species: string;
  generatorVersion: string;
  secret: string;
}
export type WitnessTier = "genesis" | "first-half" | "late" | "replay";
