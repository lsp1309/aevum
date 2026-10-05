#!/usr/bin/env python3
"""
ASTRYA — Launch (astria.html, 16:9): cinematic score + sound design (no voice).

    node scripts/render.mjs --page astria --cues scripts/cues.astria.json
    python3 scripts/mix_astria.py           # → public/audio/astrya-astria.m4a

D minor, 120 BPM. Space: a sub drone, a cold shimmer, the signal's chime.
The dive: risers, whooshes, a low pulse over the city, the impact on the
flash. The interface: a light pulse and plucked arpeggios. Overload: the
groove drops out for a dissonant cluster and an accelerating heartbeat; the
shockwave is the big drop. Finale: open chords, the logo's impact, air.
"""
import json, os, subprocess
import numpy as np
import soundfile as sf
from audiolib import SR, rng, hz, env, lp, hp, bp, saw_pad, pluck, keys, kick, tom, clap, hat, boom, noise_sweep, reverse_swell, click_s, chime_s, reverb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.astria.json")))
S = sheet["chapters"]
DUR = float(sheet["duration"])
N = int((DUR + 1.0) * SR)
music = np.zeros((2, N)); drums = np.zeros((2, N)); sfx = np.zeros((2, N))
BEAT = 0.5


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


def sub(note, t0, t1, g, a=1.0, r=1.0):
    n = int((t1 - t0 + r) * SR); tt = np.arange(n) / SR; f = hz(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt + 0.3)) * env(n, a, r)
    place(music, s, t0, g)


def grid(t0, t1, step):
    return np.arange(t0, t1 - 1e-6, step)


def bass(note, t, d, g):
    n = int(d * SR); tt = np.arange(n) / SR; f = hz(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.004, 0.05) * np.exp(-tt * 3)
    place(music, s, t, g)


def keytick(g):
    n = int(0.05 * SR); tt = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 2500, 8000) * np.exp(-tt * 400) + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 200) * 0.3) * g * 0.08


PROG = [("D", ["D3", "F3", "A3", "E4"]), ("Bb", ["Bb2", "D3", "F3", "C4"]), ("F", ["F3", "A3", "C4", "G4"]), ("C", ["C3", "E3", "G3", "D4"])]
ROOT_N = {"D": "D2", "Bb": "Bb1", "F": "F2", "C": "C2"}
GRID0 = S["ui"]
def chord(t):
    k = int(np.floor((t - GRID0) / (4 * BEAT) + 1e-6)) % 4
    return PROG[k]


# ── I. space ───────────────────────────────────────────────────────────────
sub("D1", 0.0, S["dive"], 0.16, a=2.5, r=0.6)
pad(["D2", "A2", "D3", "F3"], 0.0, S["dive"] + 0.4, 0.06, bright=1.8, a=2.5, r=0.6)
pad(["A4", "D5", "E5"], 1.2, S["dive"] + 0.3, 0.018, bright=7, a=2.0, r=0.5)
place(sfx, noise_sweep(3.0, 200, 1500, 0.05, "bell"), 0.0)
place(music, keys(hz("A5"), 3.0), S["signal"], 0.06, pan=0.3)
place(music, keys(hz("D6"), 3.0), S["signal"] + 0.35, 0.045, pan=0.3)
L, R = reverse_swell(1.0, ["D4", "A4", "D5", "F5"], 0.16)
place(music, L, S["dive"] - 1.0, 1, -0.3); place(music, R, S["dive"] - 1.0, 1, 0.3)

# ── II. the dive and the city ─────────────────────────────────────────────
place(drums, boom(0.9), S["dive"])
place(sfx, noise_sweep(S["city"] - S["dive"], 200, 9000, 0.16, "rise"), S["dive"])
place(drums, boom(0.6), S["city"])
sub("D1", S["city"], S["flash"], 0.14, a=0.05, r=0.1)
for i, t in enumerate(grid(S["city"], S["flash"], BEAT / 2)):
    place(drums, kick(0.5 + 0.4 * i / 10, deep=1.3), t)
    place(music, lp(pluck(hz(["D4", "A4", "F4", "A4"][i % 4]) * 2, 0.25, 0.8), 1200 + 600 * i), t, 0.05, pan=0.4 * np.sin(i))
place(sfx, noise_sweep(1.0, 400, 10000, 0.14, "rise"), S["flash"] - 1.0)

# ── III. the burst, the interface ─────────────────────────────────────────
place(drums, boom(1.2), S["flash"])
pad(["D3", "A3", "D4", "F4", "A4"], S["flash"], S["ui"] + 0.5, 0.05, bright=4, a=0.02, r=0.8)
for i in range(14):
    place(music, pluck(hz(["D5", "F5", "A5", "C6", "D6", "E6", "F6"][i % 7]), 0.6, 1.2), S["burst"] + 0.2 + i * 0.07, 0.03, pan=np.sin(i * 1.3) * 0.7)
D_END = S["wow"]
for t in grid(S["ui"], D_END, BEAT):
    place(drums, kick(0.55), t)
for t in grid(S["ui"] + BEAT / 2, D_END, BEAT):
    place(drums, hat(0.07, open_=True), t, pan=0.25)
for t in grid(S["ui"] + BEAT, D_END, 2 * BEAT):
    place(drums, clap(0.18), t)
for i, t in enumerate(grid(S["ui"], D_END, BEAT / 4)):
    nm, ch = chord(t)
    if i % 2 == 0:
        bass(ROOT_N[nm], t, BEAT / 4, 0.09)
    place(music, pluck(hz(ch[[0, 2, 1, 3][i % 4]]) * 2, 0.25, 0.9), t, 0.022, pan=0.5 * np.sin(i * 0.7))
for k, t0 in enumerate(grid(S["ui"], D_END, 4 * BEAT)):
    nm, ch = chord(t0)
    pad(ch, t0, min(t0 + 4 * BEAT, D_END), 0.035, bright=3, a=0.05, r=0.3)

# ── IV. overload → shockwave → order → tunnel ─────────────────────────────
place(drums, boom(1.0), S["wow"] + 0.28)
pad(["D2", "Eb3", "A3", "D4", "Eb4"], S["wow"] + 0.28, S["wave"], 0.06, bright=5, a=0.4, r=0.1)
sub("D1", S["wow"] + 0.28, S["wave"], 0.15, a=0.5, r=0.05)
hb = S["overload"]; step = 0.5
while hb < S["core"]:
    place(drums, kick(0.75, deep=1.4), hb); place(drums, kick(0.45, deep=1.4), hb + 0.16)
    hb += step; step = max(0.22, step * 0.86)
for t in grid(S["core"], S["wave"], 0.075):
    place(drums, tom(70 + 20 * (t - S["core"]) / (S["wave"] - S["core"]), 0.35), t)
place(sfx, noise_sweep(S["wave"] - S["overload"], 300, 12000, 0.13, "rise"), S["overload"])
L, R = reverse_swell(0.8, ["D3", "A3", "D4", "F4", "A4"], 0.24)
place(music, L, S["wave"] - 0.8, 1, -0.3); place(music, R, S["wave"] - 0.8, 1, 0.3)
place(drums, boom(1.6), S["wave"])
place(drums, boom(0.9), S["wave"] + 0.02)
B_END = S["dash"]
G0 = S["wave"]
for t in grid(G0, B_END, BEAT):
    place(drums, kick(1.0), t)
for t in grid(G0 + BEAT, B_END, 2 * BEAT):
    place(drums, clap(0.45), t)
for i, t in enumerate(grid(G0, B_END, BEAT / 2)):
    place(drums, hat(0.12 if i % 2 else 0.06, open_=i % 2 == 1), t, pan=0.25)
for i, t in enumerate(grid(G0, B_END, BEAT / 4)):
    nm, ch = chord(t)
    if i % 2 == 0:
        bass(ROOT_N[nm], t, BEAT / 4, 0.15)
    place(music, pluck(hz(ch[i % 4]) * 2, 0.25, 1.1), t, 0.026, pan=0.5 * np.sin(i * 0.7))
for t0 in grid(G0, B_END, 4 * BEAT):
    nm, ch = chord(t0)
    pad(ch + [ch[1].replace("3", "4").replace("2", "3")], t0, min(t0 + 4 * BEAT, B_END), 0.05, bright=4, a=0.02, r=0.3)
pad(["A4", "D5", "F5", "A5"], G0, B_END, 0.02, bright=6, a=0.05, r=0.3)
place(sfx, noise_sweep(S["dash"] - S["tunnel"], 300, 12000, 0.16, "rise"), S["tunnel"])

# ── V. the dashboard ──────────────────────────────────────────────────────
place(drums, boom(1.2), S["dash"])
for t in grid(S["dash"], S["back"] - 0.4, BEAT):
    place(drums, kick(0.7), t)
for i, t in enumerate(grid(S["dash"], S["back"] - 0.4, BEAT / 2)):
    place(drums, hat(0.08 if i % 2 else 0.04, open_=i % 2 == 1), t, pan=0.25)
for i, t in enumerate(grid(S["dash"], S["back"] - 0.4, BEAT / 4)):
    nm, ch = chord(t)
    if i % 2 == 0:
        bass(ROOT_N[nm], t, BEAT / 4, 0.1)
    place(music, pluck(hz(ch[[0, 2, 1, 3][i % 4]]) * 2, 0.25, 1.0), t, 0.022, pan=0.5 * np.sin(i * 0.7))
for t0 in grid(S["dash"], S["back"], 4 * BEAT):
    nm, ch = chord(t0)
    pad(ch, t0, min(t0 + 4 * BEAT, S["back"]), 0.04, bright=3, a=0.05, r=0.3)
L, R = reverse_swell(0.6, ["F4", "A4", "D5"], 0.16)
place(music, L, S["back"] - 0.6, 1, -0.3); place(music, R, S["back"] - 0.6, 1, 0.3)

# ── VI. finale ────────────────────────────────────────────────────────────
place(drums, boom(1.1), S["back"])
pad(["Bb1", "Bb2", "F3"], S["back"], S["logo"], 0.08, bright=2, a=0.05, r=0.6)
pad(["D4", "F4", "A4", "C5"], S["back"], S["logo"], 0.035, bright=3, a=0.4, r=0.6)
for i, t in enumerate(grid(S["net"], S["logo"] - 0.2, 0.18)):
    place(music, pluck(hz(["F5", "A5", "C6", "D6", "E6"][i % 5]), 0.6, 1.3), t, 0.02, pan=np.sin(i * 1.1) * 0.7)
place(drums, boom(1.3), S["logo"])
pad(["D1", "D2", "A2"], S["logo"], DUR - 0.3, 0.1, bright=2, a=0.02, r=1.6)
pad(["F3", "A3", "D4", "E4", "A4"], S["logo"], DUR - 0.3, 0.05, bright=3, a=0.2, r=1.6)
for t, n in zip([S["logo"] + 0.3, S["logo"] + 0.7, S["tag"], S["tag"] + 0.4, S["card"]], ["A5", "D6", "E6", "F6", "A5"]):
    place(music, keys(hz(n), 3.2), t, 0.05, pan=0.2)

# sfx from cues
pent = [hz(n) for n in ["D6", "F6", "A6", "C7", "E6"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = max(0.1, min(c.get("dur") or 1.0, 3.0)); pan = float(np.sin(k * 1.7) * 0.4)
    if ty == "tick":
        place(sfx, keytick(g), t0, pan=pan * 0.5)
    elif ty == "click":
        place(sfx, click_s(g * 1.4), t0, pan=0.1)
    elif ty == "hit":
        place(sfx, boom(0.25 * g), t0)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 5000, 0.12 * g, "bell"), t0, pan=pan)
    elif ty == "sweep":
        place(sfx, noise_sweep(d, 2000, 11000, 0.07 * g, "bell"), t0, pan=pan)
    elif ty == "chime":
        place(sfx, chime_s(g, pent[k % len(pent)]), t0, pan=pan * 0.6)

wet = np.stack([reverb((music + 0.4 * sfx)[0], 0.0, 1.4), reverb((music + 0.4 * sfx)[1], 2.3, 1.4)])
mix = music * 0.9 + wet * 0.5 + drums + sfx * 0.9
mix = np.stack([hp(mix[0], 22), hp(mix[1], 22)])
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
t_all = np.arange(N) / SR
mix *= np.clip((DUR + 0.1 - t_all) / 1.4, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-astria.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-astria.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=10", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
