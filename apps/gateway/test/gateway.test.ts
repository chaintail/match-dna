import { afterEach, describe, expect, it } from "vitest";
import { createGateway, type GatewayConfig } from "../src/index.js";

const apps: Awaited<ReturnType<typeof createGateway>>[] = [];
const config: GatewayConfig = {
  host: "127.0.0.1",
  port: 8787,
  corsOrigin: "http://localhost:5173",
  txlineNetwork: "devnet",
};
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));
describe("gateway", () => {
  it("reports offline health", async () => {
    const app = await createGateway({ config });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.json()).toMatchObject({ ok: true, mode: "offline-replay" });
  });
  it("serves showcase snapshot", async () => {
    const app = await createGateway({ config });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/api/showcase/snapshot?minute=69" });
    expect(response.json().currentState.score).toEqual({ home: 2, away: 1 });
  });
  it("protects live routes", async () => {
    const app = await createGateway({ config });
    apps.push(app);
    expect((await app.inject({ method: "GET", url: "/api/txline/scores/1" })).statusCode).toBe(503);
  });
  it("validates minute", async () => {
    const app = await createGateway({ config });
    apps.push(app);
    expect(
      (await app.inject({ method: "GET", url: "/api/showcase/snapshot?minute=999" })).statusCode,
    ).toBe(400);
  });
});
