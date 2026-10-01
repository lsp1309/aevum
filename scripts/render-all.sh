#!/bin/bash
# Resumable full render: 10 s segments (each skipped if already finished),
# then concatenated with the score into out/astrya.mp4.
set -e
cd "$(dirname "$0")/.."
mkdir -p out/seg
DUR=$(node -e "console.log(require('./scripts/cues.json').duration)")
npx vite build --logLevel warn
N=$(python3 -c "import math; print(math.ceil($DUR/10))")
for k in $(seq 0 $((N-1))); do
  from=$((k*10))
  to=$(python3 -c "print(min($DUR, ($k+1)*10))")
  f=out/seg/seg_$k.mp4
  [ -f "$f.done" ] && continue
  node scripts/render.mjs --no-build --from $from --to $to --out $f
  touch "$f.done"
  echo "segment $((k+1))/$N done"
done
for k in $(seq 0 $((N-1))); do echo "file 'seg_$k.mp4'"; done > out/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -i public/audio/astrya-score.m4a \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/astrya.mp4
echo "ALL DONE out/astrya.mp4"
