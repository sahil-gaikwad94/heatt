#!/usr/bin/env bash
# Compile the client tree (JSX → CJS) and drive it in jsdom.
# This is the suite that executes effects, canvas painting, keyboard handlers
# and modal mount order — the parts a typecheck and a build cannot see.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .tmp-client
if [ ! -f "./node_modules/.bin/tsc" ]; then
  npx tsc -p tsconfig.smoke.json
else
  ./node_modules/.bin/tsc -p tsconfig.smoke.json
fi
node tests/smoke/run.cjs
