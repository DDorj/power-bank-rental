#!/usr/bin/env bash
# PreToolUse hook: block git commits/pushes with --no-verify or other dangerous flags.
# Reads JSON from stdin. Exits non-zero with stderr message to block.
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ -z "$command" ]]; then
  exit 0
fi

# Block dangerous git flags
if echo "$command" | grep -qE '(\-\-no\-verify|\-\-no\-gpg\-sign)'; then
  echo "Blocked: --no-verify / --no-gpg-sign requires explicit user approval. Investigate the failing hook instead." >&2
  exit 2
fi

# Block force push to protected branches
if echo "$command" | grep -qE 'git push.*--force.*(main|master|develop|production)'; then
  echo "Blocked: force push to protected branch. Open a PR instead." >&2
  exit 2
fi

# Block prisma migrate reset on non-local databases
if echo "$command" | grep -qE 'prisma migrate reset' && echo "$command" | grep -vqE '(localhost|127\.0\.0\.1|@db:)'; then
  echo "Blocked: prisma migrate reset against non-local DB. Confirm DATABASE_URL points to localhost." >&2
  exit 2
fi

exit 0
