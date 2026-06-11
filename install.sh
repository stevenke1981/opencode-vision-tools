#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "opencode-vision-tools installer"
node "$ROOT/scripts/install-global.mjs"
echo "Done! Restart OpenCode."