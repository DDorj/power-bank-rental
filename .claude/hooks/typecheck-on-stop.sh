#!/usr/bin/env bash
# Stop hook: run TypeScript typecheck before ending session if .ts files changed.
# Output goes to user via stderr (advisory, doesn't block).
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

# Skip if no package.json (NestJS not yet scaffolded)
if [[ ! -f "package.json" ]]; then
  exit 0
fi

# Only run if .ts files changed in this session (rough heuristic via git status)
if ! git status --porcelain 2>/dev/null | grep -qE '\.ts$'; then
  exit 0
fi

if grep -q '"typecheck"' package.json 2>/dev/null; then
  echo "→ Running typecheck..." >&2
  if ! npm run typecheck 2>&1 | tail -20 >&2; then
    echo "⚠️ typecheck failed — fix before commit" >&2
  fi
fi

exit 0
