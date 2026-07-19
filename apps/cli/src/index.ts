#!/usr/bin/env node
import { resolve } from "node:path";
import {
  showcaseDeliveries,
  showcaseFixture,
  showcaseProofBundles,
  showcaseTimeline,
} from "@match-dna/fixtures";
import { MatchDnaReplayEngine, type ScheduledProofBundle } from "@match-dna/sdk";
import { Command } from "commander";
import { generateDemoArtifacts, verifyDemoArtifacts } from "./artifacts.js";

const scheduled = (): ScheduledProofBundle[] =>
  showcaseProofBundles.map((b) => ({
    ringIndex: b.ringIndex,
    availableAt: b.availableAt,
    anchors: [b.odds.anchor, b.score.anchor],
    details: b,
  }));
export function createProgram() {
  const program = new Command()
    .name("match-dna")
    .description("Compile, render, replay, and verify Match DNA artifacts");
  program
    .command("generate")
    .option("-o, --out <directory>", "output directory", "./generated")
    .action(async ({ out }: { out: string }) =>
      console.log(JSON.stringify(await generateDemoArtifacts(resolve(out)), null, 2)),
    );
  program
    .command("verify-demo")
    .option("-o, --out <directory>")
    .action(async ({ out }: { out?: string }) => {
      const result = await verifyDemoArtifacts(out ? resolve(out) : undefined);
      for (const check of result.checks)
        console.log(`${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
      if (!result.ok) process.exitCode = 1;
    });
  program
    .command("replay")
    .option("-m, --minute <number>", "match minute", "68")
    .action(({ minute }: { minute: string }) => {
      const engine = new MatchDnaReplayEngine({
        fixtureId: showcaseFixture.id,
        fixtureName: showcaseFixture.name,
        kickoffAt: showcaseFixture.kickoffAt,
        timeline: showcaseTimeline,
        deliveries: showcaseDeliveries,
        proofBundles: scheduled(),
      });
      const snapshot = engine.snapshotAt(showcaseFixture.kickoffAt + Number(minute) * 60_000);
      console.log(
        JSON.stringify(
          {
            minute: snapshot.currentMinute,
            score: snapshot.currentState.score,
            probabilities: snapshot.currentState.probabilities,
            rings: snapshot.canonicalRings.map((r) => r.material),
            reconciliation: snapshot.reconciliation,
          },
          null,
          2,
        ),
      );
    });
  program
    .command("inspect")
    .requiredOption("-r, --ring <number>")
    .action(({ ring }: { ring: string }) => {
      const manifest = showcaseTimeline.rings[Number(ring)];
      if (!manifest) throw new Error(`Ring ${ring} does not exist`);
      console.log(JSON.stringify(manifest, null, 2));
    });
  return program;
}
if (import.meta.url === `file://${process.argv[1]}`) await createProgram().parseAsync(process.argv);

export * from "./artifacts.js";
