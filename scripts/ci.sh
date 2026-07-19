#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm demo:generate
pnpm demo:verify
