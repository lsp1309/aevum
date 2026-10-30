#!/usr/bin/env python3
"""
Voix off professionnelle du film « Entreprises » (ElevenLabs, français, homme).

Needs ELEVENLABS_API_KEY in the environment and api.elevenlabs.io allowed by the
network policy. Nothing here falls back to another engine: if the key or the
host is missing, the script stops and says so.

    python3 scripts/voice_pro.py voices              # French male voices of the shared library + their previews
    python3 scripts/voice_pro.py add <public_owner_id> <voice_id> <name>   # copy a shared voice into your account
    python3 scripts/voice_pro.py audition <id1,id2,…> # same three test lines with each voice → scripts/.vo/pro/audition/
    python3 scripts/voice_pro.py render [voice_id]    # the full narration → scripts/.vo/pro/ + src/narration.timing.entreprises.pro.json

The narration lives in scripts/narration.entreprises.pro.json. Each line is sent
with the lines around it (previous_text / next_text) so the intonation flows
from one line to the next, with the settings of its « tone ». Phrase starts are
read from the character timestamps the API returns, so the picture can follow
the voice exactly. Then: python3 scripts/mix_entreprises.py (VO=pro by default
once scripts/.vo/pro/meta.json exists).
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = os.path.join(ROOT, "scripts", "narration.entreprises.pro.json")
OUT = os.path.join(ROOT, "scripts", ".vo", "pro")
API = "https://api.elevenlabs.io"
SR = 44100
AUDITION = ["hook", "meet", "draft"]  # an intriguing line, the reveal, a demo line


def die(msg):
    print("✗ " + msg, file=sys.stderr)
    sys.exit(1)


def key():
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not k:
        die("ELEVENLABS_API_KEY is not set (add it to the environment's secrets, then start a new session).")
    return k


def call(method, path, body=None, query=None):
    url = API + path + ("?" + urllib.parse.urlencode(query) if query else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"xi-api-key": key(), "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        die(f"{method} {path} → HTTP {e.code}: {e.read()[:400].decode(errors='replace')}")
    except urllib.error.URLError as e:
        die(f"{method} {path} → {e.reason} (is api.elevenlabs.io allowed by the network policy?)")


def spoken(line):
    return line.get("say", line["text"])


def plain(text):
    return " ".join(text.replace("|", " ").split())


def mp3_to_array(mp3_bytes):
    with tempfile.NamedTemporaryFile(suffix=".mp3") as f:
        f.write(mp3_bytes)
        f.flush()
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f.name, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def synth(spec, voice_id, line, prev_text="", next_text=""):
    """One line → (samples at SR, phrase starts in seconds, trimmed)."""
    text = spoken(line)
    sent = plain(text)
    tone = spec["tones"][line.get("tone", "demo")]
    body = {
        "text": sent,
        "model_id": spec.get("model", "eleven_multilingual_v2"),
        "voice_settings": {k: tone[k] for k in ("stability", "similarity_boost", "style") if k in tone} | {"use_speaker_boost": True},
        "previous_text": prev_text,
        "next_text": next_text,
        "seed": spec.get("seed", 7),
        "language_code": "fr",
    }
    if "speed" in tone:
        body["voice_settings"]["speed"] = tone["speed"]
    r = call("POST", f"/v1/text-to-speech/{voice_id}/with-timestamps", body, {"output_format": "mp3_44100_128"})
    audio = mp3_to_array(base64.b64decode(r["audio_base64"]))
    al = r.get("alignment") or r.get("normalized_alignment") or {}
    starts_c = al.get("character_start_times_seconds", [])
    # phrase starts: character index of each « | » segment in the text actually sent
    idx, pos = [], 0
    for seg in text.split("|"):
        seg = " ".join(seg.split())
        if not seg:
            continue
        i = sent.find(seg, pos)
        idx.append(max(i, 0))
        pos = max(i, 0) + len(seg)
    phrases = [float(starts_c[i]) if i < len(starts_c) else 0.0 for i in idx]
    # trim leading / trailing silence, keep a natural tail
    env = np.abs(audio) > 0.006
    nz = np.where(env)[0]
    a = max(0, nz[0] - int(0.03 * SR)) if len(nz) else 0
    b = min(len(audio), nz[-1] + int(0.18 * SR)) if len(nz) else len(audio)
    shift = a / SR
    phrases = [round(max(0.0, p - shift), 3) for p in phrases]
    phrases[0] = 0.0
    return audio[a:b], phrases


def cmd_voices():
    r = call("GET", "/v1/shared-voices", query={"language": "fr", "gender": "male", "page_size": 40, "sort": "trending"})
    d = os.path.join(OUT, "audition", "previews")
    os.makedirs(d, exist_ok=True)
    for v in r.get("voices", []):
        name = v.get("name", "?")
        line = f"{v.get('voice_id')}  owner={v.get('public_owner_id')}  {name}  accent={v.get('accent')}  age={v.get('age')}  use={v.get('use_case')}  {v.get('descriptive', '')}"
        print(line)
        url = v.get("preview_url")
        if url:
            safe = "".join(c if c.isalnum() else "_" for c in name)[:40]
            try:
                urllib.request.urlretrieve(url, os.path.join(d, f"{safe}_{v.get('voice_id')}.mp3"))
            except Exception as e:  # a missing preview is not fatal
                print("   (preview not downloaded:", e, ")")
    print("previews →", d)


def cmd_add(owner, voice_id, name):
    r = call("POST", f"/v1/voices/add/{owner}/{voice_id}", {"new_name": name})
    print("added:", r)


def cmd_audition(ids):
    spec = json.load(open(SPEC))
    lines = {l["id"]: l for l in spec["lines"]}
    d = os.path.join(OUT, "audition")
    os.makedirs(d, exist_ok=True)
    for vid in ids:
        parts = []
        for lid in AUDITION:
            audio, _ = synth(spec, vid, lines[lid])
            parts += [audio, np.zeros(int(0.7 * SR), np.float32)]
        path = os.path.join(d, f"audition_{vid}.wav")
        sf.write(path, np.concatenate(parts), SR)
        print("✓", path)


def cmd_render(voice_id):
    spec = json.load(open(SPEC))
    voice_id = voice_id or spec.get("voice_id")
    if not voice_id:
        die("no voice: pass a voice_id or set « voice_id » in scripts/narration.entreprises.pro.json")
    os.makedirs(OUT, exist_ok=True)
    lines = spec["lines"]
    meta, timing = [], {}
    for i, line in enumerate(lines):
        prev_text = plain(spoken(lines[i - 1])) if i else ""
        next_text = plain(spoken(lines[i + 1])) if i + 1 < len(lines) else ""
        audio, phrases = synth(spec, voice_id, line, prev_text, next_text)
        dur = len(audio) / SR
        nxt = lines[i + 1]["at"] if i + 1 < len(lines) else None
        flag = f"  !! runs into the next line ({line['at'] + dur:.2f} > {nxt:.2f})" if nxt and line["at"] + dur > nxt - 0.2 else ""
        sf.write(os.path.join(OUT, f"line_{i:02d}.wav"), audio, SR)
        meta.append({"i": i, "id": line["id"], "at": line["at"], "dur": round(dur, 3), "sr": SR, "text": line["text"].replace("|", ""), "phrases": phrases})
        timing[line["id"]] = {"start": line["at"], "end": round(line["at"] + dur, 3), "phrases": [round(line["at"] + p, 3) for p in phrases]}
        print(f"{i:02d} {line['at']:6.2f}→{line['at'] + dur:6.2f}  {dur:5.2f}s  {plain(line['text'])}{flag}")
    json.dump({"voice_id": voice_id, "model": spec.get("model"), "lines": meta}, open(os.path.join(OUT, "meta.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(timing, open(os.path.join(ROOT, "src", "narration.timing.entreprises.pro.json"), "w"), indent=1, ensure_ascii=False)
    print("✓ narration →", OUT)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("voices", "add", "audition", "render"):
        print(__doc__)
        sys.exit(0)
    if a[0] == "voices":
        cmd_voices()
    elif a[0] == "add":
        cmd_add(*a[1:4])
    elif a[0] == "audition":
        cmd_audition([x for x in ",".join(a[1:]).split(",") if x])
    else:
        cmd_render(a[1] if len(a) > 1 else None)
