#!/bin/bash
# Render both deliverables in sequence (each resumable).
cd "$(dirname "$0")/.."
./scripts/render-all.sh 3 && FORMAT=vertical ./scripts/render-all.sh 3 && echo "BOTH DONE"
