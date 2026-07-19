# Architecture

## Data flow

```text
TxLINE score SSE ─┐
                  ├─> credential-safe gateway ─> append-only journal
TxLINE odds SSE ──┘                              │
                                                 ├─> witness renderer (liquid)
                                                 │
                              interval closes ───┤
                                                 v
                                  reconciliation + canonical sort
                                                 │
                                                 v
                                      deterministic ring compiler
                                                 │
                                      canonical ring (amber)
                                                 │
                         TxLINE proof API + Solana root account
                                                 │
                                                 v
                                      proof validation / CPI
                                                 │
                                      sealed ring (crystal)
                                                 │
                                                 v
                         canonical SVG + WAV + timeline/media hashes
```

## Trust domains

### Browser

The browser renders witness state and canonical manifests. It is intentionally not trusted to authenticate to TxLINE, decide canonical ordering, or determine proof validity for settlement.

### Gateway

The gateway owns TxLINE credentials, handles historical/proof calls, and is the natural place to persist the immutable journal. The included app keeps persistence in memory because the showcase is an offline replay; a deployment should append raw payloads to durable object storage or a database before normalization.

### Compiler

`@match-dna/core` accepts normalized records and emits versioned ring manifests. It ignores `receivedTimestamp` when ordering canonical records. The sort key is source timestamp, source rank, source ID, then payload hash. Exact duplicates disappear; one source identity with multiple payload hashes quarantines the interval.

### Proof resolver

`@match-dna/sdk` models proof availability as eventual. A closed ring becomes amber immediately after reconciliation. Proof retries use bounded exponential backoff and can be aborted. A delayed or temporarily unavailable root never mutates canonical geometry.

### Solana

The TxLINE program is the verifier of its own record/proof encoding. The Match DNA program can forward official validation instruction bytes by CPI, inspect the Boolean return value, and seal content hashes only on success.

## Canonical ring inputs

A ring hash commits to:

- schema/compiler/selection/generator versions;
- fixture and UTC-aligned interval;
- previous ring hash;
- journal head hash;
- opening and closing state;
- uncertainty, fragility, draw threat, volatility, shock, and dominance;
- deterministic geometry and audio parameters;
- interval event counts.

Proof anchors are added later and create a separate sealed-ring hash. This is how amber can become crystal without changing its shape.

## Replay determinism

The showcase replay intentionally changes delivery time and order. It includes exact duplicates and records that arrive after neighboring records. The canonical compiler receives the fully reconciled interval, so replaying the same journal always returns the same timeline hash.

Canonical output is a manifest, not a screen recording. Browser Canvas frames and live Web Audio can differ across machines. The official still and score are generated from the manifest through deterministic SVG and PCM renderers.
