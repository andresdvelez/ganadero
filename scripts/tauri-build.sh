#!/usr/bin/env bash
set -eo pipefail

# Prefer Node 20 via nvm if available (avoid set -u issues when sourcing)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_AUTO_USE=0
  set +e
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
  nvm install 20 >/dev/null 2>&1 || true
  nvm use 20 >/dev/null 2>&1 || true
  set -e
fi

# Validate Node major version
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" != "20" ]; then
  echo "[tauri-build] Error: Node 20 es requerido. Detectado: $(node -v 2>/dev/null || echo desconocido)" >&2
  exit 1
fi

echo "[tauri-build] Using node: $(command -v node) ($(node -v 2>/dev/null || echo unknown))"

TAURI=1 node ./scripts/tauri-prebuild.mjs
node ./scripts/prepare-node-sidecar.mjs

# Ensure npm uses current node
TAURI=1 npm run build
node ./scripts/assert-standalone.mjs
TAURI=1 node ./scripts/tauri-postbuild.mjs

echo "[tauri-build] Done"


