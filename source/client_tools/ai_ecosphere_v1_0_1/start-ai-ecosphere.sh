#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
PYTHON_BIN="$(command -v python3 || command -v python || true)"
if [ -z "$PYTHON_BIN" ]; then
  echo "Python was not found. Serve this folder with any static web server." >&2
  exit 1
fi
echo "AI EcoSphere: http://127.0.0.1:8765"
"$PYTHON_BIN" -m http.server 8765 --bind 127.0.0.1
