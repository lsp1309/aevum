#!/bin/bash
# Full render: short segments rendered in parallel (each skipped if already
# finished — resumable after any interruption), then concatenated, colour-graded
# (scripts/grade.txt: bloom + S-curve + cool blacks) and muxed with the mix.
#
#   scripts/render-all.sh [jobs]            16:9 → out/astrya-16x9-en.mp4
#   FORMAT=vertical scripts/render-all.sh   9:16 → out/astrya-9x16-en.mp4
#   LANG_CUT=fr …                           French cut (voice-over, titles, captions)
#   SHORT=1 …                               the 30-second film → out/astrya-16x9-en-short.mp4
#   PAGE=promo …                            the vertical promo → out/astrya-promo-9x16.mp4
#   FPS=30 …                                faster render (default 60 fps)
set -e
cd "$(dirname "$0")/.."
JOBS=${1:-3}
FPS=${FPS:-60}
SEG=${SEG:-5}            # seconds per segment (small = little work lost if interrupted)
FORMAT=${FORMAT:-horizontal}
CUT=${LANG_CUT:-en}
TAG=$([ "$FORMAT" = vertical ] && echo 9x16 || echo 16x9)-$CUT
SHORT=${SHORT:-}
CUES=scripts/cues.json; MIX=public/audio/astrya-mix-$CUT.m4a; GRADE=scripts/grade.txt; XARGS=""
if [ -n "$SHORT" ]; then
  TAG=$TAG-short; CUES=scripts/cues.short.json; MIX=public/audio/astrya-mix-short.m4a; GRADE=scripts/grade_short.txt; XARGS="--cut short"
fi
if [ "${PAGE:-}" = promo ]; then
  # the vertical promo film (promo.html): its own cues, score and grade
  FORMAT=vertical; TAG=promo-9x16; CUES=scripts/cues.promo.json; MIX=public/audio/astrya-promo.m4a; GRADE=scripts/grade_promo.txt; XARGS="--page promo"
fi
DIR=out/seg-$TAG
mkdir -p "$DIR"
DUR=$(node -e "console.log(require('./$CUES').duration)")
npx vite build --logLevel warn
N=$(python3 -c "import math; print(math.ceil($DUR/$SEG))")
# 16:9 segments with no localised text on screen (product UI only, no captions)
# are identical in every language: reuse the English ones (5 s segments).
SHARED=""
[ "$CUT" != en ] && [ "$FORMAT" != vertical ] && [ "$SEG" = 5 ] && [ -z "$SHORT" ] && SHARED=" 5 7 8 9 "
EN_DIR=out/seg-$([ "$FORMAT" = vertical ] && echo 9x16 || echo 16x9)-en
export DUR FPS SEG FORMAT DIR CUT SHARED EN_DIR XARGS
seq 0 $((N-1)) | xargs -P "$JOBS" -I{} bash -c '
  k={}; f=$DIR/seg_$k.mp4
  [ -f "$f.done" ] && exit 0
  if [[ "$SHARED" == *" $k "* ]] && [ -f "$EN_DIR/seg_$k.mp4.done" ]; then
    cp "$EN_DIR/seg_$k.mp4" "$f" && touch "$f.done" && echo "segment $k reused" && exit 0
  fi
  to=$(python3 -c "print(min($DUR, ($k+1)*$SEG))")
  want=$(python3 -c "print(round(($to - $k*$SEG) * $FPS))")
  node scripts/render.mjs --no-build --format $FORMAT --lang $CUT $XARGS --fps $FPS --crf 12 --port $((4400+k)) --from $((k*SEG)) --to $to --out $f > $DIR/log_$k.txt 2>&1
  got=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)
  if [ "$got" = "$want" ]; then touch "$f.done"; echo "segment $k done"; else echo "segment $k FAILED ($got/$want frames) — rerun to resume"; fi
'
for k in $(seq 0 $((N-1))); do
  [ -f "$DIR/seg_$k.mp4.done" ] || { echo "segment $k missing — rerun"; exit 1; }
  echo "file 'seg_$k.mp4'"
done > "$DIR/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$DIR/list.txt" -i $MIX \
  -filter_complex "[0:v]$(cat $GRADE)[v]" -map "[v]" -map 1:a \
  -c:v libx264 -preset slow -crf 15 -profile:v high -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart "out/astrya-$TAG.mp4"
echo "ALL DONE out/astrya-$TAG.mp4"
