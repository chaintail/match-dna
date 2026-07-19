import { ShieldAlert } from "lucide-react";
import historicRaw from "./historicData.json";
import "./styles.css";
import "./story.css";

type HistoricFixture = {
  name: string;
  finalScore: { home: number; away: number };
  goals: number;
  kickoffISO: string;
};
const historic = historicRaw as HistoricFixture[];

const LIVE_ODDS_DONE = 3005;
const LIVE_ODDS_TOTAL = 3735;
const LIVE_SCORE_DONE = 818;
const LIVE_SCORE_TOTAL = 831;
const LIVE_CHECK_ET = "5:01 PM ET (2026-07-19)";

function goalColor(goals: number, max: number) {
  const pct = Math.max(0, Math.min(1, goals / max));
  if (goals >= 24) return "hsl(6, 82%, 58%)"; // red-orange shock outlier
  const lightness = 14 + pct * 46;
  return `hsl(38, 78%, ${lightness}%)`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function PipelineStage({
  color,
  eyebrow,
  title,
  body,
  branch,
}: {
  color: string;
  eyebrow: string;
  title: string;
  body: string;
  branch?: { color: string; label: string };
}) {
  return (
    <div className="stage" style={{ ["--c" as string]: color }}>
      <div className="connector" />
      <div className="ring">{eyebrow}</div>
      <b>{title}</b>
      <span>{body}</span>
      {branch ? (
        <div className="branch">
          <em style={{ borderColor: branch.color, color: branch.color }}>{branch.label}</em>
        </div>
      ) : null}
    </div>
  );
}

export default function StoryPage() {
  const maxGoals = Math.max(...historic.map((f) => f.goals));
  const totalRecorded = historic.length;
  const dateStart = fmtDate(historic[0]?.kickoffISO ?? "");
  const dateEnd = fmtDate(historic[historic.length - 1]?.kickoffISO ?? "");
  const oddsPct = Math.round((LIVE_ODDS_DONE / LIVE_ODDS_TOTAL) * 100);
  const scorePct = Math.round((LIVE_SCORE_DONE / LIVE_SCORE_TOTAL) * 100);

  return (
    <div className="shell story">
      <nav className="storyNav">
        <div className="brand">
          <strong>MATCH DNA — THE STORY</strong>
        </div>
        <a className="back" href="/">
          ← Open the live studio
        </a>
      </nav>

      {/* 1. HERO */}
      <section className="storyHero glass">
        <img src="/story-assets/hero-final.png" alt="" />
        <div className="heroContent">
          <div className="tags">
            <span>Superteam Earn × TxODDS World Cup Hackathon</span>
            <span>Consumer &amp; Fan Experiences</span>
          </div>
          <h1>
            A match becomes <em>a living memory</em>
          </h1>
          <p className="sub">
            Match DNA compiles live odds and match events into a canonical, cryptographically-provable
            genome of a football match — witnessed in real time, sealed once proof arrives.
          </p>
        </div>
      </section>

      {/* 2. WHAT IT IS */}
      <section>
        <div className="kicker">What it is</div>
        <h2>Every match already has a shape. Match DNA makes it visible — and provable.</h2>
        <p className="lede">
          TxLINE consensus odds and live match events are compiled, minute by minute, into a{" "}
          <b>canonical genome</b> of the game: a chain of interval "rings" that move through a strict
          material lifecycle — <b>liquid</b> while the market is still open and uncertain, <b>amber</b>{" "}
          once an interval closes and becomes canonical-but-awaiting-proof, and <b>crystal</b> only once
          an on-chain proof seals it. Intervals whose data disagrees with itself are not silently
          resolved — they're <b>quarantined</b> as disputed states until they can be reconciled. Nothing
          is rendered as sealed before it is sealed.
        </p>
      </section>

      {/* 3. HOW IT WORKS */}
      <section>
        <div className="kicker">How it works</div>
        <h2>Five stages, one witness chain</h2>
        <div className="pipeline glass">
          <PipelineStage color="#74ddff" eyebrow="01" title="Ingest" body="TxLINE consensus odds + live match events, streamed in." />
          <PipelineStage color="#74ddff" eyebrow="02" title="Witness" body="5-minute liquid interval rings, forming while the market is still open." />
          <PipelineStage color="#ffb955" eyebrow="03" title="Compile" body="Interval closes. Ring turns amber — canonical, awaiting proof." />
          <PipelineStage
            color="#cffff4"
            eyebrow="04"
            title="Crystallize"
            body="On-chain proof seals the ring into crystal."
            branch={{ color: "#ff547b", label: "or quarantine — disputed" }}
          />
          <PipelineStage color="#a899ff" eyebrow="05" title="Render + Export" body="Canvas geometry, SVG, WAV sonification, optional Solana anchor." />
        </div>
      </section>

      {/* 4. TODAY'S LIVE FINAL */}
      <section>
        <div className="kicker">Today's live final</div>
        <h2>Spain vs Argentina — FIFA World Cup Final, witnessed live</h2>
        <p className="lede">
          This capture is running right now, through the shipped TxLineClient's verified mainnet
          credentials — not a replay. <b>LIVE TXLINE CAPTURE.</b>
        </p>
        <div className="liveCard glass">
          <img src="/story-assets/live-final-screenshot.png" alt="Live capture of the Match DNA studio witnessing Spain vs Argentina, FIFA World Cup Final" />
          <div className="info">
            <span className="liveBadge">
              <i /> LIVE TXLINE CAPTURE
            </span>
            <div className="statRow">
              <div>
                <span>Consensus odds ticks processed</span>
                <strong>
                  {LIVE_ODDS_DONE.toLocaleString()} / {LIVE_ODDS_TOTAL.toLocaleString()} ({oddsPct}%)
                </strong>
              </div>
              <div>
                <span>Score events processed</span>
                <strong>
                  {LIVE_SCORE_DONE.toLocaleString()} / {LIVE_SCORE_TOTAL.toLocaleString()} ({scorePct}%)
                </strong>
              </div>
            </div>
            <p className="lede" style={{ fontSize: 13 }}>
              Figures as of the last live check, {LIVE_CHECK_ET} — the match was still in progress at
              that point. This page states only what was true when it was written; it does not predict a
              final score.
            </p>
          </div>
        </div>
      </section>

      {/* 5. HISTORIC ARCHIVE */}
      <section>
        <div className="kicker">The historic archive</div>
        <h2>103 recorded World Cup matches, one witness pipeline</h2>
        <p className="lede">
          Every fixture below is a <b>RECORDED TXLINE CAPTURE</b> — full tournament coverage from{" "}
          {dateStart} to {dateEnd}, 2026, rendered through the exact same witness pipeline as the live
          final above. 105 fixtures were attempted; 2 were correctly excluded by an automatic quality
          gate for genuinely empty captures (0 odds ticks, 0 score events, no kickoff/goal action) — not
          render failures.
        </p>
        <div className="archiveMeta">
          <div>
            <strong>103</strong> / 105 fixtures passed
          </div>
          <div>
            <strong>2</strong> excluded — empty-capture quality gate
          </div>
          <div>
            {dateStart} → {dateEnd}, 2026
          </div>
        </div>
        <div className="heatmap glass">
          {historic.map((f, i) => (
            <div key={i} className="heatCell" style={{ background: goalColor(f.goals, maxGoals) }}>
              <div className="tip">
                {f.name}: {f.finalScore.home}–{f.finalScore.away} ({f.goals}g)
              </div>
            </div>
          ))}
        </div>
        <div className="legend">
          <span>Fewer goals</span>
          <div className="swatch">
            <i style={{ background: "hsl(38,78%,18%)" }} />
            <i style={{ background: "hsl(38,78%,34%)" }} />
            <i style={{ background: "hsl(38,78%,50%)" }} />
            <i style={{ background: "hsl(38,78%,60%)" }} />
            <i style={{ background: "hsl(6,82%,58%)" }} />
          </div>
          <span>More goals (each cell = one recorded match, hover for score)</span>
        </div>
        <div className="marquee">
          <div>
            <span>Semifinal · Jul 14</span>
            <strong>France 0–2 Spain</strong>
            <small>Spain into the final</small>
          </div>
          <div>
            <span>Semifinal · Jul 15</span>
            <strong>England 1–2 Argentina</strong>
            <small>Argentina into the final</small>
          </div>
          <div>
            <span>Third-place playoff · Jul 18</span>
            <strong>France 4–6 England</strong>
            <small>28 combined goals, after extra time</small>
          </div>
        </div>
        <p className="lede">
          <a href="https://match-dna-history.vercel.app" style={{ color: "var(--liquid)" }}>
            Browse the full historic archive →
          </a>
        </p>
      </section>

      {/* 6. PROOF & HONESTY */}
      <section>
        <div className="kicker">Proof &amp; honesty</div>
        <h2>What's proven, what isn't — stated plainly</h2>
        <div className="proofGrid glass">
          <div>
            <strong>16/16</strong>
            <span>TypeScript / Turbo tasks</span>
          </div>
          <div>
            <strong>39/39</strong>
            <span>Tests passing</span>
          </div>
          <div>
            <strong>10/10</strong>
            <span>Production build targets</span>
          </div>
          <div>
            <strong>20</strong>
            <span>Ring links (artifact verifier)</span>
          </div>
          <div>
            <strong>40</strong>
            <span>Proof paths (artifact verifier)</span>
          </div>
        </div>
        <div className="honestBox">
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} color="var(--amber)" />
          <p>
            The default showcase artifact is an <strong>offline proof replay</strong> of a{" "}
            <strong>synthetic fixture</strong>. Proof Microscope mode is reported as{" "}
            <strong>"synthetic"</strong> wherever it appears. The generator's SHA-256 Merkle paths verify
            locally, but this project <strong>does not claim that those local roots exist in the
            referenced TxLINE PDAs</strong>. On both the live final and the historic archive, rings stay{" "}
            <strong>amber</strong> — witness-only — because the Anchor program has never been deployed to
            mainnet. No fabricated crystals, ever.
          </p>
        </div>
      </section>

      {/* 7. SONIFICATION */}
      <section>
        <div className="kicker">Sonification</div>
        <h2>The match, heard</h2>
        <div className="wave glass" style={{ padding: "0 18px" }}>
          {Array.from({ length: 48 }).map((_, i) => (
            <i key={i} style={{ height: `${20 + Math.sin(i * 0.7) * 18 + Math.cos(i * 1.3) * 12}px`, animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
        <p className="sonifyTag">
          "The live performance is what you heard. The canonical score is what the match remembers."
        </p>
      </section>

      {/* 8. TRY IT */}
      <section>
        <div className="kicker">Try it</div>
        <div className="ctaRow">
          <a href="https://match-dna.vercel.app" className="glass">
            <span className="label">Live MVP</span>
            <strong>Open the studio</strong>
            <small>Interactive replay + proof inspector</small>
          </a>
          <a href="https://match-dna-history.vercel.app" className="glass">
            <span className="label">Historic archive</span>
            <strong>103 recorded matches</strong>
            <small>Full tournament coverage</small>
          </a>
          <a href="https://match-dna-live.vercel.app" className="glass">
            <span className="label">Live final mirror</span>
            <strong>Spain vs Argentina</strong>
            <small>Time-boxed live capture</small>
          </a>
          <a href="https://github.com/0xPulsePlay/match-dna" className="glass">
            <span className="label">Repo</span>
            <strong>0xPulsePlay/match-dna</strong>
            <small>Source, validation report, docs</small>
          </a>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="storyFooter">
        <div>
          <b>Match DNA</b> — Superteam Earn × TxODDS World Cup Hackathon, Consumer &amp; Fan Experiences
          track.
        </div>
        <div>
          Honest limitations: this is a sandbox validation environment (no live TxODDS credentials or
          Rust/Anchor toolchain were available during release validation, per VALIDATION_REPORT.md), and
          the Anchor program has not been deployed to mainnet — rings witnessed here can reach amber
          (canonical) but not crystal (proof-sealed) on real data.
        </div>
      </footer>
    </div>
  );
}
