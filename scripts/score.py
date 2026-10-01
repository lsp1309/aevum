#!/usr/bin/env python3
"""
ASTRYA — original score, synthesised from the film's own cue sheet.

    npm run render -- --cues scripts/cues.json     # export cue sheet from the timeline
    python3 scripts/score.py                       # → public/audio/astrya-score.m4a

Ambient pad in D minor that follows the story's arc (mystery → tension →
release → work pulse → core → light → calm → resolution), a soft arpeggiated
pulse, sub swells, and sound design locked to the timeline cues (impacts,
risers, whooshes, UI clicks, glass chimes). Everything goes through a
Schroeder reverb and a gentle tanh bus. Needs numpy + scipy + ffmpeg.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
rng = np.random.default_rng(7)

with open(os.path.join(ROOT, "scripts", "cues.json")) as f:
    sheet = json.load(f)
DUR = float(sheet["duration"])
C = sheet["chapters"]
N = int(DUR * SR) + SR
L = np.zeros(N)
R = np.zeros(N)
t_all = np.arange(N) / SR


def hz(note):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def place(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    lg = np.cos((pan + 1) * np.pi / 4)
    rg = np.sin((pan + 1) * np.pi / 4)
    L[i : i + len(sig)] += sig * gain * lg * 1.414
    R[i : i + len(sig)] += sig * gain * rg * 1.414


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = min(int(a * SR), n // 2), min(int(r * SR), n // 2)
    if na:
        e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr:
        e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e


# ── harmonic plan (start time, notes, brightness, gain) ────────────────────
plan = [
    (0.0, ["D3", "A3", "E4"], 1.5, 0.4),
    (C["noise"], ["Bb2", "F3", "A3", "D4"], 2.5, 0.55),
    (C["noise"] + 4.0, ["Bb2", "F3", "C4", "E4"], 3.2, 0.62),
    (C["brand"], ["F2", "C3", "G3", "A3", "E4"], 3.0, 0.7),
    (C["inbox"], ["D3", "F3", "A3", "E4"], 2.4, 0.5),
    (C["inbox"] + 4.6, ["Bb2", "D3", "F3", "A3"], 2.4, 0.5),
    (C["inbox"] + 9.2, ["F2", "C3", "F3", "A3"], 2.4, 0.5),
    (C["inbox"] + 13.8, ["C3", "G3", "D4", "E4"], 2.6, 0.52),
    (C["work"], ["D3", "A3", "C4", "F4"], 3.0, 0.56),
    (C["work"] + 3.9, ["Bb2", "F3", "A3", "D4"], 3.2, 0.58),
    (C["work"] + 7.8, ["C3", "G3", "E4", "G4"], 3.6, 0.62),
    (C["core"] - 0.6, ["D2", "A2", "E3", "F3", "A3"], 3.4, 0.72),
    (C["core"] + 4.2, ["Bb1", "F2", "D3", "A3", "C4"], 3.8, 0.75),
    (C["light"] - 0.3, ["F3", "A3", "C4", "G4", "E5"], 4.5, 0.6),
    (C["morning"] - 1.0, ["F2", "C3", "E3", "A3"], 2.2, 0.45),
    (C["morning"] + 3.6, ["C3", "E3", "G3", "D4"], 2.2, 0.45),
    (C["morning"] + 7.2, ["D3", "F3", "A3", "E4"], 2.2, 0.45),
    (C["finale"] - 0.4, ["Bb2", "D3", "F3", "C4"], 2.0, 0.42),
    (C["finale"] + 1.0, ["C3", "G3", "C4", "E4"], 2.6, 0.5),
    (C["finale"] + 1.75, ["D2", "A2", "D3", "E3", "A3"], 3.4, 0.72),
    (C["finale"] + 4.2, ["F2", "C3", "G3", "A3", "E4"], 3.4, 0.72),
    (DUR + 1, [], 1, 0),
]

# ── pad: detuned additive saws, brightness per chord, long crossfades ──────
print("pad…")
for k in range(len(plan) - 1):
    t0, notes, bright, gain = plan[k]
    t1 = plan[k + 1][0]
    xf = 1.6
    s0 = max(0.0, t0 - xf / 2)
    s1 = min(DUR + 0.5, t1 + xf / 2)
    n = int((s1 - s0) * SR)
    if n <= 0 or not notes:
        continue
    tt = np.arange(n) / SR
    voice_l = np.zeros(n)
    voice_r = np.zeros(n)
    for j, note in enumerate(notes):
        f = hz(note)
        for d, (detune, side) in enumerate([(-0.07, -1), (0.0, 0), (0.08, 1)]):
            ff = f * 2 ** (detune / 12)
            ph = rng.random() * 6.28
            sig = np.zeros(n)
            for h in range(1, 9):
                if ff * h > 9000:
                    break
                a = (1 / h) * np.exp(-(h - 1) / bright)
                sig += a * np.sin(2 * np.pi * ff * h * tt + ph * h)
            lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.07 + 0.03 * j + 0.02 * d) * tt + j)
            sig *= lfo
            voice_l += sig * (0.6 - 0.25 * side)
            voice_r += sig * (0.6 + 0.25 * side)
    e = env_adsr(n, xf if k else 3.5, xf)
    scale = gain * 0.05 / max(1, len(notes) ** 0.5)
    i = int(s0 * SR)
    L[i : i + n] += voice_l * e * scale
    R[i : i + n] += voice_r * e * scale

# ── sub swell following roots ─────────────────────────────────────────────
print("sub…")
for k in range(len(plan) - 1):
    t0, notes, _, gain = plan[k]
    if not notes:
        continue
    t1 = plan[k + 1][0]
    n = int((t1 - t0 + 1.2) * SR)
    f = hz(notes[0]) / 2
    while f > 70:
        f /= 2
    tt = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)
    place(sig * env_adsr(n, 1.4, 1.2) * gain * 0.06, t0 - 0.2)

# ── arpeggiated pulse during the "work" chapters ──────────────────────────
print("arp…")


def pluck(f, dur=0.9):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = np.exp(-tt * 5.5) * (1 - np.exp(-tt * 400))
    return (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 9) + 0.12 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt * 14)) * e


def arp(start, end, step, gain, octave_up=1):
    t = start
    i = 0
    while t < end:
        chord = [p for p in plan if p[0] <= t][-1][1]
        if chord:
            pattern = [0, 2, 1, 3, 2, 1]
            note = chord[pattern[i % len(pattern)] % len(chord)]
            f = hz(note) * (2 ** octave_up)
            ramp = min(1, (t - start) / 1.5) * min(1, (end - t) / 1.2)
            place(pluck(f), t, gain * ramp * (0.85 if i % 2 else 1), pan=0.35 * np.sin(i * 0.9))
        t += step
        i += 1


arp(C["inbox"] + 0.5, C["work"] - 0.2, 0.36, 0.05)
arp(C["work"] - 0.2, C["core"] - 1.2, 0.18, 0.045)
arp(C["core"] + 0.6, C["light"] - 2.2, 0.27, 0.035, 2)
arp(C["morning"] + 0.4, C["finale"] - 0.6, 0.54, 0.035)
arp(C["finale"] + 4.4, DUR - 2.5, 0.54, 0.028, 2)

# ── sound design from cues ───────────────────────────────────────────────
print("cues…")
BANDS = [(80, 200), (200, 450), (450, 900), (900, 1800), (1800, 3600), (3600, 7200), (7200, 14000)]


def band_noise(n):
    w = rng.standard_normal(n)
    out = []
    for lo, hi in BANDS:
        sos = butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        out.append(sosfilt(sos, w))
    return out


def moving_band(n, pos):
    """Noise whose spectral centre follows `pos` (0..1 per sample across BANDS)."""
    bands = band_noise(n)
    out = np.zeros(n)
    centre = pos * (len(BANDS) - 1)
    for b, sig in enumerate(bands):
        w = np.exp(-((centre - b) ** 2) / 1.2) * (0.62**b)  # darker tilt: air, not hiss
        out += sig * w
    return out


def riser(dur, gain):
    n = int(dur * SR)
    x = np.linspace(0, 1, n)
    sig = moving_band(n, 0.1 + 0.8 * x**1.5) * (x**2.2) * 1.5
    sig += 0.25 * np.sin(2 * np.pi * np.cumsum(180 + 1400 * x**2) / SR) * x**3
    return sig * gain * 0.22


def whoosh(dur, gain):
    n = int(dur * SR)
    x = np.linspace(0, 1, n)
    shape = np.sin(np.pi * x) ** 2.2
    pos = 0.15 + 0.55 * np.sin(np.pi * x)
    return moving_band(n, pos) * shape * gain * 0.32


def impact(gain, depth=1.0):
    n = int(3.5 * SR)
    tt = np.arange(n) / SR
    f = 34 + 52 * np.exp(-tt * 9)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2 / depth)
    noise = sosfilt(butter(2, 1600, fs=SR, output="sos"), rng.standard_normal(n)) * np.exp(-tt * 18)
    air = sosfilt(butter(2, [3000, 11000], btype="band", fs=SR, output="sos"), rng.standard_normal(n)) * np.exp(-tt * 1.6) * 0.18
    return (thump * 0.9 + noise * 0.35 + air) * gain * 0.38


def click(gain):
    n = int(0.09 * SR)
    tt = np.arange(n) / SR
    tick = sosfilt(butter(2, [2000, 7000], btype="band", fs=SR, output="sos"), rng.standard_normal(n)) * np.exp(-tt * 260)
    body = np.sin(2 * np.pi * 1250 * tt) * np.exp(-tt * 70) * 0.5
    return (tick + body) * gain * 0.12


def tick(gain, f=2093.0):
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt)) * np.exp(-tt * 22) * (1 - np.exp(-tt * 900)) * gain * 0.05


def chime(gain, f):
    n = int(3.0 * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 1.4), (2.0, 0.4, 2.2), (2.76, 0.25, 3.0), (5.4, 0.12, 5), (8.93, 0.05, 7)]:
        sig += amp * np.sin(2 * np.pi * f * ratio * tt) * np.exp(-tt * dec)
    return sig * (1 - np.exp(-tt * 600)) * gain * 0.07


def sweep(dur, gain):
    n = int(dur * SR)
    x = np.linspace(0, 1, n)
    return moving_band(n, 0.55 + 0.4 * x) * np.sin(np.pi * x) ** 1.5 * gain * 0.22


pent = [hz(n) for n in ["D6", "E6", "F#6", "A6", "B6", "D7"]]
ticks = [hz(n) for n in ["A6", "D7", "E7", "F#6", "B6"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = c.get("dur") or 1.0
    pan = float(np.sin(k * 1.7) * 0.35)
    if ty == "hit":
        place(impact(g), t0)
    elif ty == "soft":
        place(impact(g * 0.45, 0.6), t0)
    elif ty == "riser":
        place(riser(d, g), t0)
    elif ty == "whoosh":
        place(whoosh(d, g), t0, pan=pan)
    elif ty == "click":
        place(click(g), t0, pan=0.15)
    elif ty == "tick":
        place(tick(g, ticks[k % len(ticks)]), t0, pan=pan)
    elif ty == "chime":
        place(chime(g, pent[k % len(pent)]), t0, pan=pan * 0.6)
    elif ty == "sweep":
        place(sweep(d, g), t0, pan=pan)

# ── space: Schroeder reverb (stereo-decorrelated) ──────────────────────────
print("reverb…")


def comb(x, ms, g):
    d = int(ms * SR / 1000)
    a = np.zeros(d + 1)
    a[0] = 1
    a[d] = -g
    damp = butter(1, 5200, fs=SR)
    return lfilter(*damp, lfilter([1], a, x))


def allpass(x, ms, g):
    d = int(ms * SR / 1000)
    b = np.zeros(d + 1)
    a = np.zeros(d + 1)
    b[0], b[d] = -g, 1
    a[0], a[d] = 1, -g
    return lfilter(b, a, x)


def reverb(x, offs):
    y = sum(comb(x, ms + offs, g) for ms, g in [(39.7, 0.86), (47.1, 0.85), (53.3, 0.84), (61.7, 0.83)]) / 4
    for ms, g in [(5.0, 0.7), (1.7, 0.7)]:
        y = allpass(y, ms + offs * 0.1, g)
    return y


wetL = reverb(L, 0.0)
wetR = reverb(R, 2.3)
L2 = L * 0.78 + wetL * 0.55
R2 = R * 0.78 + wetR * 0.55

# ── master bus ─────────────────────────────────────────────────────────────
print("master…")
hp = butter(2, 28, btype="high", fs=SR, output="sos")
L2 = sosfilt(hp, L2)
R2 = sosfilt(hp, R2)
peak = max(np.abs(L2).max(), np.abs(R2).max())
L2, R2 = np.tanh(L2 / peak * 1.25) / np.tanh(1.25), np.tanh(R2 / peak * 1.25) / np.tanh(1.25)
fade_in = np.clip(t_all / 1.2, 0, 1)
fade_out = np.clip((DUR + 0.2 - t_all) / 2.2, 0, 1)
L2 *= fade_in * fade_out * 0.89
R2 *= fade_in * fade_out * 0.89
out = np.stack([L2, R2], axis=1)[: int((DUR + 0.2) * SR)]

os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
wav = os.path.join(ROOT, "scripts", ".score.wav")
wavfile.write(wav, SR, (out * 32767).astype(np.int16))
m4a = os.path.join(ROOT, "public", "audio", "astrya-score.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "160k", m4a], check=True)
os.remove(wav)
print("wrote", m4a, f"{DUR:.1f}s")
