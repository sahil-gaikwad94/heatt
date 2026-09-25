#!/usr/bin/env bash
# Compile the client tree (JSX → CJS) and drive it in jsdom.
# This is the suite that executes effects, canvas painting, keyboard handlers
# and modal mount order — the parts a typecheck and a build cannot see.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .tmp-client
./node_modules/.bin/tsc -p tsconfig.smoke.json
node tests/smoke/run.cjs
