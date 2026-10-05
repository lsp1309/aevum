#!/usr/bin/env python3
"""
ASTRYA — Prompt (remix.html, 16:9): music + sound design (no voice).

    node scripts/render.mjs --dev --page remix --cues scripts/cues.remix2.json
    python3 scripts/mix_remix.py           # → public/audio/astrya-remix2.m4a

124 BPM. Logo: riser and impact. Pills and click: ticks. The prompt: soft
keyboard ticks over a filtered pulse that opens up. Send: a whoosh into the
first drop as the card lands. The second prompt pulls back to the filtered
pulse; the neon transform is the big drop. Sign-off: one open chord.
"""
import json, os, subprocess
import numpy as np
import soundfile as sf
from audiolib import SR, rng, hz, env, lp, hp, bp, saw_pad, pluck, keys, kick, clap, hat, boom, noise_sweep, reverse_swell, click_s, tick_s, chime_s, reverb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.remix2.json")))
S = sheet["chapters"]
DUR = float(sheet["duration"])
N = int((DUR + 1.0) * SR)
music = np.zeros((2, N)); drums = np.zeros((2, N)); sfx = np.zeros((2, N))
BEAT = 60 / 124
DROP1 = S["card"] + 0.05
DROP2 = S["agents"]


def place(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= N or gain == 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    sig = sig[: N - i]
    lg, rg = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[0, i:i + len(sig)] += sig * gain * lg
    buf[1, i:i + len(sig)] += sig * gain * rg


def pad(notes, t0, t1, gain, bright=3.0, a=0.3, r=0.8):
    n = int((t1 - t0 + r) * SR)
    L, R = saw_pad([hz(x) for x in notes], t1 - t0 + r, bright)
    e = env(n, a, r); i = int(t0 * SR); m = min(n, N - i)
    music[0, i:i + m] += (L * e)[:m] * gain; music[1, i:i + m] += (R * e)[:m] * gain


def grid(t0, t1, step):
    return np.arange(t0, t1 - 1e-6, step)


def bass(note, t, d, g):
    n = int(d * SR); tt = np.arange(n) / SR; f = hz(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.004, 0.05) * np.exp(-tt * 3)
    place(music, s, t, g)


def keytick(g):
    n = int(0.05 * SR); tt = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 2500, 8000) * np.exp(-tt * 400) + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 200) * 0.3) * g * 0.08


PROG = [("A", ["A3", "C#4", "E4", "B4"]), ("F#", ["F#3", "A3", "C#4", "E4"]), ("D", ["D3", "F#3", "A3", "E4"]), ("E", ["E3", "Ab3", "B3", "F#4"])]
ROOT_N = {"A": "A1", "F#": "F#1", "D": "D2", "E": "E2"}
bars = [(DROP1 + 4 * BEAT * k, PROG[k % 4]) for k in range(-6, 12)]
def chord(t):
    c = bars[0][1]
    for t0, ch in bars:
        if t >= t0 - 1e-6:
            c = ch
    return c

# logo
place(sfx, noise_sweep(0.5, 400, 8000, 0.12), 0.0)
place(drums, boom(0.9), S["word"])
pad(["A2", "E3", "A3", "C#4"], 0.1, S["logoOut"] + 0.2, 0.07, bright=2.5, a=0.2, r=0.4)
for t, n in zip([S["ring"] + 0.6, S["word"] + 0.25], ["E6", "A6"]):
    place(music, keys(hz(n), 2.0), t, 0.06)
# pills → prompt: filtered pulse that opens
F0, F1 = S["pills"], DROP1
for t in grid(F0, F1, BEAT):
    k = (t - F0) / (F1 - F0)
    place(drums, kick(0.35 + 0.35 * k, deep=1.3), t)
for i, t in enumerate(grid(F0, F1, BEAT / 2)):
    k = (t - F0) / (F1 - F0)
    nm, ch = chord(t)
    s = pluck(hz(ch[[0, 2, 1, 3][i % 4]]) * 2, 0.3, 0.6)
    place(music, lp(s, 900 + 5000 * k ** 2), t, 0.04 + 0.03 * k, pan=0.3 * np.sin(i))
    bass(ROOT_N[nm], t, BEAT / 2 - 0.02, 0.08 * k)
L, R = reverse_swell(0.9, ["A3", "E4", "A4", "C#5"], 0.18)
place(music, L, DROP1 - 0.9, 1, -0.3); place(music, R, DROP1 - 0.9, 1, 0.3)
place(sfx, noise_sweep(1.0, 300, 9000, 0.13), DROP1 - 1.0)


def groove(t0, t1, full=1.0):
    for t in grid(t0, t1, BEAT):
        place(drums, kick(0.95), t)
    for t in grid(t0 + BEAT, t1, 2 * BEAT):
        place(drums, clap(0.4 * full), t)
    for t in grid(t0, t1, BEAT / 2):
        place(drums, hat(0.11 if round((t - t0) / (BEAT / 2)) % 2 else 0.06, open_=round((t - t0) / (BEAT / 2)) % 2 == 1), t, pan=0.25)
    for i, t in enumerate(grid(t0, t1, BEAT / 4)):
        nm, ch = chord(t)
        if i % 2 == 0:
            bass(ROOT_N[nm], t, BEAT / 4, 0.14 * full)
        place(music, pluck(hz(ch[i % 4]) * 2, 0.25, 1.0), t, 0.022 * full, pan=0.5 * np.sin(i * 0.7))
    for t0b, (nm, ch) in bars:
        if t0 <= t0b < t1:
            pad(ch, t0b, min(t0b + 4 * BEAT, t1), 0.05 * full, bright=3.5, a=0.02, r=0.3)


# drop 1: the card
place(drums, boom(1.1), DROP1)
groove(DROP1, S["pan"] + 0.1)
# the week: a lighter groove
for t in grid(S["week"], DROP2, BEAT):
    place(drums, kick(0.7), t)
for i, t in enumerate(grid(S["week"], DROP2, BEAT / 2)):
    nm, ch = chord(t)
    place(music, pluck(hz(ch[i % 4]) * 2, 0.3, 0.9), t, 0.04, pan=0.4 * np.sin(i))
# second prompt: back to the filtered pulse
for i, t in enumerate(grid(S["pan"] + 0.1, S["week"], BEAT / 2)):
    nm, ch = chord(t)
    place(music, lp(pluck(hz(ch[i % 4]) * 2, 0.3, 0.6), 1500), t, 0.045)
for t in grid(S["pan"] + 0.1, S["week"], BEAT):
    place(drums, kick(0.5, deep=1.3), t)
L, R = reverse_swell(0.8, ["C#4", "E4", "A4", "B4"], 0.2)
place(music, L, DROP2 - 0.8, 1, -0.3); place(music, R, DROP2 - 0.8, 1, 0.3)
# drop 2: neon
place(drums, boom(1.3), DROP2)
groove(DROP2, S["out"] + 0.05, 1.2)
pad(["A4", "C#5", "E5", "Ab5"], DROP2, S["out"], 0.025, bright=6, a=0.02, r=0.3)
# sign-off
place(drums, boom(0.8), S["sign"] - 0.05)
pad(["A1", "A2", "E3"], S["sign"] - 0.05, DUR - 0.2, 0.1, bright=2, a=0.02, r=1.4)
pad(["C#4", "E4", "Ab4", "B4"], S["sign"], DUR - 0.2, 0.06, bright=3, a=0.1, r=1.4)
for t, n in zip([S["sign"] + 0.2, S["sign"] + 0.6, S["sign"] + 1.0], ["E5", "A5", "C#6"]):
    place(music, keys(hz(n), 2.6), t, 0.05, pan=0.2)

# sfx from cues
pent = [hz(n) for n in ["A5", "C#6", "E6", "F#6", "A6"]]
ticks = [hz(n) for n in ["E7", "A6", "C#7"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = max(0.1, min(c.get("dur") or 1.0, 3.0)); pan = float(np.sin(k * 1.7) * 0.4)
    if ty == "tick":
        place(sfx, keytick(g), t0, pan=pan * 0.5)
    elif ty == "click":
        place(sfx, click_s(g * 1.4), t0, pan=0.1)
    elif ty == "hit":
        place(sfx, boom(0.3 * g), t0)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 4000, 0.12 * g, "bell"), t0, pan=pan)
    elif ty == "sweep":
        place(sfx, noise_sweep(d, 2000, 10000, 0.08 * g, "bell"), t0, pan=pan)
    elif ty == "chime":
        place(sfx, chime_s(g, pent[k % len(pent)]), t0, pan=pan * 0.6)

wet = np.stack([reverb((music + 0.4 * sfx)[0], 0.0, 1.2), reverb((music + 0.4 * sfx)[1], 2.3, 1.2)])
mix = music * 0.9 + wet * 0.45 + drums + sfx * 0.9
mix = np.stack([hp(mix[0], 25), hp(mix[1], 25)])
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.7) / np.tanh(1.7)
t_all = np.arange(N) / SR
mix *= np.clip((DUR + 0.1 - t_all) / 0.8, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-remix2.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-remix2.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-13:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
