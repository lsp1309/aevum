#!/bin/bash
# Full render: short segments rendered in parallel (each skipped if already
# finished — resumable after any interruption), then concatenated, colour-graded
# (scripts/grade.txt: bloom + S-curve + cool blacks) and muxed with the mix.
#
#   scripts/render-all.sh [jobs]            16:9 → out/astrya-16x9.mp4
#   FORMAT=vertical scripts/render-all.sh   9:16 → out/astrya-9x16.mp4
#   FPS=30 …                                faster render (default 60 fps)
set -e
cd "$(dirname "$0")/.."
JOBS=${1:-3}
FPS=${FPS:-60}
SEG=${SEG:-5}            # seconds per segment (small = little work lost if interrupted)
FORMAT=${FORMAT:-horizontal}
TAG=$([ "$FORMAT" = vertical ] && echo 9x16 || echo 16x9)
DIR=out/seg-$TAG
mkdir -p "$DIR"
DUR=$(node -e "console.log(require('./scripts/cues.json').duration)")
npx vite build --logLevel warn
N=$(python3 -c "import math; print(math.ceil($DUR/$SEG))")
export DUR FPS SEG FORMAT DIR
seq 0 $((N-1)) | xargs -P "$JOBS" -I{} bash -c '
  k={}; f=$DIR/seg_$k.mp4
  [ -f "$f.done" ] && exit 0
  to=$(python3 -c "print(min($DUR, ($k+1)*$SEG))")
  node scripts/render.mjs --no-build --format $FORMAT --fps $FPS --crf 12 --port $((4400+k)) --from $((k*SEG)) --to $to --out $f > $DIR/log_$k.txt 2>&1
  touch "$f.done"; echo "segment $k done"
'
for k in $(seq 0 $((N-1))); do
  [ -f "$DIR/seg_$k.mp4.done" ] || { echo "segment $k missing — rerun"; exit 1; }
  echo "file 'seg_$k.mp4'"
done > "$DIR/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$DIR/list.txt" -i public/audio/astrya-mix.m4a \
  -filter_complex "[0:v]$(cat scripts/grade.txt)[v]" -map "[v]" -map 1:a \
  -c:v libx264 -preset slow -crf 15 -profile:v high -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart "out/astrya-$TAG.mp4"
echo "ALL DONE out/astrya-$TAG.mp4"
