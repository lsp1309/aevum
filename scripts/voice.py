#!/usr/bin/env python3
"""
Voice-over: renders each narration line with Kokoro (ONNX, offline) and
writes per-line WAVs + durations. Lines are placed on the film timeline by
scripts/mix.py using the anchors in scripts/narration.<lang>.json.

    python3 scripts/voice.py [en|fr|short]   # needs ~/tts/kokoro-v1.0.onnx + voices-v1.0.bin

A line is either one utterance (`say`, phrases found from pauses in the
waveform) or a list of `chunks` joined by short pauses (phrase starts are then
exact — used where on-screen words must land on a phrase). A line that would
run into the next one is re-rendered slightly faster.

With "g2p": "misaki" (English), text goes through misaki — the grapheme-to-
phoneme front end Kokoro was trained with — instead of espeak: natural stress
and intonation. Each line is one utterance, spoken in a single pass.
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG = sys.argv[1] if len(sys.argv) > 1 else "en"
MODEL = os.environ.get("KOKORO_DIR", "/home/user/tts")
spec = json.load(open(os.path.join(ROOT, "scripts", f"narration.{LANG}.json")))
k = Kokoro(os.path.join(MODEL, "kokoro-v1.0.onnx"), os.path.join(MODEL, "voices-v1.0.bin"))
out = os.path.join(ROOT, "scripts", ".vo", LANG)
G2P = None
if spec.get("g2p") == "misaki":
    from misaki import en, espeak

    G2P = en.G2P(trf=False, british=False, fallback=espeak.EspeakFallback(british=False))


def say(text, speed):
    """One utterance → (samples, sr)."""
    if G2P:
        ph, _ = G2P(text)
        return k.create(ph, voice=spec["voice"], speed=speed, is_phonemes=True)
    return k.create(text, voice=spec["voice"], speed=speed, lang=spec["lang"])
os.makedirs(out, exist_ok=True)


def trim(s, sr, thr=0.004, tail=0.12):
    idx = np.where(np.abs(s) > thr)[0]
    if not len(idx):
        return s
    a = max(0, idx[0] - int(0.02 * sr))
    b = min(len(s), idx[-1] + int(tail * sr))
    return s[a:b]


def phrases(s, sr, min_gap=0.11):
    """Starts of spoken phrases (seconds), found from pauses in the waveform."""
    hop = int(0.01 * sr)
    env = np.array([np.sqrt(np.mean(s[i:i + hop] ** 2)) for i in range(0, len(s) - hop, hop)])
    voiced = env > max(0.012, env.max() * 0.06)
    starts, gap = [0.0], 0
    for j, v in enumerate(voiced):
        if not v:
            gap += 1
        else:
            if gap * 0.01 >= min_gap and j > 0:
                starts.append(round(j * 0.01, 3))
            gap = 0
    return starts


def synth(line, speed):
    if "chunks" not in line:
        s, sr = say(line["say"], speed)
        s = trim(np.asarray(s, dtype=np.float32), sr)
        return s, sr, phrases(s, sr, line.get("min_gap", 0.11))
    parts, starts, sr = [], [], 24000
    pause = line.get("pause", spec.get("pause", 0.16))
    for j, c in enumerate(line["chunks"]):
        s, sr = say(c["say"], speed)
        s = trim(np.asarray(s, dtype=np.float32), sr, tail=0.05)
        if j:
            parts.append(np.zeros(int(c.get("pause", pause) * sr), np.float32))
        starts.append(round(sum(len(p) for p in parts) / sr, 3))
        parts.append(s)
    return np.concatenate(parts), sr, starts


meta = []
lines = spec["lines"]
spoken = [l for l in lines if not l.get("silent")]
for i, line in enumerate(lines):
    if line.get("silent"):
        continue
    speed = line.get("speed", spec["speed"])
    nxt = [l for l in spoken if l["at"] > line["at"]]
    limit = (nxt[0]["at"] - line["at"] - 0.3) if nxt else 6.0
    s, sr, ph = synth(line, speed)
    tries = 0
    while len(s) / sr > limit and tries < 4 and speed < 1.2:
        speed = min(1.2, speed * (len(s) / sr) / limit * 1.01)
        s, sr, ph = synth(line, speed)
        tries += 1
    path = os.path.join(out, f"line_{i:02d}.wav")
    sf.write(path, s, sr)
    if "phrase_offsets" in line:  # word onsets measured on the take (no pause between them to detect)
        ph = line["phrase_offsets"]
    meta.append({"i": i, "id": line["id"], "at": line["at"], "dur": round(len(s) / sr, 3), "sr": sr, "text": line["text"], "phrases": ph, "speed": round(speed, 3)})
    print(f"{i:02d} {line['at']:6.2f}→{line['at'] + len(s)/sr:6.2f}  {len(s)/sr:5.2f}s (max {limit:4.2f}, speed {speed:.2f})  phrases {ph}  {line['text']}")
json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1, ensure_ascii=False)
# film-time timing for the animation (captions / kinetic words)
timing = {}
for line in lines:  # silent lines: timing for on-screen words only, no audio
    if line.get("silent"):
        timing[line["id"]] = {"start": line["at"], "end": line["end"], "phrases": line["phrases"], "captions": line.get("captions", [])}
for m, line in zip(meta, spoken):
    ph = [round(m["at"] + p, 3) for p in m["phrases"]]
    caps = line.get("captions", [])
    # caption chunks follow the phrases; if counts differ, split time evenly
    if caps and len(caps) != len(ph):
        ph = [round(m["at"] + m["dur"] * j / len(caps), 3) for j in range(len(caps))]
    timing[m["id"]] = {"start": m["at"], "end": round(m["at"] + m["dur"], 3), "phrases": ph, "captions": caps}
timing = {l["id"]: timing[l["id"]] for l in lines}
json.dump(timing, open(os.path.join(ROOT, "src", f"narration.timing.{LANG}.json"), "w"), indent=1, ensure_ascii=False)
for a, b in zip(meta, meta[1:]):
    if a["at"] + a["dur"] > b["at"] - 0.25:
        print(f"!! overlap: line {a['i']} ends {a['at'] + a['dur']:.2f}, next starts {b['at']:.2f}")
