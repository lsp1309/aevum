#!/usr/bin/env python3
"""
ASTRYA — final soundtrack: original score + voice-over + sound design, in film time.

    node scripts/render.mjs --dev --cues scripts/cues.json   # cue sheet (film time)
    python3 scripts/voice.py [en|fr]                         # narration lines
    python3 scripts/mix.py [en|fr]                           # → public/audio/astrya-mix-<lang>.m4a

Score (120 BPM grid, downbeats every 2 s from 0.5 s, aligned with the edit):
  0–7.9      INTRO     drone + air, a heartbeat that quickens as the noise grows
  7.9–9.9    TURN      everything is inhaled (reverse swell)…
  9.9        IGNITION  …impact + open chord as the halo ignites
  12.5–32.5  GROOVE    pulse, bass, arps, light kit — the product at work
  32.5–36.4  BUILD     the core appears, work streams in: toms, roll, riser
  36.4–45.5  CLIMAX    impact on the flash; held back under "One intelligence",
                       full kit + lead for the push-in, lighter under "Connected…"
  45.5–47.3  BREATH    the system recedes: shimmer, reverse swell
  47.3–53.4  CALM      keys — morning, then focus
  53.4–63.2  RESOLVE   riser → impact as the halo settles → final chord, long tail
Music is ducked under the voice (sidechain from the narration envelope).
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import lfilter, resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG = sys.argv[1] if len(sys.argv) > 1 else "en"
from audiolib import SR, hz, env, lp, hp, bp, saw_pad, pluck, keys, kick, tom, clap, hat, boom, noise_sweep, reverse_swell, click_s, tick_s, chime_s, reverb
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.json")))
DUR = float(sheet["duration"])
N = int((DUR + 1.0) * SR)
t_all = np.arange(N) / SR

music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
vo = np.zeros((2, N))

# The score is written on the pre-trim timeline; the edit drops whole beats at
# the points listed in src/trims.json (`music`), so every loop stays on the grid.
TRIMS = json.load(open(os.path.join(ROOT, "src", "trims.json")))["spans"]
DROPS = sorted((float(t), float(n)) for sp in TRIMS for t, n in sp["music"])
WARP = False  # True while writing the score


def W(t):
    """Pre-trim time → trimmed time (inside a dropped beat: its start)."""
    out = t
    for d0, n in DROPS:
        if t >= d0 + n:
            out -= n
        elif t > d0:
            out -= t - d0
    return out


def dropped(t):
    return any(d0 <= t < d0 + n for d0, n in DROPS)


BEAT = 0.5
bar0 = 0.5  # first downbeat


def place(buf, sig, t0, gain=1.0, pan=0.0):
    if WARP:
        if dropped(t0):
            return
        t0 = W(t0)
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


def pad(notes, t0, t1, gain, bright=3.0, a=1.2, r=1.4):
    if WARP:
        t0, t1 = W(t0), W(t1)
    n = int((t1 - t0 + r) * SR)
    L, R = saw_pad([hz(x) for x in notes], (t1 - t0 + r), bright)
    e = env(n, a, r)
    i = int(t0 * SR)
    m = min(n, N - i)
    music[0, i : i + m] += (L * e)[:m] * gain
    music[1, i : i + m] += (R * e)[:m] * gain


# ── harmony ───────────────────────────────────────────────────────────────
DM9 = ["D3", "A3", "C4", "E4", "F4"]
BB = ["Bb2", "F3", "A3", "D4"]
F_ = ["F2", "C3", "A3", "C4", "G4"]
C_ = ["C3", "G3", "E4", "G4"]

print("score…")
WARP = True
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
# GROOVE 12.5–32.5 (thins out into the build)
prog = [(12.5, DM9), (16.5, BB), (20.5, F_), (24.5, C_), (28.5, DM9), (32.5, BB)]
for (t0, ch), (t1, _) in zip(prog, prog[1:] + [(36.4, None)]):
    pad(ch, t0, t1, 0.085 if t0 < 32.5 else 0.07, bright=2.6, a=0.6, r=0.8)
bass_notes = {12.5: "D2", 16.5: "Bb1", 20.5: "F2", 24.5: "C2", 28.5: "D2", 32.5: "Bb1"}
for t in np.arange(12.5, 36.4, 0.25):
    root = [v for k, v in bass_notes.items() if k <= t][-1]
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    f = hz(root)
    b = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 9) * (1 - np.exp(-tt * 400))
    place(music, b, t, 0.12 if 14.5 <= t < 33.5 else 0.07)
for i, t in enumerate(np.arange(12.5, 36.4, 0.125)):
    ch = [c for k, c in prog if k <= t][-1]
    f = hz(ch[[0, 2, 1, 3, 2, 1][i % 6] % len(ch)]) * 2
    place(music, pluck(f, 0.4, 0.8), t, 0.028 + (0.012 if t > 29 else 0), pan=0.4 * np.sin(i * 0.7))
for t in np.arange(14.5, 33.5, 1.0):
    place(drums, kick(0.75), t)
for t in np.arange(17.0, 33.5, 1.0):
    place(drums, clap(0.32), t)
for t in np.arange(20.5, 33.5, 0.25):
    place(drums, hat(0.09 if (t * 4) % 2 else 0.14), t, pan=0.25)
# BUILD 32.5–36.4: the core appears, work streams in — toms, roll, riser
for k, t in enumerate([33.5, 34.0, 34.5, 34.75, 35.0, 35.25, 35.5, 35.75, 35.9, 36.0, 36.1, 36.2, 36.3]):
    place(drums, tom(110 - (k % 3) * 18, (0.2 if t < 35.4 else 0.38) + 0.012 * k), t, pan=[-0.4, 0, 0.4][k % 3])
roll = np.concatenate([np.arange(35.0, 35.8, 0.125), np.arange(35.8, 36.4, 0.0625)])
for k, t in enumerate(roll):
    place(drums, clap(0.1 + 0.012 * k), t)
for t in np.arange(33.5, 36.4, 1.0):
    place(drums, kick(0.55, deep=1.3), t)
place(sfx, noise_sweep(W(36.4) - W(33.4), 200, 6000, 0.12), 33.4)
# CLIMAX 36.4–45.5
FL = 36.4  # the core flashes
place(drums, boom(1.0), FL)
cl = [(FL, DM9), (38.5, BB), (40.5, F_), (42.5, C_), (44.5, DM9)]
CL, CN = 38.5, 41.4  # full climax opens after "One intelligence."; lighter again under "Connected…"
for (t0, ch), (t1, _) in zip(cl, cl[1:] + [(45.6, None)]):
    if t0 < CL:  # under the narration: warm and low
        pad(ch, t0, t1, 0.07, bright=2.2, a=0.05, r=0.5)
    else:
        pad(ch, t0, t1, 0.12, bright=5.0, a=0.05, r=0.5)
        pad([c[:-1] + str(int(c[-1]) + 1) for c in ch[1:3]], t0, t1, 0.04, bright=6.0, a=0.05, r=0.5)
for t in np.arange(36.5, CL, 1.0):  # held back: kick only
    place(drums, kick(0.7, deep=1.2), t)
for t in np.arange(CL, CN, 0.5):  # push-in: full kit
    place(drums, kick(1.0, deep=1.2), t)
for t in np.arange(CL + 0.5, CN, 1.0):
    place(drums, clap(0.45), t)
for t in np.arange(CL, CN, 0.25):
    place(drums, hat(0.13), t, pan=-0.2)
place(drums, tom(70, 0.7), CL)
place(drums, boom(0.55), CL)
for t in np.arange(CN, 45.5, 1.0):  # tools light up: pulse + hats, room for the voice
    place(drums, kick(0.75, deep=1.2), t)
for t in np.arange(CN, 45.5, 0.25):
    place(drums, hat(0.09), t, pan=-0.2)
for t in np.arange(43.5, 45.5, 1.0):
    place(drums, clap(0.3), t)
lead = ["D5", "F5", "A5", "C6", "Bb5", "A5", "F5", "G5", "A5", "C6", "D6", "C6", "A5", "G5", "E5", "G5"]
for i, t in enumerate(np.arange(36.5, 45.5, 0.5)):
    lg = 0.02 if t < CL else (0.07 if t < CN else (0.03 if t < 44.0 else 0.06))
    place(music, pluck(hz(lead[i % len(lead)]), 1.0, 1.2), t, lg, pan=0.15)
    place(music, pluck(hz(lead[i % len(lead)]) / 2, 1.0, 1.0), t, lg * 0.55, pan=-0.15)
for i, t in enumerate(np.arange(CL, 45.5, 0.125)):
    ch = [c for k, c in cl if k <= t][-1]
    place(music, pluck(hz(ch[[0, 1, 2, 3][i % 4] % len(ch)]) * 2, 0.35, 1.0), t, 0.03 if t < CN else 0.022, pan=0.5 * np.sin(i))
place(sfx, noise_sweep(1.6, 300, 8000, 0.09), 39.9)
# BREATH 45.5–47.3: the system recedes — only shimmer, inhaled into the morning
pad(["A4", "C5", "E5", "G5"], 45.4, 47.5, 0.03, bright=1.0, a=0.2, r=1.5)
L, R = reverse_swell(W(47.3) - W(45.7), ["F3", "A3", "C4", "E4"], 0.1)
place(music, L, 45.7, 1, -0.2)
place(music, R, 45.7, 1, 0.2)
place(drums, boom(0.3), 47.3)
# CALM 47.3–53.4: keys — morning, then focus
pad(["F2", "C3", "A3"], 47.3, 50.5, 0.06, bright=1.5, a=0.6, r=0.6)
pad(["D2", "A2", "F3"], 50.5, 53.6, 0.055, bright=1.4, a=0.6, r=0.8)
for t, nt in zip(np.arange(47.5, 53.4, 0.5), ["F4", "A4", "C5", "E5", "C5", "A4", "G4", "A4", "D5", "F5", "E5", "D5"]):
    place(music, keys(hz(nt)), t, 0.065, pan=0.2 * np.sin(t))
for t in np.arange(50.5, 53.4, 0.25):  # a soft pulse while you write
    place(drums, hat(0.045), t, pan=0.3)
# RESOLVE 53.4–63.2: the halo sweeps in and settles
place(sfx, noise_sweep(1.2, 200, 7000, 0.11), 53.3)
L, R = reverse_swell(1.1, ["D3", "A3", "D4", "F4"], 0.12)
place(music, L, 53.4, 1, -0.2)
place(music, R, 53.4, 1, 0.2)
HIT = 54.5
place(drums, boom(1.0), HIT)
pad(["F1", "F2", "C3"], HIT, 61.5, 0.11, bright=2.0, a=0.02, r=2.5)
pad(["A3", "C4", "E4", "G4"], HIT, 61.5, 0.08, bright=3.0, a=0.3, r=2.5)
pad(["C5", "E5", "G5"], HIT + 0.5, 61.5, 0.02, bright=1.0, a=1.5, r=2.5)
for t, nt in zip(np.arange(56.5, 61.5, 0.5), ["C5", "F5", "A5", "G5", "E5", "F5", "C6", "A5", "G5", "F5"]):
    place(music, keys(hz(nt), 3.0), t, 0.05, pan=0.25 * np.sin(t * 1.3))

WARP = False

# ── sound design from the timeline's cues (film time) ─────────────────────
print("sfx…")


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
meta = json.load(open(os.path.join(ROOT, "scripts", ".vo", LANG, "meta.json")))
for m in meta:
    s, sr = sf.read(os.path.join(ROOT, "scripts", ".vo", LANG, f"line_{m['i']:02d}.wav"))
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
wav = os.path.join(ROOT, "scripts", f".mix-{LANG}.wav")
sf.write(wav, mix.T, SR)
# loudness-normalise to −14 LUFS (social / web), true-peak −1 dBTP
out = os.path.join(ROOT, "public", "audio", f"astrya-mix-{LANG}.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
