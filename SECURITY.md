# Security policy

## Report a vulnerability

Do not open a public issue for vulnerabilities involving credentials, signing, proof verification, or the Anchor program. Share a minimal reproduction privately with the project maintainers.

## Security boundaries

- TxLINE credentials belong only in the gateway process.
- `VITE_*` variables are public and must never contain secrets.
- The offline proof vectors are synthetic and must never be represented as TxLINE attestations.
- Root PDAs must be derived from proof timestamps and validated against the intended network/program.
- The Match DNA program only accepts the allowlisted TxLINE program IDs in source.
- A proof bundle is not trusted merely because it has a valid shape; the TxLINE instruction must validate it.
- Canonical artifacts are content-addressed, but their media generation code and version must also be preserved.

## Before mainnet

- audit the Anchor program;
- replace the development program ID;
- validate current TxLINE IDs and IDL;
- run real V3 score and odds proof fixtures;
- profile compute units and transaction size;
- test malformed return data and malicious remaining accounts;
- establish a program upgrade authority policy;
- add durable journal storage and operational monitoring.
