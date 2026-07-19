import { playWitnessTone } from "@match-dna/audio";
import {
  createWitnessCommitment,
  derivePhenotypeSeed,
  GENERATOR_VERSION,
  type RingManifest,
  witnessTier,
} from "@match-dna/core";
import {
  showcaseFixture,
  showcaseMoments,
  showcaseProofBundles,
  showcaseTimeline,
} from "@match-dna/fixtures";
import { MatchDnaCanvas } from "@match-dna/renderer";
import {
  Activity,
  BadgeCheck,
  Download,
  Fingerprint,
  FlaskConical,
  Gauge,
  Headphones,
  Pause,
  Play,
  RefreshCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMinute, formatProbability, materialLabel, shortHash } from "./lib.js";
import { useReplay } from "./useReplay.js";
import "./styles.css";

type Panel = "signals" | "proof" | "witness";
const DEMO_WALLET = "AKSqARa6atSTAPoMtFiUKJgSBqcnygiJJEnrzmZhmHq6";
function Meter({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <strong>{Math.round(value * 100)}</strong>
      </div>
      <i>
        <b style={{ width: `${Math.max(2, value * 100)}%` }} />
      </i>
      <small>{note}</small>
    </div>
  );
}
function Material({ material }: { material: RingManifest["material"] }) {
  return (
    <span className={`material material--${material}`}>
      <i />
      {materialLabel(material)}
    </span>
  );
}
export default function App() {
  const replay = useReplay(),
    { snapshot } = replay,
    [selected, setSelected] = useState(0),
    [panel, setPanel] = useState<Panel>("signals"),
    [sound, setSound] = useState(false),
    crystals = useRef(0),
    [allegiance, setAllegiance] = useState<"home" | "away" | "neutral">("home"),
    [lens, setLens] = useState<"hope" | "chaos" | "analyst" | "ultra">("hope"),
    [species, setSpecies] = useState("crystal-mycelium"),
    [secret, setSecret] = useState("aurora-witness-seed-2026"),
    [commitment, setCommitment] = useState<string | null>(null),
    [committedAt, setCommittedAt] = useState<number | null>(null);
  useEffect(() => {
    const latest = Math.max(0, snapshot.canonicalRings.length - 1);
    if (latest > selected) setSelected(latest);
  }, [snapshot.canonicalRings.length, selected]);
  useEffect(() => {
    const count = snapshot.canonicalRings.filter((r) => r.material === "crystal").length;
    if (sound && count > crystals.current) {
      const ring = snapshot.canonicalRings.at(-1);
      if (ring) void playWitnessTone(ring, { durationMs: 240, gain: 0.045 });
    }
    crystals.current = count;
  }, [snapshot.canonicalRings, sound]);
  const ring =
      snapshot.canonicalRings[selected] ??
      (snapshot.liveRing?.ordinal === selected ? snapshot.liveRing : undefined) ??
      showcaseTimeline.rings[selected],
    proof = showcaseProofBundles.find((b) => b.ringIndex === ring?.interval.index),
    proofReady = proof ? snapshot.now >= proof.availableAt : false,
    counts = useMemo(
      () => ({
        crystal: snapshot.canonicalRings.filter((r) => r.material === "crystal").length,
        amber: snapshot.canonicalRings.filter((r) => r.material === "amber").length,
        liquid: snapshot.liveRing ? 1 : 0,
      }),
      [snapshot.canonicalRings, snapshot.liveRing],
    );
  const commit = () => {
    setCommitment(
      createWitnessCommitment({
        fixtureId: showcaseFixture.id,
        wallet: DEMO_WALLET,
        allegiance,
        lens,
        species,
        generatorVersion: GENERATOR_VERSION,
        secret,
      }),
    );
    setCommittedAt(snapshot.now);
  };
  const phenotype =
    commitment && snapshot.currentState.finalised
      ? derivePhenotypeSeed({
          secret,
          fixtureId: showcaseFixture.id,
          generatorVersion: GENERATOR_VERSION,
          finalScoreLeafHash: showcaseProofBundles.at(-1)!.score.anchor.leafHash,
          finalOddsLeafHash: showcaseProofBundles.at(-1)!.odds.anchor.leafHash,
        })
      : null;
  return (
    <main className="shell">
      <header>
        <div className="brand">
          <b>
            <Waves size={18} />
          </b>
          <div>
            <strong>MATCH DNA</strong>
            <span>living, verifiable match memory</span>
          </div>
        </div>
        <nav>
          <span className="network">
            <i />
            OFFLINE PROOF REPLAY
          </span>
          <span>TxLINE × Solana</span>
        </nav>
      </header>
      <section className="hero">
        <article className="stage glass">
          <div className="stageHead">
            <div>
              <span className="eyebrow">{showcaseFixture.competition} · synthetic fixture</span>
              <h1>
                {showcaseFixture.home}
                <em>vs</em>
                {showcaseFixture.away}
              </h1>
            </div>
            <Material
              material={
                snapshot.liveRing ? "liquid" : (snapshot.canonicalRings.at(-1)?.material ?? "amber")
              }
            />
          </div>
          <div className="organism">
            <MatchDnaCanvas
              rings={snapshot.canonicalRings}
              liveRing={snapshot.liveRing}
              selectedRingIndex={selected}
              className="canvas"
              onRingSelect={setSelected}
            />
            <div className="score">
              <span>{formatMinute(snapshot.currentMinute)}</span>
              <strong>
                {snapshot.currentState.score.home}
                <i>—</i>
                {snapshot.currentState.score.away}
              </strong>
              <small>
                {snapshot.currentState.finalised ? "FINAL STATE OBSERVED" : "WITNESS STREAM"}
              </small>
            </div>
            <div className="prob">
              <div>
                <span>{showcaseFixture.home}</span>
                <strong>{formatProbability(snapshot.currentState.probabilities.home)}</strong>
              </div>
              <div>
                <span>Draw</span>
                <strong>{formatProbability(snapshot.currentState.probabilities.draw)}</strong>
              </div>
              <div>
                <span>{showcaseFixture.away}</span>
                <strong>{formatProbability(snapshot.currentState.probabilities.away)}</strong>
              </div>
            </div>
            {snapshot.reconciliation && (
              <div className={`reconcile ${snapshot.reconciliation.changed ? "changed" : "aligned"}`}>
                <RefreshCcw size={15} />
                <div>
                  <strong>
                    {snapshot.reconciliation.changed
                      ? "Witness drift reconciled"
                      : "Witness already aligned"}
                  </strong>
                  <span>Liquid ring settles into canonical geometry</span>
                </div>
              </div>
            )}
          </div>
          <div className="controls">
            <button
              type="button"
              className="primary"
              onClick={() => replay.setPlaying(!replay.playing)}
              aria-label={replay.playing ? "Pause replay" : "Play replay"}
            >
              {replay.playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" onClick={replay.restart} aria-label="Restart replay">
              <RefreshCcw size={17} />
            </button>
            <input
              aria-label="Replay progress"
              type="range"
              min="0"
              max="1"
              step=".0005"
              value={snapshot.progress}
              onChange={(e) => replay.seekProgress(Number(e.currentTarget.value))}
            />
            <div className="speeds">
              {[1, 4, 12].map((v) => (
                <button
                  type="button"
                  key={v}
                  className={replay.speed === v ? "active" : ""}
                  onClick={() => replay.setSpeed(v)}
                >
                  {v}×
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSound(!sound)}
              aria-label={sound ? "Mute witness tones" : "Enable witness tones"}
            >
              {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
          <div className="moments">
            {showcaseMoments
              .filter((m) =>
                ["goal", "goal_cancelled", "red_card", "period_end", "game_finalised"].includes(
                  m.action,
                ),
              )
              .map((m) => (
                <button
                  type="button"
                  key={`${m.timestamp}-${m.action}-${m.participant ?? "none"}`}
                  onClick={() => replay.seekMinute(m.minute)}
                >
                  <span>{m.minute}′</span>
                  {m.label}
                </button>
              ))}
          </div>
        </article>
        <aside className="inspector glass">
          <div className="tabs">
            <button
              type="button"
              className={panel === "signals" ? "active" : ""}
              onClick={() => setPanel("signals")}
            >
              <Gauge size={15} />
              Signals
            </button>
            <button
              type="button"
              className={panel === "proof" ? "active" : ""}
              onClick={() => setPanel("proof")}
            >
              <ScanSearch size={15} />
              Proof
            </button>
            <button
              type="button"
              className={panel === "witness" ? "active" : ""}
              onClick={() => setPanel("witness")}
            >
              <Fingerprint size={15} />
              Witness
            </button>
          </div>
          {panel === "signals" && ring && (
            <div className="panel">
              <div className="panelHead">
                <div>
                  <span>RING {ring.ordinal + 1}</span>
                  <h2>Emotional field</h2>
                </div>
                <Material material={ring.material} />
              </div>
              <Meter
                label="Uncertainty"
                value={ring.signals.uncertainty}
                note="Three-outcome entropy; structural balance, not urgency."
              />
              <Meter
                label="Fragility"
                value={ring.signals.fragility}
                note="Time-scaled probability the current result class fails."
              />
              <Meter
                label="Draw threat"
                value={ring.signals.drawThreat}
                note="Late equalizer pressure during one-goal margins."
              />
              <Meter
                label="Volatility"
                value={ring.signals.volatility}
                note="Robustly clamped StablePrice movement."
              />
              <div className="params">
                <div>
                  <span>Shock</span>
                  <strong>{ring.signals.shock.toFixed(3)}</strong>
                </div>
                <div>
                  <span>Turbulence</span>
                  <strong>{ring.geometry.turbulence.toFixed(3)}</strong>
                </div>
                <div>
                  <span>Membrane</span>
                  <strong>{ring.geometry.membranePressure.toFixed(3)}</strong>
                </div>
                <div>
                  <span>Tempo</span>
                  <strong>{ring.audio.tempo} bpm</strong>
                </div>
              </div>
              <div className="doctrine">
                <Activity size={17} />
                <p>
                  <strong>Live is witness.</strong> Canonical geometry is compiled from the repaired log
                  after interval close.
                </p>
              </div>
            </div>
          )}
          {panel === "proof" && ring && proof && (
            <div className="panel">
              <div className="panelHead">
                <div>
                  <span>PROOF MICROSCOPE</span>
                  <h2>Ring {ring.ordinal + 1}</h2>
                </div>
                <ShieldCheck size={24} />
              </div>
              <div className="proofFlow">
                <div className="proofNode">
                  <i className="leaf" />
                  <div>
                    <span>Closing leaves</span>
                    <strong>Odds + score state</strong>
                    <code>{shortHash(proof.odds.leaf)}</code>
                  </div>
                </div>
                <div className="proofLine">Merkle sibling path</div>
                <div className="proofNode">
                  <i className="root" />
                  <div>
                    <span>Interval root</span>
                    <strong>{shortHash(proof.odds.root, 10)}</strong>
                    <code>{proof.odds.proof.length + proof.score.proof.length} proof nodes</code>
                  </div>
                </div>
                <div className="proofLine">daily root namespace</div>
                <div className="proofNode">
                  <i className="chain" />
                  <div>
                    <span>Solana PDA</span>
                    <strong>{shortHash(proof.score.anchor.rootPda, 7)}</strong>
                    <code>derived from proof timestamp</code>
                  </div>
                </div>
              </div>
              <div className={`verify ${proofReady ? "ok" : "pending"}`}>
                {proofReady ? <BadgeCheck size={20} /> : <FlaskConical size={20} />}
                <div>
                  <strong>{proofReady ? "Synthetic vector verified" : "Commitment pending"}</strong>
                  <span>
                    {proofReady
                      ? "The local verifier accepted both Merkle paths."
                      : `${Math.max(0, Math.ceil((proof.availableAt - snapshot.now) / 1000))}s in replay time`}
                  </span>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Ring hash</dt>
                  <dd>{shortHash(ring.canonicalRingHash, 9)}</dd>
                </div>
                <div>
                  <dt>Journal head</dt>
                  <dd>{shortHash(ring.journalHeadHash, 9)}</dd>
                </div>
                <div>
                  <dt>Root PDA</dt>
                  <dd>{shortHash(proof.score.anchor.rootPda, 9)}</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{proof.score.anchor.verificationMode}</dd>
                </div>
              </dl>
              <p className="fine">
                Offline vectors are explicitly synthetic. The same package supports real TxLINE V2/V3
                responses and official PDA derivation.
              </p>
            </div>
          )}
          {panel === "witness" && (
            <div className="panel witness">
              <div className="panelHead">
                <div>
                  <span>COMMIT / REVEAL</span>
                  <h2>Bind your perspective</h2>
                </div>
                <Sparkles size={23} />
              </div>
              <label>
                Allegiance
                <select
                  value={allegiance}
                  onChange={(e) => setAllegiance(e.currentTarget.value as typeof allegiance)}
                >
                  <option value="home">{showcaseFixture.home}</option>
                  <option value="away">{showcaseFixture.away}</option>
                  <option value="neutral">Neutral</option>
                </select>
              </label>
              <label>
                Emotional lens
                <select value={lens} onChange={(e) => setLens(e.currentTarget.value as typeof lens)}>
                  <option value="hope">Hope</option>
                  <option value="chaos">Chaos</option>
                  <option value="analyst">Analyst</option>
                  <option value="ultra">Ultra</option>
                </select>
              </label>
              <label>
                Species
                <select value={species} onChange={(e) => setSpecies(e.currentTarget.value)}>
                  <option value="crystal-mycelium">Crystal mycelium</option>
                  <option value="celestial-weather">Celestial weather</option>
                  <option value="woven-topography">Woven topography</option>
                </select>
              </label>
              <label>
                Secret seed
                <input value={secret} onChange={(e) => setSecret(e.currentTarget.value)} />
              </label>
              <button type="button" className="commit" onClick={commit}>
                <Fingerprint size={17} />
                Commit at {formatMinute(snapshot.currentMinute)}
              </button>
              {commitment && committedAt !== null && (
                <div className="receipt">
                  <span>Commitment</span>
                  <code>{shortHash(commitment, 10)}</code>
                  <strong>
                    {witnessTier(
                      committedAt,
                      showcaseFixture.kickoffAt,
                      showcaseFixture.kickoffAt + 96 * 60_000,
                    ).replace("-", " ")}{" "}
                    witness
                  </strong>
                </div>
              )}
              {phenotype && (
                <div className="phenotype">
                  <Sparkles size={17} />
                  <div>
                    <span>Revealed phenotype</span>
                    <code>{shortHash(phenotype, 10)}</code>
                  </div>
                </div>
              )}
              <p className="fine">
                The included Anchor program stores this exact preimage commitment before kickoff and
                seals the revealed genome only after TxLINE validation.
              </p>
            </div>
          )}
        </aside>
      </section>
      <section className="timeline glass">
        <div className="timelineHead">
          <div>
            <span className="eyebrow">CANONICAL MEMORY CHAIN</span>
            <h2>Twenty interval rings, three material states</h2>
          </div>
          <div className="counts">
            <span className="c">{counts.crystal} crystal</span>
            <span className="a">{counts.amber} amber</span>
            <span className="l">{counts.liquid} liquid</span>
          </div>
        </div>
        <div className="ticks">
          {showcaseTimeline.rings.map((source, index) => {
            const visible =
                snapshot.canonicalRings[index] ??
                (snapshot.liveRing?.ordinal === index ? snapshot.liveRing : null),
              material = visible?.material ?? "future";
            return (
              <button
                type="button"
                key={source.canonicalRingHash}
                className={`tick ${material} ${selected === index ? "selected" : ""}`}
                disabled={!visible}
                onClick={() => {
                  setSelected(index);
                  setPanel("proof");
                }}
                aria-label={`Select ring ${index + 1}, ${material}`}
              >
                <i />
                <span>{index * 5}′</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="artifacts">
        <div>
          <Headphones size={20} />
          <p>
            <strong>The live performance is what you heard.</strong>
            <span>The canonical score is what the match remembers.</span>
          </p>
        </div>
        <div>
          <a href="/generated/canonical.wav" download>
            <Download size={16} />
            WAV
          </a>
          <a href="/generated/canonical.svg" download>
            <Download size={16} />
            SVG
          </a>
          <a href="/generated/timeline.json" download>
            <Download size={16} />
            Manifest
          </a>
        </div>
      </section>
      <footer>
        <span>Match DNA / proof-aware media compiler</span>
        <span>{shortHash(showcaseTimeline.timelineHash, 10)}</span>
      </footer>
    </main>
  );
}
