# TxLINE integration

## Packages

`@match-dna/txline` contains:

- network configuration and published program IDs;
- proof-timestamp normalization;
- day-indexed score/odds root PDA derivation;
- ten-day fixture root PDA derivation;
- mixed-casing odds and score normalization;
- SSE block parsing and async streaming;
- authenticated HTTP client methods;
- 32-byte proof-node decoding;
- V2/V3 score proof payload conversion;
- odds/score proof descriptors and proof anchors;
- deterministic local Merkle utilities used by tests.

`@match-dna/sdk` adds:

- replay snapshots;
- witness/canonical reconciliation reports;
- liquid/amber/crystal material scheduling;
- proof availability retry with exponential backoff;
- the high-level `MatchDnaProofKit` facade.

## Published TxLINE program IDs used by this repository

```text
Devnet:  6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
Mainnet: 9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA
```

Reconfirm deployment IDs with TxODDS before submitting or deploying. Program deployments can change.

## Gateway configuration

```dotenv
TXLINE_NETWORK=devnet
TXLINE_BASE_URL=https://txline-dev.txodds.com
TXLINE_JWT=...
TXLINE_API_TOKEN=...
```

The gateway exposes:

```text
GET /health
GET /api/showcase
GET /api/showcase/timeline
GET /api/showcase/proofs
GET /api/showcase/snapshot?minute=69
GET /api/txline/scores/:fixtureId
GET /api/txline/proofs/scores?fixtureId=...&sequence=...&statKeys=1,2,3
GET /api/txline/proofs/odds?messageId=...&timestamp=...
```

Live routes return `503` unless both TxLINE credentials are present.

## Route drift

The TxLINE public API has used different names for some proof endpoints. The client defaults are intentionally configurable:

```ts
new TxLineClient({
  network: "devnet",
  scoreProofPath: "/api/scores/stat-validation",
  oddsProofPath: "/api/odds/validation",
});
```

Treat the current OpenAPI document as authoritative and override paths without changing the compiler.

## First real-data integration checklist

- Capture one full historical fixture response.
- Persist the exact raw JSON before normalization.
- Verify one odds proof against the actual `daily_batch_roots` PDA.
- Verify one V3 score multiproof against `daily_scores_roots`.
- Confirm whether proof timestamps are seconds or milliseconds in the current response; the helpers accept either.
- Measure interval-close → root-confirmation → proof-API latency.
- Confirm stat-key semantics for goals, cards, and corners.
- Record expected proof payloads as non-secret regression fixtures.
- Profile transaction size and compute units for the raw CPI route.
