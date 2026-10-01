#!/bin/bash
# Resumable full render: 10 s segments rendered in parallel (each skipped if
# already finished), then concatenated with the score into out/astrya.mp4.
#   scripts/render-all.sh [jobs]   (default: 3 parallel workers; FPS=30 for a faster render)
set -e
cd "$(dirname "$0")/.."
JOBS=${1:-3}
FPS=${FPS:-60}
mkdir -p out/seg
DUR=$(node -e "console.log(require('./scripts/cues.json').duration)")
npx vite build --logLevel warn
N=$(python3 -c "import math; print(math.ceil($DUR/10))")
export DUR FPS
seq 0 $((N-1)) | xargs -P "$JOBS" -I{} bash -c '
  k={}; f=out/seg/seg_$k.mp4
  [ -f "$f.done" ] && exit 0
  to=$(python3 -c "print(min($DUR, ($k+1)*10))")
  node scripts/render.mjs --no-build --fps '"$FPS"' --port $((4400+k)) --from $((k*10)) --to $to --out $f > out/seg/log_$k.txt 2>&1
  touch "$f.done"; echo "segment $k done"
'
for k in $(seq 0 $((N-1))); do
  [ -f "out/seg/seg_$k.mp4.done" ] || { echo "segment $k missing — rerun"; exit 1; }
  echo "file 'seg_$k.mp4'"
done > out/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -i public/audio/astrya-score.m4a \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/astrya.mp4
echo "ALL DONE out/astrya.mp4"
