import { TXLINE_CONFIGS, type TxLineCredentials, type TxLineNetwork } from "./config.js";
import { parseSseStream } from "./sse.js";
export interface TxLinePaths {
  scoresHistory: (fixtureId: string | number) => string;
  oddsSnapshot: (fixtureId: string | number) => string;
  scoreProofV2: string;
  oddsProof: string;
  scoresStream: string;
  oddsStream: string;
}
const paths: TxLinePaths = {
  scoresHistory: (id) => `/api/scores/fixtures/${id}/history`,
  oddsSnapshot: (id) => `/api/odds/fixtures/${id}/snapshot`,
  scoreProofV2: "/api/scores/proofs/v2",
  oddsProof: "/api/odds/proofs",
  scoresStream: "/api/scores/stream",
  oddsStream: "/api/odds/stream",
};
export class TxLineHttpError extends Error {
  constructor(
    public status: number,
    public body: string,
    message = `TxLINE request failed (${status})`,
  ) {
    super(message);
    this.name = "TxLineHttpError";
  }
}
export interface TxLineClientOptions {
  network?: TxLineNetwork;
  baseUrl?: string;
  credentials?: TxLineCredentials;
  fetch?: typeof fetch;
  paths?: Partial<TxLinePaths>;
}
export class TxLineClient {
  readonly network: TxLineNetwork;
  readonly baseUrl: string;
  private credentials?: TxLineCredentials;
  private fetcher: typeof fetch;
  private paths: TxLinePaths;
  constructor(options: TxLineClientOptions = {}) {
    this.network = options.network ?? "devnet";
    this.baseUrl = (options.baseUrl ?? TXLINE_CONFIGS[this.network].baseUrl).replace(/\/$/, "");
    this.credentials = options.credentials;
    this.fetcher = options.fetch ?? fetch;
    this.paths = { ...paths, ...options.paths };
  }
  private headers(accept = "application/json"): Headers {
    const h = new Headers({ Accept: accept });
    if (this.credentials) {
      h.set("Authorization", `Bearer ${this.credentials.jwt}`);
      h.set("x-api-token", this.credentials.apiToken);
    }
    return h;
  }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: new Headers([...this.headers(), ...new Headers(init.headers)]),
    });
    if (!response.ok) throw new TxLineHttpError(response.status, await response.text());
    return response.json() as Promise<T>;
  }
  historicalScores<T = unknown>(fixtureId: string | number): Promise<T> {
    return this.request(this.paths.scoresHistory(fixtureId));
  }
  oddsSnapshot<T = unknown>(fixtureId: string | number, asOf?: number): Promise<T> {
    const q = asOf === undefined ? "" : `?asOf=${encodeURIComponent(asOf)}`;
    return this.request(`${this.paths.oddsSnapshot(fixtureId)}${q}`);
  }
  scoreProofV2<T = unknown>(
    fixtureId: string | number,
    sequence: number,
    statKeys: readonly number[],
  ): Promise<T> {
    const q = new URLSearchParams({
      fixtureId: String(fixtureId),
      sequence: String(sequence),
      statKeys: statKeys.join(","),
    });
    return this.request(`${this.paths.scoreProofV2}?${q}`);
  }
  oddsProof<T = unknown>(messageId: string, timestamp: number): Promise<T> {
    const q = new URLSearchParams({ messageId, timestamp: String(timestamp) });
    return this.request(`${this.paths.oddsProof}?${q}`);
  }
  async *stream<T = unknown>(
    kind: "scores" | "odds",
    signal?: AbortSignal,
  ): AsyncGenerator<{ message: import("./sse.js").SseMessage; data: T }> {
    const response = await this.fetcher(
      `${this.baseUrl}${kind === "scores" ? this.paths.scoresStream : this.paths.oddsStream}`,
      { headers: this.headers("text/event-stream"), signal },
    );
    if (!response.ok) throw new TxLineHttpError(response.status, await response.text());
    if (!response.body) throw new Error("TxLINE SSE response has no body");
    for await (const message of parseSseStream(response.body)) {
      let data: T;
      try {
        data = JSON.parse(message.data) as T;
      } catch {
        data = message.data as T;
      }
      yield { message, data };
    }
  }
}
