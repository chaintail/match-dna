# Contributing

Use Node.js 22+ and pnpm 10.14+.

```bash
pnpm install
pnpm check
pnpm demo:verify
```

Keep these invariants:

- canonical ordering never uses arrival time;
- a ring's geometry cannot change after amber;
- proof anchors are explicit and versioned;
- synthetic and real proofs are never conflated;
- new media renderers must be deterministic or clearly labeled witness-only;
- any TxLINE endpoint or instruction change requires a fixture and regression test.

Changes to the compiler, selection policy, geometry, or audio grammar must bump the corresponding version string so old artifacts remain reproducible.
