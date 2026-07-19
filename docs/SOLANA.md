# Solana and Anchor program

## Program purpose

The Match DNA program is a minimal provenance and sealing layer. It does not duplicate TxLINE's oracle logic.

### `initialize_witness`

Creates a PDA derived from:

```text
"witness" + owner public key + fixture hash
```

It stores the SHA-256 commitment, slot, timestamp, fixture hash, and kickoff time.

### `reveal_witness`

Accepts the canonical commitment preimage and requires its SHA-256 digest to equal the stored commitment. The preimage binds:

- domain separator;
- fixture ID;
- wallet;
- allegiance;
- lens;
- species;
- generator version;
- secret.

### `verify_txline_and_seal`

1. Requires the witness reveal.
2. Accepts one of the official TxLINE devnet/mainnet program IDs.
3. Requires the supplied root account to be owned by that program.
4. Forwards opaque validation instruction bytes by raw CPI.
5. Requires return data to come from the TxLINE program and equal Borsh `true` (`[1]`).
6. Seals the timeline, proof bundle, final state, canonical audio, and canonical media hashes in a genome PDA.

## Why raw CPI

TxLINE owns the canonical proof schema and instruction codec. Reimplementing that codec in Match DNA would create drift and increase audit surface. The TypeScript client should build instruction bytes from the current official IDL; the Match DNA program treats them as opaque and verifies the result.

## Program ID

The generated development program ID is in [`PROGRAM_ID.txt`](./PROGRAM_ID.txt) and is aligned across:

- `Anchor.toml`;
- `declare_id!`;
- `@match-dna/solana`;
- the bundled IDL.

Generate a new keypair and replace the ID before deploying from a real team wallet.

## Build and test locally

This requires Rust, Solana CLI, and Anchor CLI, which are not required for the TypeScript-only offline showcase.

```bash
anchor build
anchor test
```

Then test the real path on devnet:

1. fund a development wallet;
2. deploy Match DNA;
3. create a witness commitment;
4. fetch a real TxLINE proof and build its validation instruction;
5. simulate the raw CPI transaction;
6. send the transaction with a suitable compute budget;
7. inspect the genome account hashes.

## Security notes

- Never accept an arbitrary oracle program; keep the allowlist current.
- Root ownership is necessary but not sufficient—the TxLINE CPI must succeed and return `true`.
- Cap preimage and CPI data lengths.
- Profile transaction size and compute units with V3 multiproofs.
- Keep sealing one-way.
- Verify the exact return-data encoding against the deployed TxLINE program before mainnet use.
