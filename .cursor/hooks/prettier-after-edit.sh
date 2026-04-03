#!/usr/bin/env bash
# Cursor afterFileEdit hook — runs prettier --write on the edited file.
# Payload arrives on stdin as JSON: { "file_path": "...", ... }

set -euo pipefail

FILE_PATH=$(node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { process.stdout.write(JSON.parse(d).file_path ?? ''); }
    catch { process.stdout.write(''); }
  });
")

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve absolute path relative to workspace root (.cursor/hooks.json → ../..)
WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ABS_PATH="$WORKSPACE_ROOT/$FILE_PATH"

if [[ ! -f "$ABS_PATH" ]]; then
  exit 0
fi

cd "$WORKSPACE_ROOT"
# --ignore-unknown lets prettier silently skip files it has no parser for
pnpm exec prettier --write --ignore-unknown --log-level warn "$ABS_PATH"
