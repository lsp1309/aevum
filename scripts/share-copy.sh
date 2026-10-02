#!/bin/bash
# Two-pass H.264 copy of a master that fits under ~28 MB (messaging / upload limits).
#   scripts/share-copy.sh out/astrya-16x9-en.mp4 out/ASTRYA-16x9-EN-60fps.mp4
set -e
IN=$1; OUT=$2; MB=${MB:-27.5}
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
V=$(python3 -c "print(int($MB * 8388608 / $DUR / 1000 - 165))")
P=$(mktemp -d)/pass
nice ffmpeg -v error -y -i "$IN" -c:v libx264 -preset slow -b:v ${V}k -pass 1 -passlogfile "$P" -an -f mp4 /dev/null
nice ffmpeg -v error -y -i "$IN" -c:v libx264 -preset slow -b:v ${V}k -pass 2 -passlogfile "$P" -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 160k -movflags +faststart "$OUT"
ls -la "$OUT"
