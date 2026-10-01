#!/usr/bin/env python3
"""
ASTRYA — final soundtrack: original score + voice-over + sound design, in film time.

    node scripts/render.mjs --dev --cues scripts/cues.json   # cue sheet (film time)
    python3 scripts/voice.py                                 # narration lines
    python3 scripts/mix.py                                   # → public/audio/astrya-mix.m4a

Score (120 BPM grid, downbeats every 2 s from 0.5 s, aligned with the edit):
  0–7.9    INTRO     drone + air, a heartbeat that quickens as the noise grows
  7.9–9.9  TURN      everything is inhaled (reverse swell)…
  9.9      IGNITION  …impact + open chord as the halo ignites
  12.5–29  GROOVE    pulse, bass, arps, light kit — the product at work
  29–34.5  BUILD     toms, snare roll, rising filter
  34.5–42  CLIMAX    full kit, big chords, octave lead — one intelligence
  42–43.5  BREATH    light: only shimmer
  43.5–47  CALM      piano-like plucks
  47–56.5  RESOLVE   riser → impact on the halo → final chord, long tail
Music is ducked under the voice (sidechain from the narration envelope).
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, resample_poly, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
rng = np.random.default_rng(11)
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.json")))
DUR = float(sheet["duration"])
N = int((DUR + 1.0) * SR)
t_all = np.arange(N) / SR

music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
vo = np.zeros((2, N))

BEAT = 0.5
bar0 = 0.5  # first downbeat


def hz(note):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def place(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= N or gain == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    lg, rg = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[0, i : i + len(sig)] += sig * gain * lg
    buf[1, i : i + len(sig)] += sig * gain * rg


def env(n, a, r):
    e = np.ones(n)
    na, nr = min(int(a * SR), n // 2), min(int(r * SR), n // 2)
    if na:
        e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr:
        e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def saw_pad(freqs, dur, bright=3.0, detune=0.08):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    L = np.zeros(n)
    R = np.zeros(n)
    for j, f in enumerate(freqs):
        for d, side in ((-detune, -1), (0, 0), (detune, 1)):
            ff = f * 2 ** (d / 12)
            ph = rng.random() * 6.28
            s = np.zeros(n)
            for h in range(1, 10):
                if ff * h > 8000:
                    break
                s += (1 / h) * np.exp(-(h - 1) / bright) * np.sin(2 * np.pi * ff * h * tt + ph * h)
            s *= 1 + 0.1 * np.sin(2 * np.pi * (0.11 + 0.03 * j) * tt + j)
            L += s * (0.6 - 0.25 * side)
            R += s * (0.6 + 0.25 * side)
    k = 1 / max(1, len(freqs) ** 0.5)
    return L * k, R * k


def pad(notes, t0, t1, gain, bright=3.0, a=1.2, r=1.4):
    n = int((t1 - t0 + r) * SR)
    L, R = saw_pad([hz(x) for x in notes], (t1 - t0 + r), bright)
    e = env(n, a, r)
    i = int(t0 * SR)
    m = min(n, N - i)
    music[0, i : i + m] += (L * e)[:m] * gain
    music[1, i : i + m] += (R * e)[:m] * gain


def pluck(f, dur=0.9, bright=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = np.exp(-tt * 5.0) * (1 - np.exp(-tt * 500))
    return (np.sin(2 * np.pi * f * tt) + 0.4 * bright * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 8) + 0.15 * bright * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 14)) * e


def keys(f, dur=2.2):
    """Soft piano-like tone: inharmonic partials, fast attack, long decay."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for k, (r, a, d) in enumerate([(1, 1, 1.6), (2.0, 0.45, 2.6), (3.01, 0.22, 3.6), (4.02, 0.1, 5), (5.03, 0.05, 6)]):
        s += a * np.sin(2 * np.pi * f * r * tt + k) * np.exp(-tt * d)
    return s * (1 - np.exp(-tt * 300))


def kick(gain=1.0, deep=1.0):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    f = 42 + 95 * np.exp(-tt * 28 / deep)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7 / deep)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-tt * 300) * 0.25
    return (s + click) * gain


def tom(f0=95, gain=1.0):
    n = int(0.9 * SR)
    tt = np.arange(n) / SR
    f = f0 * (0.75 + 0.25 * np.exp(-tt * 12))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5)
    skin = bp(rng.standard_normal(n), 200, 1200) * np.exp(-tt * 30) * 0.4
    return (s + skin) * gain


def clap(gain=1.0):
    n = int(0.4 * SR)
    tt = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 5000)
    burst = sum(np.exp(-np.maximum(tt - d, 0) * 60) * (tt >= d) for d in (0, 0.011, 0.023))
    tail = np.exp(-tt * 14)
    body = np.sin(2 * np.pi * 185 * tt) * np.exp(-tt * 25) * 0.4
    return (noise * (burst * 0.6 + tail * 0.5) + body) * gain


def hat(gain=1.0, open_=False):
    n = int((0.35 if open_ else 0.08) * SR)
    tt = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-tt * (12 if open_ else 70)) * gain


def boom(gain=1.0):
    """Cinematic low impact."""
    n = int(4.0 * SR)
    tt = np.arange(n) / SR
    f = 30 + 60 * np.exp(-tt * 6)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
    noise = lp(rng.standard_normal(n), 1400) * np.exp(-tt * 14) * 0.5
    air = bp(rng.standard_normal(n), 3000, 11000) * np.exp(-tt * 1.4) * 0.16
    return (thump + noise + air) * gain


def noise_sweep(dur, f0, f1, gain, shape="rise"):
    """Filtered noise whose band centre glides f0 → f1 (block-wise filtering)."""
    n = int(dur * SR)
    w = rng.standard_normal(n)
    out = np.zeros(n)
    blk = int(0.05 * SR)
    for b in range(0, n, blk):
        x = b / n
        fc = f0 * (f1 / f0) ** x
        seg = w[max(0, b - blk) : b + blk]
        y = bp(seg, max(40, fc * 0.6), min(SR / 2 - 200, fc * 1.6))
        out[b : b + blk] = y[-min(blk, n - b) :] if len(y) >= blk else y[: n - b]
    x = np.linspace(0, 1, n)
    e = x**2.4 if shape == "rise" else np.sin(np.pi * x) ** 2
    return out * e * gain


def reverse_swell(dur, notes, gain):
    n = int(dur * SR)
    L, R = saw_pad([hz(x) for x in notes], dur, 4.0)
    x = np.linspace(0, 1, n)
    e = x**3
    return L * e * gain, R * e * gain


# ── harmony ───────────────────────────────────────────────────────────────
DM9 = ["D3", "A3", "C4", "E4", "F4"]
BB = ["Bb2", "F3", "A3", "D4"]
F_ = ["F2", "C3", "A3", "C4", "G4"]
C_ = ["C3", "G3", "E4", "G4"]

print("score…")
# INTRO: drone + air
pad(["D2", "A2"], 0.0, 7.9, 0.09, bright=1.2, a=2.0, r=0.6)
pad(["A4", "D5", "E5"], 1.0, 7.9, 0.022, bright=1.0, a=3.0, r=0.4)
for k, t in enumerate(np.arange(1.0, 7.8, 1.0)):  # heartbeat that quickens
    place(drums, kick(0.32 + 0.06 * k, deep=1.6), t)
for t in np.arange(4.5, 7.8, 0.5):
    place(drums, kick(0.42, deep=1.4), t)
for i, t in enumerate(np.arange(4.2, 7.8, 0.25)):  # ostinato rises with the noise
    f = hz(["D4", "A4", "F4", "A4"][i % 4]) * (2 if t > 6.2 else 1)
    place(music, pluck(f, 0.6), t, 0.05 + 0.02 * (t - 4.2), pan=0.3 * np.sin(i))
# TURN: everything inhaled
L, R = reverse_swell(2.0, ["F3", "A3", "C4", "G4"], 0.16)
place(music, L, 7.9, 1, -0.2)
place(music, R, 7.9, 1, 0.2)
# IGNITION at 9.9
place(drums, boom(0.9), 9.9)
pad(F_, 9.9, 12.5, 0.12, bright=3.5, a=0.05, r=1.6)
pad(["F5", "A5", "C6"], 9.9, 12.5, 0.02, bright=1.0, a=0.8, r=1.2)
# GROOVE 12.5–29
prog = [(12.5, DM9), (16.5, BB), (20.5, F_), (24.5, C_), (28.5, DM9)]
for (t0, ch), (t1, _) in zip(prog, prog[1:] + [(34.5, None)]):
    pad(ch, t0, t1, 0.085, bright=2.6, a=0.6, r=0.8)
bass_notes = {12.5: "D2", 16.5: "Bb1", 20.5: "F2", 24.5: "C2", 28.5: "D2"}
for t in np.arange(12.5, 34.5, 0.25):
    root = [v for k, v in bass_notes.items() if k <= t][-1]
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    f = hz(root)
    b = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 9) * (1 - np.exp(-tt * 400))
    place(music, b, t, 0.12 if t >= 14.5 else 0.07)
for i, t in enumerate(np.arange(12.5, 34.5, 0.125)):
    ch = [c for k, c in prog if k <= t][-1]
    f = hz(ch[[0, 2, 1, 3, 2, 1][i % 6] % len(ch)]) * 2
    place(music, pluck(f, 0.4, 0.8), t, 0.028 + (0.012 if t > 29 else 0), pan=0.4 * np.sin(i * 0.7))
for t in np.arange(14.5, 34.5, 1.0):
    place(drums, kick(0.75), t)
for t in np.arange(17.0, 34.5, 1.0):
    place(drums, clap(0.32), t)
for t in np.arange(20.5, 34.5, 0.25):
    place(drums, hat(0.09 if (t * 4) % 2 else 0.14), t, pan=0.25)
# BUILD 29–34.5: toms + snare roll + riser
for k, t in enumerate([29.0, 29.75, 30.5, 31.0, 31.5, 32.0, 32.5, 32.75, 33.0, 33.25, 33.5, 33.75, 34.0, 34.25]):
    place(drums, tom(110 - (k % 3) * 18, (0.18 if t < 32.7 else 0.4) + 0.015 * k), t, pan=[-0.4, 0, 0.4][k % 3])
roll = np.concatenate([np.arange(32.5, 33.5, 0.125), np.arange(33.5, 34.5, 0.0625)])
for k, t in enumerate(roll):
    place(drums, clap(0.12 + 0.012 * k), t)
place(sfx, noise_sweep(3.4, 200, 6000, 0.12), 31.1)
# CLIMAX 34.5–42
place(drums, boom(1.0), 34.5)
cl = [(34.5, DM9), (36.5, BB), (38.5, F_), (40.5, C_)]
CL = 38.75
for (t0, ch), (t1, _) in zip(cl, cl[1:] + [(42.0, None)]):
    if t1 <= CL:  # under the narration: warm and low
        pad(ch, t0, t1, 0.07, bright=2.2, a=0.05, r=0.5)
    else:
        pad(ch, t0, t1, 0.13, bright=5.0, a=0.05, r=0.5)
        pad([c[:-1] + str(int(c[-1]) + 1) for c in ch[1:3]], max(t0, CL), t1, 0.045, bright=6.0, a=0.05, r=0.5)
# the line "One intelligence…" is spoken over a held-back groove (kick only)…
for t in np.arange(34.5, 38.9, 1.0):
    place(drums, kick(0.7, deep=1.2), t)
# …then the climax opens fully for the orbits
for t in np.arange(CL, 41.9, 0.5):
    place(drums, kick(1.0, deep=1.2), t)
for t in np.arange(CL + 0.5, 41.9, 1.0):
    place(drums, clap(0.45), t)
for t in np.arange(CL, 41.9, 0.25):
    place(drums, hat(0.13), t, pan=-0.2)
for t in [CL, 40.5]:
    place(drums, tom(70, 0.7), t)
place(drums, boom(0.6), CL)
lead = ["D5", "F5", "A5", "C6", "Bb5", "A5", "F5", "G5", "A5", "C6", "D6", "C6", "A5", "G5", "E5", "G5"]
for i, t in enumerate(np.arange(34.5, 41.9, 0.5)):
    lg = 0.02 if t < CL else 0.07
    place(music, pluck(hz(lead[i % len(lead)]), 1.0, 1.2), t, lg, pan=0.15)
    place(music, pluck(hz(lead[i % len(lead)]) / 2, 1.0, 1.0), t, lg * 0.55, pan=-0.15)
for i, t in enumerate(np.arange(CL, 41.9, 0.125)):
    ch = [c for k, c in cl if k <= t][-1]
    place(music, pluck(hz(ch[[0, 1, 2, 3][i % 4] % len(ch)]) * 2, 0.35, 1.0), t, 0.03, pan=0.5 * np.sin(i))
place(sfx, noise_sweep(1.8, 300, 8000, 0.1), 40.2)
# BREATH 42–43.5: only shimmer
pad(["A4", "C5", "E5", "G5"], 41.9, 43.6, 0.03, bright=1.0, a=0.1, r=1.5)
# CALM 43.5–47: keys
pad(["F2", "C3", "A3"], 43.5, 47.0, 0.06, bright=1.5, a=0.8, r=0.6)
for t, nt in zip(np.arange(43.5, 47.0, 0.5), ["F4", "A4", "C5", "E5", "C5", "A4", "G4"]):
    place(music, keys(hz(nt)), t, 0.07, pan=0.2 * np.sin(t))
# RESOLVE 47–56.5
place(sfx, noise_sweep(1.5, 200, 7000, 0.11), 47.0)
L, R = reverse_swell(1.5, ["D3", "A3", "D4", "F4"], 0.12)
place(music, L, 47.0, 1, -0.2)
place(music, R, 47.0, 1, 0.2)
place(drums, boom(1.0), 48.5)
pad(["F1", "F2", "C3"], 48.5, 55.0, 0.11, bright=2.0, a=0.02, r=2.5)
pad(["A3", "C4", "E4", "G4"], 48.5, 55.0, 0.08, bright=3.0, a=0.3, r=2.5)
pad(["C5", "E5", "G5"], 49.0, 55.0, 0.02, bright=1.0, a=1.5, r=2.5)
for t, nt in zip(np.arange(50.5, 55.0, 0.5), ["C5", "F5", "A5", "G5", "E5", "F5", "C6", "A5", "G5"]):
    place(music, keys(hz(nt), 3.0), t, 0.05, pan=0.25 * np.sin(t * 1.3))

# ── sound design from the timeline's cues (film time) ─────────────────────
print("sfx…")


def click_s(g):
    n = int(0.09 * SR)
    tt = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 2000, 7000) * np.exp(-tt * 260) + np.sin(2 * np.pi * 1250 * tt) * np.exp(-tt * 70) * 0.5) * g * 0.12


def tick_s(g, f):
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt)) * np.exp(-tt * 22) * (1 - np.exp(-tt * 900)) * g * 0.045


def chime_s(g, f):
    n = int(2.5 * SR)
    tt = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in [(1, 1, 1.4), (2.0, 0.4, 2.2), (2.76, 0.25, 3), (5.4, 0.12, 5)])
    return s * (1 - np.exp(-tt * 600)) * g * 0.06


pent = [hz(n) for n in ["D6", "E6", "F#6", "A6", "B6", "D7"]]
ticks = [hz(n) for n in ["A6", "D7", "E7", "F#6", "B6"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = c.get("dur") or 1.0
    pan = float(np.sin(k * 1.7) * 0.35)
    if ty == "hit":
        place(sfx, boom(0.5 * g), t0)
    elif ty == "soft":
        place(sfx, boom(0.2 * g), t0)
    elif ty == "riser":
        place(sfx, noise_sweep(d, 250, 5000, 0.07 * g), t0)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 2500, 0.11 * g, "bell"), t0, pan=pan)
    elif ty == "click":
        place(sfx, click_s(g), t0, pan=0.15)
    elif ty == "tick":
        place(sfx, tick_s(g, ticks[k % len(ticks)]), t0, pan=pan)
    elif ty == "chime":
        place(sfx, chime_s(g, pent[k % len(pent)]), t0, pan=pan * 0.6)
    elif ty == "sweep":
        place(sfx, noise_sweep(d, 3000, 9000, 0.05 * g, "bell"), t0, pan=pan)

# ── voice-over ───────────────────────────────────────────────────────────
print("voice…")
meta = json.load(open(os.path.join(ROOT, "scripts", ".vo", "meta.json")))
for m in meta:
    s, sr = sf.read(os.path.join(ROOT, "scripts", ".vo", f"line_{m['i']:02d}.wav"))
    if sr != SR:
        s = resample_poly(s, SR, sr)
    s = hp(s, 85)
    s = s + 0.25 * bp(s, 2500, 6000)  # presence
    place(vo, s, m["at"], 1.0)

# voice: gentle compression
lvl = np.abs(vo[0]) + np.abs(vo[1])
lvl = lfilter([1 - 0.9995], [1, -0.9995], lvl)
gain = np.where(lvl > 0.08, (0.08 / np.maximum(lvl, 1e-6)) ** 0.4, 1.0)
vo *= gain

# ── space ─────────────────────────────────────────────────────────────────
print("reverb…")


def comb(x, ms, g):
    d = int(ms * SR / 1000)
    a = np.zeros(d + 1)
    a[0], a[d] = 1, -g
    return lfilter(*butter(1, 5000, fs=SR), lfilter([1], a, x))


def allpass(x, ms, g):
    d = int(ms * SR / 1000)
    b = np.zeros(d + 1)
    a = np.zeros(d + 1)
    b[0], b[d] = -g, 1
    a[0], a[d] = 1, -g
    return lfilter(b, a, x)


def reverb(x, offs, size=1.0):
    y = sum(comb(x, ms * size + offs, g) for ms, g in [(39.7, 0.86), (47.1, 0.85), (53.3, 0.84), (61.7, 0.83)]) / 4
    for ms, g in [(5.0, 0.7), (1.7, 0.7)]:
        y = allpass(y, ms + offs * 0.1, g)
    return y


bus = music + 0.5 * sfx
wet = np.stack([reverb(bus[0], 0.0, 1.3), reverb(bus[1], 2.3, 1.3)])
music_mix = music * 0.85 + wet * 0.5 + drums * 0.9 + reverb(drums[0], 1.0, 0.6) * 0.15
sfx_mix = sfx * 0.8 + wet * 0.15
vo_wet = np.stack([reverb(vo[0], 0.5, 0.7), reverb(vo[1], 1.7, 0.7)])
vo_mix = vo + vo_wet * 0.08

# ── ducking: music + sfx dip under the narration ─────────────────────────
voice_env = np.abs(vo[0]) + np.abs(vo[1])
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.4 * SR))
e = np.zeros(N)
acc = 0.0
for i in range(0, N, 64):  # block-wise envelope follower
    v = voice_env[i : i + 64].max()
    acc = att * acc + (1 - att) * v if v > acc else rel * acc + (1 - rel) * v
    e[i : i + 64] = acc
duck = 1 - 0.8 * np.clip(e / (e.max() * 0.3 + 1e-9), 0, 1)  # up to ≈ −14 dB
# spectral duck: carve the speech band (300 Hz–4 kHz) out of the bed while the voice speaks
mid = np.stack([bp(music_mix[0], 300, 4000), bp(music_mix[1], 300, 4000)])
bed_music = music_mix * duck - mid * (1 - duck) * 0.6
mix = bed_music + sfx_mix * (0.45 + 0.55 * duck) + vo_mix * 1.7

# diagnostic: how far the voice sits above the bed on each line
bed = bed_music + sfx_mix * (0.45 + 0.55 * duck)
for m in meta:
    a, b = int(m["at"] * SR), int((m["at"] + m["dur"]) * SR)
    rv = np.sqrt(np.mean(hp(vo_mix[0, a:b] * 1.7, 150) ** 2)) + 1e-9
    rb = np.sqrt(np.mean(hp(bed[0, a:b], 150) ** 2)) + 1e-9
    print(f"  voice/bed {m['id']:11s} {20 * np.log10(rv / rb):+5.1f} dB")

# ── master ─────────────────────────────────────────────────────────────────
print("master…")
mix = np.stack([hp(mix[0], 25), hp(mix[1], 25)])
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
fade_out = np.clip((DUR + 0.2 - t_all) / 1.6, 0, 1)
mix *= fade_out * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]

os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
wav = os.path.join(ROOT, "scripts", ".mix.wav")
sf.write(wav, mix.T, SR)
# loudness-normalise to −14 LUFS (social / web), true-peak −1 dBTP
out = os.path.join(ROOT, "public", "audio", "astrya-mix.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
