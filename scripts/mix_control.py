#!/usr/bin/env python3
"""
ASTRYA — Takes control (control.html, 16:9): score + sound design (no voice).

    node scripts/render.mjs --page astria --cues scripts/cues.control.json
    python3 scripts/mix_control.py           # → public/audio/astrya-control.m4a

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
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.control.json")))
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
GRID0 = S["wave"]
def chord(t):
    k = int(np.floor((t - GRID0) / (4 * BEAT) + 1e-6)) % 4
    return PROG[k]




def groove(t0, t1, full=1.0, clap_on=True, filt=None, hats=True):
    for t in grid(t0, t1, BEAT):
        place(drums, kick(0.95 * full), t)
    if clap_on:
        for t in grid(t0 + BEAT, t1, 2 * BEAT):
            place(drums, clap(0.4 * full), t)
    if hats:
        for i, t in enumerate(grid(t0, t1, BEAT / 2)):
            place(drums, hat(0.11 * full if i % 2 else 0.05 * full, open_=i % 2 == 1), t, pan=0.25)
    for i, t in enumerate(grid(t0, t1, BEAT / 4)):
        nm, ch = chord(t)
        if i % 2 == 0:
            bass(ROOT_N[nm], t, BEAT / 4, 0.14 * full)
        s = pluck(hz(ch[[0, 2, 1, 3][i % 4]]) * 2, 0.25, 1.0)
        place(music, lp(s, filt) if filt else s, t, 0.024 * full, pan=0.5 * np.sin(i * 0.7))
    for t0b in grid(t0, t1, 4 * BEAT):
        nm, ch = chord(t0b)
        pad(ch, t0b, min(t0b + 4 * BEAT, t1), 0.04 * full, bright=3.5, a=0.03, r=0.3)


def glitch(d, g, seed=0):
    r = np.random.default_rng(seed)
    n = int(d * SR)
    x = r.standard_normal(n)
    hold = 30 + int(r.integers(0, 80))
    x = np.repeat(x[::hold], hold)[:n]
    gate = (np.floor(np.arange(n) / (SR * 0.018)) % 3 != 1).astype(float)
    return bp(x, 800, 7000) * gate * env(n, 0.002, 0.02) * g * 0.12


# ── I. calm → tension → chaos ─────────────────────────────────────────────
sub("D1", 0.0, S["stop"], 0.1, a=2.0, r=0.01)
pad(["D2", "A2", "D3"], 0.0, S["stop"], 0.045, bright=1.6, a=2.0, r=0.01)
place(sfx, noise_sweep(3.0, 200, 1200, 0.04, "bell"), 0.0)
for i, t in enumerate(grid(S["ten"], S["flood"], BEAT)):
    place(drums, kick(0.35, deep=1.4), t)
# the pulse accelerates with the flood
tt, step = S["flood"], 0.5
while tt < S["tooMuch"]:
    place(drums, kick(0.55, deep=1.3), tt)
    tt += step; step = max(0.25, step * 0.95)
pad(["D2", "Eb3", "A3", "D4"], S["flood"], S["stop"], 0.04, bright=4, a=1.5, r=0.01)
place(drums, boom(1.2), S["tooMuch"])
groove(S["tooMuch"], S["stop"], 1.05, filt=2600)
for t in grid(S["tooMany"], S["stop"], BEAT / 4):
    place(drums, hat(0.05, open_=False), t, pan=-0.3)
place(drums, boom(1.1), S["tooMany"])
for k, w in enumerate([7.0, 8.6, 9.6, 10.6, 11.3]):
    place(sfx, noise_sweep(0.35, 600, 7000, 0.12, "bell"), w - 0.18, pan=(-1) ** k * 0.6)
r_ = np.random.default_rng(3)
for k in range(26):
    t = S["flood"] + 0.3 + (k / 26) ** 0.7 * (S["stop"] - S["flood"] - 0.4)
    place(sfx, glitch(0.05 + r_.random() * 0.12, 0.6 + 0.6 * k / 26, k), t, pan=float(r_.random() * 1.4 - 0.7))
place(sfx, noise_sweep(S["stop"] - S["tooMany"], 300, 12000, 0.13, "rise"), S["tooMany"])

# ── II. silence; a light; the ring; the wave ──────────────────────────────
place(music, keys(hz("A6"), 2.0), S["light"], 0.035)
L, R = reverse_swell(1.2, ["D3", "A3", "D4", "F4", "A4"], 0.2)
place(music, L, S["logo"] - 0.2, 1, -0.3); place(music, R, S["logo"] - 0.2, 1, 0.3)
sub("D1", S["logo"], S["wave"], 0.12, a=1.2, r=0.02)
L, R = reverse_swell(1.3, ["D4", "A4", "D5", "F5"], 0.22)
place(music, L, S["wave"] - 1.3, 1, -0.3); place(music, R, S["wave"] - 1.3, 1, 0.3)
place(drums, boom(1.8), S["wave"])
place(drums, boom(1.0), S["wave"] + 0.03)

# ── III. acceleration → transformation ────────────────────────────────────
pad(["D3", "A3", "D4", "F4", "A4"], S["wave"], S["understand"] + 0.2, 0.05, bright=4, a=0.02, r=0.6)
groove(S["understand"], S["organize"], 0.75, clap_on=False, filt=2200)
groove(S["organize"], S["act"], 1.0, filt=5000)
groove(S["act"], S["inbox"], 1.15)
pad(["A4", "D5", "F5", "A5"], S["act"], S["inbox"], 0.025, bright=6, a=0.05, r=0.3)
L, R = reverse_swell(0.7, ["D4", "F4", "A4", "D5"], 0.2)
place(music, L, S["inbox"] - 0.7, 1, -0.3); place(music, R, S["inbox"] - 0.7, 1, 0.3)
place(drums, boom(1.2), S["inbox"])
pad(["F3", "A3", "C4", "E4"], S["inbox"], S["galaxy"], 0.05, bright=3, a=0.02, r=0.5)

# ── IV. the pull-back, the galaxy, the dive ───────────────────────────────
pad(["D2", "A2", "D3", "E3", "A3"], S["galaxy"], S["dive"], 0.07, bright=2.5, a=1.2, r=0.3)
pad(["A4", "D5", "E5", "A5"], S["lines"], S["dive"], 0.025, bright=6, a=0.8, r=0.3)
for i, t in enumerate(grid(S["lines"], S["dive"], BEAT / 2)):
    place(music, pluck(hz(["D5", "A5", "E6", "F5"][i % 4]), 0.5, 1.3), t, 0.022, pan=np.sin(i) * 0.7)
for t in grid(S["orbit"], S["dive"], BEAT):
    place(drums, kick(0.6, deep=1.4), t)
sub("D1", S["orbit"], S["app"], 0.13, a=0.5, r=0.05)
place(sfx, noise_sweep(S["app"] - S["dive"] + 0.4, 300, 13000, 0.16, "rise"), S["dive"] - 0.4)
place(drums, boom(1.5), S["app"])

# ── V. the product at work ────────────────────────────────────────────────
groove(S["app"], S["calm"] - 0.2, 0.7, clap_on=True, filt=4000)
pad(["F3", "A3", "C4", "E4"], S["app"], S["calm"], 0.03, bright=3, a=0.3, r=0.6)

# ── VI. calm, the logo ────────────────────────────────────────────────────
pad(["Bb1", "Bb2", "F3"], S["calm"], S["end_logo"], 0.07, bright=2, a=0.6, r=0.6)
pad(["D4", "F4", "A4", "C5"], S["calm"], S["end_logo"], 0.03, bright=3, a=0.8, r=0.6)
for t, n in zip([S["calm"] + 0.4, S["calm"] + 1.4, S["recede"]], ["F5", "A5", "C6"]):
    place(music, keys(hz(n), 3.0), t, 0.04, pan=0.2)
place(drums, boom(0.8), S["end_logo"])
pad(["D1", "D2", "A2"], S["end_logo"], DUR - 0.3, 0.09, bright=2, a=0.3, r=2.0)
pad(["F3", "A3", "D4", "E4", "A4"], S["end_logo"], DUR - 0.3, 0.045, bright=3, a=0.6, r=2.0)
for t, n in zip([S["end_logo"] + 0.5, S["end_logo"] + 1.0, S["tag"], S["tag"] + 0.5], ["A5", "D6", "E6", "A6"]):
    place(music, keys(hz(n), 3.4), t, 0.045, pan=0.2)

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
quiet = np.ones(N)
i0, i1 = int(S["stop"] * SR), int((S["light"] - 0.05) * SR)
rmp = int(0.006 * SR)
quiet[i0:i1] = 0.0
quiet[i0 - rmp:i0] = np.linspace(1, 0, rmp)
quiet[i1:i1 + int(0.2 * SR)] = np.linspace(0, 1, int(0.2 * SR))
mix = mix * quiet
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
t_all = np.arange(N) / SR
mix *= np.clip((DUR + 0.1 - t_all) / 1.4, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-control.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-control.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=10", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
