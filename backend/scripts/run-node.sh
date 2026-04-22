#!/usr/bin/env bash

set -euo pipefail

MIN_NODE_MAJOR=20
best_node=""
best_major=0

add_candidate() {
  local candidate="${1:-}"
  local version major

  if [ -z "$candidate" ] || [ ! -x "$candidate" ]; then
    return
  fi

  version="$("$candidate" -p "process.versions.node" 2>/dev/null || true)"
  if [ -z "$version" ]; then
    return
  fi

  major="${version%%.*}"
  if [ "$major" -ge "$MIN_NODE_MAJOR" ] && [ "$major" -gt "$best_major" ]; then
    best_node="$candidate"
    best_major="$major"
  fi
}

add_candidate "$(command -v node 2>/dev/null || true)"
add_candidate "/opt/homebrew/bin/node"
add_candidate "/usr/local/bin/node"

if [ -n "${NVM_BIN:-}" ]; then
  add_candidate "$NVM_BIN/node"
fi

for candidate in "$HOME"/.nvm/versions/node/*/bin/node; do
  [ -e "$candidate" ] || continue
  add_candidate "$candidate"
done

if [ -z "$best_node" ]; then
  echo "Node.js ${MIN_NODE_MAJOR}+ is required. Install Node 20 LTS or newer." >&2
  exit 1
fi

exec "$best_node" "$@"
