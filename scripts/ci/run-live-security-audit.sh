#!/usr/bin/env bash
set -euo pipefail

HOST="127.0.0.1"
PORT="${SECURITY_AUDIT_PORT:-5173}"
BASE_URL="http://${HOST}:${PORT}"

npm run preview -- --host "$HOST" --port "$PORT" >/tmp/preview.log 2>&1 &
PREVIEW_PID=$!

cleanup() {
  kill "$PREVIEW_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for i in $(seq 1 60); do
  if curl -sf "$BASE_URL" >/dev/null; then
    break
  fi
  sleep 1
done

curl -sf "$BASE_URL" >/dev/null
TEST_URL="$BASE_URL" npm run security:audit
