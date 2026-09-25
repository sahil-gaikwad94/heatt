#!/usr/bin/env bash
# Compile the pure-TS core (no JSX/DOM) and run the model harness against it.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=.tmp-model-test
rm -rf "$OUT" && mkdir -p "$OUT"
if [ ! -f "./node_modules/.bin/tsc" ]; then
  npx tsc lib/heat.ts lib/feed.ts lib/util.ts lib/store.ts lib/types.ts lib/seed/*.ts \
    --outDir "$OUT" --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node
else
  ./node_modules/.bin/tsc lib/heat.ts lib/feed.ts lib/util.ts lib/store.ts lib/types.ts lib/seed/*.ts \
    --outDir "$OUT" --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node
fi
OUT_DIR="$PWD/$OUT" NODE_PATH="$PWD/node_modules" node tests/heat-model.cjs
