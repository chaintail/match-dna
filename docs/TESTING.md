# Testing strategy

## Deterministic compiler tests

- Canonical JSON sorts keys and rejects non-finite numbers.
- Journal hashes are insensitive to exact duplicates and arrival order.
- Conflicting payloads under one source identity quarantine the interval.
- Ring compilation is deterministic.
- Proof crystallization does not alter geometry.
- Invalid material transitions are rejected.

## Signal tests

- Time-scaled fragility is greater late in a match for the same hold probability.
- Probability shock is bounded even under a near-total malformed reversal.
- Probabilities are normalized before signal calculation.

## TxLINE adapter tests

- PDA derivation is stable within one UTC day and differs by namespace.
- Mixed casing and percentage shapes normalize correctly.
- Score finalization and stat fields map correctly.
- SSE blocks and multi-line data parse correctly.
- Odd-sized Merkle trees produce valid proofs for every leaf.
- V2 proof payloads decode into Anchor-compatible byte arrays.
- Auth headers and proof query strings are emitted correctly.

## Adversarial fixture tests

- The fixture ends 2–1 with `game_finalised`.
- Duplicate, late, and reordered witness deliveries converge on the canonical timeline.
- Every synthetic proof verifies.
- At least one ring remains amber for an intentionally long delay.

## SDK tests

- A ring progresses liquid → amber → crystal at the scheduled times.
- Late roots leave the ring amber without interrupting later playback.
- A simulated browser sleep still converges on all crystal rings.
- Proof availability retries and eventually resolves.

## Media tests

- Canonical audio is byte-identical on repeat renders.
- The WAV header is valid PCM RIFF/WAVE.
- Canonical SVG is byte-identical and contains one path per ring.
- Ring geometry is deterministic across calls.

## Application tests

- Gateway health and offline/live capability reporting.
- Gateway fixture snapshots and input validation.
- Live routes remain unavailable without credentials.
- Studio renders all signal, proof, and witness inspector modes.
- Vite production build succeeds.
- CLI generates and independently verifies the full artifact bundle.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm demo:generate
pnpm demo:verify
```

The root tasks are configured with low concurrency so they remain reliable in constrained CI and sandbox environments.
