#!/usr/bin/env bash
# PostToolUse hook: format TypeScript files with Prettier after edit/write.
# Reads JSON from stdin per Claude Code hooks spec.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [[ -z "$file_path" ]]; then
  exit 0
fi

# Only format .ts, .tsx, .js, .json, .md inside this project
case "$file_path" in
  *.ts|*.tsx|*.js|*.json)
    if command -v npx >/dev/null 2>&1 && [[ -f "$(dirname "$file_path")/../../package.json" || -f "$(dirname "$file_path")/package.json" ]]; then
      cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$file_path")"
      npx --no-install prettier --write "$file_path" 2>/dev/null || true
    fi
    ;;
  *schema.prisma)
    cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$file_path")"
    npx --no-install prisma format 2>/dev/null || true
    ;;
esac

exit 0
