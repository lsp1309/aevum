#!/bin/bash
# Stop a running render-all.sh (and its workers / browsers / encoders).
for pat in "render-all.sh" "xargs -P" "scripts/render.mjs" "headless_shell" "ffmpeg -y -loglevel error -f image2pipe"; do
  for p in $(pgrep -f -- "$pat"); do
    [ "$p" != "$$" ] && [ "$p" != "$PPID" ] && kill "$p" 2>/dev/null
  done
done
echo "stopped"
