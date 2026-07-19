import cors from "@fastify/cors";
import {
  showcaseDeliveries,
  showcaseFixture,
  showcaseMoments,
  showcaseProofBundles,
  showcaseTimeline,
} from "@match-dna/fixtures";
import { MatchDnaReplayEngine, type ScheduledProofBundle } from "@match-dna/sdk";
import { TxLineClient, type TxLineNetwork } from "@match-dna/txline";
import Fastify, { type FastifyInstance } from "fastify";
export interface GatewayConfig {
  host: string;
  port: number;
  corsOrigin: string;
  txlineNetwork: TxLineNetwork;
  txlineBaseUrl?: string;
  txlineJwt?: string;
  txlineApiToken?: string;
}
export function gatewayConfigFromEnvironment(env = process.env): GatewayConfig {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new TypeError("PORT must be valid");
  return {
    host: env.HOST ?? "127.0.0.1",
    port,
    corsOrigin: env.CORS_ORIGIN ?? "http://localhost:5173",
    txlineNetwork: env.TXLINE_NETWORK === "mainnet" ? "mainnet" : "devnet",
    ...(env.TXLINE_BASE_URL ? { txlineBaseUrl: env.TXLINE_BASE_URL } : {}),
    ...(env.TXLINE_JWT ? { txlineJwt: env.TXLINE_JWT } : {}),
    ...(env.TXLINE_API_TOKEN ? { txlineApiToken: env.TXLINE_API_TOKEN } : {}),
  };
}
const scheduled = (): ScheduledProofBundle[] =>
  showcaseProofBundles.map((b) => ({
    ringIndex: b.ringIndex,
    availableAt: b.availableAt,
    anchors: [b.odds.anchor, b.score.anchor],
    details: b,
  }));
export async function createGateway(options: {
  config: GatewayConfig;
  txlineClient?: TxLineClient;
  logger?: boolean;
}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  await app.register(cors, { origin: options.config.corsOrigin });
  const txline =
    options.txlineClient ??
    (options.config.txlineJwt && options.config.txlineApiToken
      ? new TxLineClient({
          network: options.config.txlineNetwork,
          ...(options.config.txlineBaseUrl ? { baseUrl: options.config.txlineBaseUrl } : {}),
          credentials: { jwt: options.config.txlineJwt, apiToken: options.config.txlineApiToken },
        })
      : undefined);
  const engine = new MatchDnaReplayEngine({
    fixtureId: showcaseFixture.id,
    fixtureName: showcaseFixture.name,
    kickoffAt: showcaseFixture.kickoffAt,
    timeline: showcaseTimeline,
    deliveries: showcaseDeliveries,
    proofBundles: scheduled(),
  });
  app.get("/health", async () => ({
    ok: true,
    service: "match-dna-gateway",
    mode: txline ? "live-capable" : "offline-replay",
    txlineNetwork: options.config.txlineNetwork,
  }));
  app.get("/api/showcase", async () => ({
    fixture: showcaseFixture,
    timelineHash: showcaseTimeline.timelineHash,
    ringCount: showcaseTimeline.rings.length,
    proofCount: showcaseProofBundles.length * 2,
    moments: showcaseMoments,
  }));
  app.get("/api/showcase/timeline", async () => showcaseTimeline);
  app.get("/api/showcase/proofs", async () => showcaseProofBundles);
  app.get<{ Querystring: { minute?: string } }>("/api/showcase/snapshot", async (request, reply) => {
    const minute = Number(request.query.minute ?? 68);
    if (!Number.isFinite(minute) || minute < -1 || minute > 110)
      return reply.code(400).send({ error: "minute must be between -1 and 110" });
    return engine.snapshotAt(showcaseFixture.kickoffAt + minute * 60_000);
  });
  app.get<{ Params: { fixtureId: string } }>("/api/txline/scores/:fixtureId", async (request, reply) => {
    if (!txline) return reply.code(503).send({ error: "TxLINE credentials are not configured" });
    return txline.historicalScores(request.params.fixtureId);
  });
  app.get<{ Querystring: { fixtureId?: string; sequence?: string; statKeys?: string } }>(
    "/api/txline/proofs/scores",
    async (request, reply) => {
      if (!txline) return reply.code(503).send({ error: "TxLINE credentials are not configured" });
      const { fixtureId, sequence, statKeys } = request.query;
      if (!fixtureId || !sequence || !statKeys)
        return reply.code(400).send({ error: "fixtureId, sequence, and statKeys are required" });
      const keys = statKeys.split(",").map(Number);
      if (keys.some((v) => !Number.isInteger(v)))
        return reply.code(400).send({ error: "statKeys must be integers" });
      return txline.scoreProofV2(fixtureId, Number(sequence), keys);
    },
  );
  app.get<{ Querystring: { messageId?: string; timestamp?: string } }>(
    "/api/txline/proofs/odds",
    async (request, reply) => {
      if (!txline) return reply.code(503).send({ error: "TxLINE credentials are not configured" });
      const { messageId, timestamp } = request.query;
      if (!messageId || !timestamp || !Number.isFinite(Number(timestamp)))
        return reply.code(400).send({ error: "messageId and numeric timestamp are required" });
      return txline.oddsProof(messageId, Number(timestamp));
    },
  );
  return app;
}
