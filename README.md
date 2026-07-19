# MATCH DNA

**A living, verifiable memory of a football match.**

Match DNA converts an imperfect real-time sports feed into a deterministic audiovisual artifact whose important data anchors can be verified against TxLINE commitments on Solana.

The core product doctrine is visible in the material system:

- **Liquid** — a low-latency witness rendering assembled from the records this client has seen. It may differ slightly between browsers after reconnects, throttling, or out-of-order delivery.
- **Amber** — the five-minute interval has closed and the backend has reconciled, deduplicated, ordered, and compiled one canonical ring. Its geometry is now immutable, but the TxLINE proof may not yet be available.
- **Crystal** — the required TxLINE anchors have verified against the root account selected from the proof timestamp. The ring keeps exactly the same geometry and gains a proof fingerprint.
- **Quarantined** — conflicting source identities or failed proof checks prevent sealing.

> The proof moment is also the truth moment: a liquid witness ring visibly settles into canonical geometry, waits in amber, and crystallizes only after verification.

## Included in this monorepo

- A polished React replay studio with the liquid → amber → crystal animation, signal inspector, proof microscope, commit/reveal preview, replay controls, and artifact downloads.
- A reusable SDK for deterministic journals, five-minute compilation, reconciliation, retryable proof availability, and replay snapshots.
- Typed TxLINE normalization, authenticated HTTP/SSE helpers, proof payload conversion, local Merkle tools, and timestamp-derived Solana PDA helpers.
- A deliberately adversarial offline fixture with duplicated, late, reordered, and temporarily unavailable records.
- Deterministic SVG and PCM WAV renderers whose bytes are hashed and reproduced by tests.
- A credential-safe Fastify gateway for live TxLINE calls.
- A CLI that generates and independently verifies the complete artifact bundle.
- An Anchor program for witness commit/reveal and proof-gated genome sealing through a raw CPI into an official TxLINE deployment.
- Unit, property, integration, UI, route, deterministic-media, and artifact-verification tests.

## Quick start

Requirements: Node.js 22+ and pnpm 10.14+.

```bash
pnpm install
pnpm demo:generate
pnpm dev
```

Open the studio at `http://localhost:5173`. The gateway listens at `http://localhost:8787`.

The default showcase is fully offline and needs no credentials. It is intentionally labeled **synthetic fixture** and **synthetic proof replay** throughout the interface.

### Production build

```bash
pnpm build
pnpm --filter @match-dna/studio preview
```

### Full validation

```bash
pnpm check
pnpm demo:verify
```

For the exact validation coverage and sandbox limitations, read [`VALIDATION_REPORT.md`](./VALIDATION_REPORT.md) and [`docs/TESTING.md`](./docs/TESTING.md).

## Repository map

```text
apps/
  studio/       React/Vite product experience
  gateway/      Credential-safe TxLINE proxy and replay API
  cli/          Artifact compiler, verifier, replay, and inspector
packages/
  core/         Canonical encoding, journal, signals, compiler, commitment model
  txline/       API/SSE normalization, proof codecs, Merkle helpers, root PDAs
  fixtures/     Adversarial showcase journal and synthetic proof vectors
  sdk/          High-level replay and proof-finality orchestration
  renderer/     Deterministic Canvas geometry and canonical SVG export
  audio/        Live witness tone plus deterministic offline PCM/WAV render
  solana/       Match DNA PDA and sealing helpers
programs/
  match-dna/    Anchor commit/reveal and proof-gated sealing program
```

## Generate the canonical artifact bundle

```bash
pnpm demo:generate
```

This writes the following files into `apps/studio/public/generated/`:

- `timeline.json`
- `proofs.json`
- `journal.json`
- `deliveries.json`
- `moments.json`
- `canonical.svg`
- `canonical.wav`
- `artifact-index.json`

Then verify every ring link, proof vector, final state, media hash, and file hash:

```bash
pnpm demo:verify
```

## Live TxLINE mode

Copy `.env.example` to `.env` and configure the **gateway only**:

```dotenv
TXLINE_NETWORK=devnet
TXLINE_BASE_URL=https://txline-dev.txodds.com
TXLINE_JWT=...
TXLINE_API_TOKEN=...
SOLANA_RPC_URL=https://api.devnet.solana.com
```

Do not place TxLINE credentials in `VITE_*` variables or browser code. The gateway exposes guarded server-side routes under `/api/txline/*`.

The public TxLINE API has changed route names across releases. `TxLineClient` therefore accepts explicit `scoreProofPath` and `oddsProofPath` overrides. Confirm those routes against the current OpenAPI document before a live demo.

## Trust statement

A TxLINE Merkle proof establishes that a specific record was included in the dataset committed by TxODDS to Solana. It does not independently prove what physically happened on the pitch, and TxODDS remains the originating oracle.

The offline showcase proves the Match DNA mechanics with clearly labeled **synthetic SHA-256 Merkle vectors**. It does not claim that those local roots exist in the referenced TxLINE PDAs. Live deployment must replace them with real API proof payloads and validated root accounts.

## Solana program

The included Anchor program supports:

1. a pre-kickoff SHA-256 witness commitment;
2. exact-preimage reveal;
3. allowlisting the published TxLINE devnet/mainnet program IDs;
4. checking that the supplied root account is owned by TxLINE;
5. forwarding the official TxLINE validation instruction bytes by raw CPI;
6. requiring TxLINE Boolean return data to equal `true`;
7. sealing timeline, proof bundle, final state, audio, and media hashes.

See [`docs/SOLANA.md`](./docs/SOLANA.md). The raw CPI strategy deliberately keeps TxLINE's current proof serialization in the official IDL instead of copying it into this program.

## Design principles

- Arrival order never defines canonical truth.
- The browser never authors canonical state.
- Amber geometry cannot change when a root arrives.
- Proof delays degrade gracefully rather than blocking playback.
- Invalid or conflicting records quarantine the ring.
- Every media-affecting choice is versioned.
- The live sound is ephemeral; the canonical score is rendered offline.
- A seed commitment binds fixture, wallet, allegiance, lens, species, generator version, and secret.
- The final phenotype can mix the revealed secret with verified match leaf hashes.

## License

MIT. See [`LICENSE`](./LICENSE).
