# Proof and material model

## Four states

### Liquid — observed

The live ring reflects what one client has observed. It can be incomplete, reordered, or late. The visual system is allowed to be expressive, high-frequency, and ephemeral.

### Amber — canonical

The interval is closed. The authoritative journal has been reconciled, deduplicated, sorted, and compiled. The geometry is immutable. Required proof anchors are pending or only partially available.

### Crystal — verified

Every anchor required by the ring's selection policy has verified. The proof fingerprint and sealed ring hash are attached. Geometry remains byte-for-byte unchanged.

### Quarantined — unresolved

A ring is quarantined when a source identity carries conflicting payload hashes, an anchor is malformed, a Merkle check fails, or the on-chain predicate rejects. Quarantined rings prevent final artifact sealing.

## Why the live and canonical views diverge

Two clients can reconnect at different times or have their tabs throttled. Treating either live view as canonical would be dishonest. Match DNA turns reconciliation into the product animation: loose liquid geometry settles into the same amber structure for everyone.

## Proof coverage

A ring should never claim that every particle is proven. Production policy should explicitly name the anchors used to compile the sealed representation, for example:

- interval closing match-result odds;
- interval closing score state;
- final goals, cards, and corners;
- selected pivotal odds checkpoints.

High-frequency unproved observations may remain in the witness journal and live performance. The proof microscope distinguishes them from verified anchors.

## TxLINE hierarchy

The integration supports the published TxLINE hierarchy conceptually:

```text
score statistic
  -> event-stat root
  -> fixture score-event subtree
  -> five-minute batch root
  -> day-indexed Solana root account
```

Odds proofs similarly connect a selected update through its odds subtree and main batch proof.

The correct root account is derived from the timestamp contained in the proof response, never from the current wall clock.

## Offline vectors

The included showcase builds local SHA-256 Merkle trees from three leaves per interval:

1. closing odds;
2. closing score/stat state;
3. ring metadata.

These vectors exercise proof-path orientation, odd-leaf duplication, delayed availability, corruption detection, bundle hashing, and the complete material transition. They are synthetic and explicitly labeled as such.

## Production verification sequence

1. Fetch the exact proof payload for a selected score sequence or odds message ID.
2. Decode and length-check every 32-byte node.
3. Derive the root PDA from the proof timestamp and configured network.
4. Fetch and verify the PDA account owner against the official TxLINE program.
5. Build the official validation instruction from the current TxLINE IDL.
6. Simulate the transaction or call the validation view.
7. For sealing, raw-CPI that exact instruction through the Match DNA program.
8. Require the return program ID and Boolean return data.
9. Store the proof-bundle hash and canonical content hashes.
