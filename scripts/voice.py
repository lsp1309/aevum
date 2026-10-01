#!/usr/bin/env python3
"""
Voice-over: renders each narration line with Kokoro (ONNX, offline) and
writes per-line WAVs + durations. Lines are placed on the film timeline by
scripts/mix.py using the anchors in scripts/narration.json.

    python3 scripts/voice.py            # needs ~/tts/kokoro-v1.0.onnx + voices-v1.0.bin
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.environ.get("KOKORO_DIR", "/home/user/tts")
spec = json.load(open(os.path.join(ROOT, "scripts", "narration.json")))
k = Kokoro(os.path.join(MODEL, "kokoro-v1.0.onnx"), os.path.join(MODEL, "voices-v1.0.bin"))
out = os.path.join(ROOT, "scripts", ".vo")
os.makedirs(out, exist_ok=True)

def trim(s, sr, thr=0.004):
    idx = np.where(np.abs(s) > thr)[0]
    if not len(idx):
        return s
    a = max(0, idx[0] - int(0.02 * sr))
    b = min(len(s), idx[-1] + int(0.12 * sr))
    return s[a:b]

def phrases(s, sr, min_gap=0.11):
    """Starts of spoken phrases (seconds), found from pauses in the waveform."""
    hop = int(0.01 * sr)
    env = np.array([np.sqrt(np.mean(s[i:i + hop] ** 2)) for i in range(0, len(s) - hop, hop)])
    voiced = env > max(0.012, env.max() * 0.06)
    starts, gap = [0.0], 0
    for k, v in enumerate(voiced):
        if not v:
            gap += 1
        else:
            if gap * 0.01 >= min_gap and k > 0:
                starts.append(round(k * 0.01, 3))
            gap = 0
    return starts

meta = []
for i, line in enumerate(spec["lines"]):
    text = line["say"]
    s, sr = k.create(text, voice=spec["voice"], speed=line.get("speed", spec["speed"]), lang=spec["lang"])
    s = trim(np.asarray(s, dtype=np.float32), sr)
    path = os.path.join(out, f"line_{i:02d}.wav")
    sf.write(path, s, sr)
    ph = phrases(s, sr)
    meta.append({"i": i, "id": line["id"], "at": line["at"], "dur": round(len(s) / sr, 3), "sr": sr, "text": line["text"], "phrases": ph})
    print(f"{i:02d} {line['at']:6.2f}→{line['at'] + len(s)/sr:6.2f}  {len(s)/sr:5.2f}s  phrases {ph}  {line['text']}")
json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1)
# film-time timing for the animation (captions / kinetic words)
timing = {}
for m, line in zip(meta, spec["lines"]):
    ph = [round(m["at"] + p, 3) for p in m["phrases"]]
    caps = line.get("captions", [])
    # caption chunks follow the detected phrases; if counts differ, split time evenly
    if caps and len(caps) != len(ph):
        ph = [round(m["at"] + m["dur"] * k / len(caps), 3) for k in range(len(caps))]
    timing[m["id"]] = {"start": m["at"], "end": round(m["at"] + m["dur"], 3), "phrases": ph if caps else [round(m["at"] + p, 3) for p in m["phrases"]], "captions": caps}
json.dump(timing, open(os.path.join(ROOT, "src", "narration.timing.json"), "w"), indent=1)
for a, b in zip(meta, meta[1:]):
    if a["at"] + a["dur"] > b["at"] - 0.25:
        print(f"!! overlap: line {a['i']} ends {a['at'] + a['dur']:.2f}, next starts {b['at']:.2f}")
