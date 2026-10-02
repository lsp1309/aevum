#!/bin/bash
# Render every deliverable in sequence (each resumable): 16:9 + 9:16, English + French.
cd "$(dirname "$0")/.."
./scripts/render-all.sh 3 &&
  LANG_CUT=fr ./scripts/render-all.sh 3 &&
  FORMAT=vertical ./scripts/render-all.sh 3 &&
  FORMAT=vertical LANG_CUT=fr ./scripts/render-all.sh 3 &&
  echo "ALL CUTS DONE"
