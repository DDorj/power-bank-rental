#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/backend"
exec npm run start:prod
