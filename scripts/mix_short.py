#!/usr/bin/env python3
"""
ASTRYA — soundtrack of the 30-second cut (?cut=short): score + voice-over +
sound design, in film time.

    node scripts/render.mjs --dev --cut short --cues scripts/cues.short.json
    python3 scripts/voice.py short
    python3 scripts/mix_short.py              # → public/audio/astrya-mix-short.m4a

Score — 120 BPM, beats at 0.3 + 0.5 k, every picture hit on a beat:
  0–0.8      riser into the spark                  (impact 0.8)
  0.8–5.3    the noise: heartbeat → four-on-the-floor, ostinato, accents on
             Emails / Meetings / Invoices, snare roll into the vortex
  5.8        IGNITION — impact + open chord, the halo; riser into the fly-through
  8.3–14.3   GROOVE under the voice; whip impacts on every cut
  14.3–15.8  BUILD — toms, roll, riser
  15.8–21.8  CLIMAX on the flash: full kit, chords, lead (room left for the voice)
  21.8–30    RESOLVE — sub drop into the halo, impact at 22.8, final chord, keys
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import lfilter, resample_poly

from audiolib import SR, hz, env, hp, bp, saw_pad, pluck, keys, kick, tom, clap, hat, boom, noise_sweep, reverse_swell, click_s, tick_s, chime_s, reverb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.short.json")))
cuts = [10.3, 14.3, 17.3, 21.8]
DUR = float(sheet["duration"])
N = int((DUR + 1.0) * SR)
t_all = np.arange(N) / SR
music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
vo = np.zeros((2, N))
B = 0.5  # beat


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


def pad(notes, t0, t1, gain, bright=3.0, a=1.2, r=1.4):
    n = int((t1 - t0 + r) * SR)
    L, R = saw_pad([hz(x) for x in notes], (t1 - t0 + r), bright)
    e = env(n, a, r)
    i = int(t0 * SR)
    m = min(n, N - i)
    music[0, i : i + m] += (L * e)[:m] * gain
    music[1, i : i + m] += (R * e)[:m] * gain


def grid(t0, t1, step):
    return np.arange(t0, t1 - 1e-6, step)


def bass(note, t, gain):
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    f = hz(note)
    b = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt * 9) * (1 - np.exp(-tt * 400))
    place(music, b, t, gain)


DM9 = ["D3", "A3", "C4", "E4", "F4"]
BB = ["Bb2", "F3", "A3", "D4"]
F_ = ["F2", "C3", "A3", "C4", "G4"]
C_ = ["C3", "G3", "E4", "G4"]

print("score…")
# 0–0.8: riser into the spark
place(sfx, noise_sweep(0.8, 200, 5000, 0.1), 0.0)
L, R = reverse_swell(0.8, ["D3", "A3", "D4"], 0.08)
place(music, L, 0.0, 1, -0.2)
place(music, R, 0.0, 1, 0.2)
place(drums, boom(0.7), 0.8)
# 0.8–5.3: the noise — drone, heartbeat into four-on-the-floor, ostinato
pad(["D2", "A2"], 0.8, 5.6, 0.1, bright=1.4, a=0.4, r=0.4)
pad(["A4", "D5", "E5"], 1.3, 5.6, 0.025, bright=1.0, a=1.5, r=0.3)
for t in grid(1.3, 3.3, 1.0):
    place(drums, kick(0.45, deep=1.5), t)
for t in grid(3.3, 5.3, B):
    place(drums, kick(0.6, deep=1.3), t)
for i, t in enumerate(grid(1.3, 5.3, 0.25)):
    f = hz(["D4", "A4", "F4", "A4"][i % 4]) * (2 if t >= 3.3 else 1)
    place(music, pluck(f, 0.5), t, 0.035 + 0.012 * (t - 1.3), pan=0.35 * np.sin(i))
VOT = json.load(open(os.path.join(ROOT, "src", "narration.timing.short.json")))
for t in VOT["atonce"]["phrases"][:3]:  # Emails / Meetings / Invoices, on the spoken words
    place(drums, tom(95, 0.55), t, pan=0.0)
    place(drums, clap(0.35), t)
    place(music, pluck(hz("D6"), 1.2, 1.3), t, 0.06)
for k, t in enumerate(grid(4.3, 5.8, 0.125)):
    place(drums, clap(0.08 + 0.012 * k), t)
place(sfx, noise_sweep(1.5, 300, 7000, 0.12), 4.3)
L, R = reverse_swell(0.6, ["F3", "A3", "C4", "G4"], 0.16)
place(music, L, 5.2, 1, -0.2)
place(music, R, 5.2, 1, 0.2)
# 5.8: IGNITION
place(drums, boom(1.0), 5.8)
pad(F_, 5.8, 8.3, 0.12, bright=3.5, a=0.03, r=1.2)
pad(["F5", "A5", "C6"], 5.8, 8.3, 0.022, bright=1.0, a=0.6, r=1.0)
for t, nt in zip([6.3, 6.8, 7.3], ["C6", "A5", "F5"]):
    place(music, keys(hz(nt), 2.5), t, 0.06, pan=0.2)
place(sfx, noise_sweep(0.75, 300, 6000, 0.1), 7.55)
# 8.3–14.3: GROOVE
prog = [(8.3, DM9, "D2"), (10.3, BB, "Bb1"), (12.3, F_, "F2")]
for (t0, ch, _), (t1, _, _) in zip(prog, prog[1:] + [(14.3, None, None)]):
    pad(ch, t0, t1, 0.085, bright=2.6, a=0.2, r=0.6)
for t in grid(8.3, 14.3, 0.25):
    root = [b for k, _, b in prog if k <= t + 1e-6][-1]
    bass(root, t, 0.12)
for i, t in enumerate(grid(8.3, 14.3, 0.125)):
    ch = [c for k, c, _ in prog if k <= t + 1e-6][-1]
    under = 0.6 if 8.1 <= t < 11.3 else 1.0  # room for "It reads every email…"
    place(music, pluck(hz(ch[[0, 2, 1, 3, 2, 1][i % 6] % len(ch)]) * 2, 0.4, 0.8), t, 0.03 * under, pan=0.4 * np.sin(i * 0.7))
for t in grid(8.3, 14.3, B):
    place(drums, kick(0.8), t)
for t in grid(8.8, 14.3, 1.0):
    place(drums, clap(0.33), t)
for t in grid(8.3, 14.3, 0.25):
    place(drums, hat(0.09 if round(t * 4) % 2 else 0.14), t, pan=0.25)
# 14.3–15.8: BUILD
for k, t in enumerate([14.3, 14.55, 14.8, 15.05, 15.3, 15.425, 15.55, 15.675]):
    place(drums, tom(115 - (k % 3) * 18, 0.3 + 0.03 * k), t, pan=[-0.4, 0, 0.4][k % 3])
for k, t in enumerate(grid(14.8, 15.8, 0.0625)):
    place(drums, clap(0.08 + 0.01 * k), t)
pad(BB, 14.3, 15.8, 0.06, bright=2.0, a=0.3, r=0.3)
place(sfx, noise_sweep(1.5, 200, 8000, 0.13), 14.3)
# 15.8–21.8: CLIMAX — held back under "One intelligence." and "Connected…"
def room(t):
    return 0.45 if (15.9 <= t < 17.5 or 17.7 <= t < 21.6) else 1.0


place(drums, boom(1.0), 15.8)
cl = [(15.8, DM9), (17.8, BB), (19.8, F_)]
for (t0, ch), (t1, _) in zip(cl, cl[1:] + [(21.8, None)]):
    pad(ch, t0, t1, 0.12 if t0 >= 19.8 else 0.08, bright=5.0 if t0 >= 19.8 else 3.0, a=0.03, r=0.5)
    pad([c[:-1] + str(int(c[-1]) + 1) for c in ch[1:3]], t0, t1, 0.04 if t0 >= 19.8 else 0.015, bright=6.0, a=0.03, r=0.5)
for t in grid(15.8, 21.8, B):
    place(drums, kick(1.0, deep=1.2), t)
for t in grid(16.3, 21.8, 1.0):
    place(drums, clap(0.42 * room(t)), t)
for t in grid(15.8, 21.8, 0.25):
    place(drums, hat(0.12 * room(t)), t, pan=-0.2)
lead = ["D5", "F5", "A5", "C6", "Bb5", "A5", "F5", "G5", "A5", "C6", "D6", "C6"]
for i, t in enumerate(grid(15.8, 21.8, B)):
    place(music, pluck(hz(lead[i % len(lead)]), 1.0, 1.2), t, 0.06 * room(t), pan=0.15)
    place(music, pluck(hz(lead[i % len(lead)]) / 2, 1.0, 1.0), t, 0.035 * room(t), pan=-0.15)
for i, t in enumerate(grid(15.8, 21.8, 0.125)):
    ch = [c for k, c in cl if k <= t + 1e-6][-1]
    place(music, pluck(hz(ch[i % 4 % len(ch)]) * 2, 0.35, 1.0), t, 0.026 * room(t), pan=0.5 * np.sin(i))
place(drums, boom(0.5), 17.3)
# 21.8–30: RESOLVE
L, R = reverse_swell(0.6, ["D3", "A3", "D4", "F4"], 0.14)
place(music, L, 21.2, 1, -0.2)
place(music, R, 21.2, 1, 0.2)
place(drums, boom(0.45), 21.8)
place(sfx, noise_sweep(1.0, 200, 7000, 0.11), 21.8)
place(drums, boom(1.0), 22.8)
pad(["F1", "F2", "C3"], 22.8, 28.6, 0.11, bright=2.0, a=0.02, r=2.2)
pad(["A3", "C4", "E4", "G4"], 22.8, 28.6, 0.08, bright=3.0, a=0.3, r=2.2)
pad(["C5", "E5", "G5"], 23.3, 28.6, 0.022, bright=1.0, a=1.2, r=2.2)
for t, nt in zip(grid(24.3, 28.3, B), ["C5", "F5", "A5", "G5", "E5", "F5", "C6", "A5"]):
    place(music, keys(hz(nt), 3.0), t, 0.05, pan=0.25 * np.sin(t * 1.3))

# the cuts: a whoosh into each one, a short impact on it
for k, c in enumerate(cuts):
    place(sfx, noise_sweep(0.45, 400, 5000, 0.12, "rise"), c - 0.45, pan=0.3 * (-1) ** k)
    place(sfx, boom(0.28), c)

# ── sound design from the timeline's cues (film time) ─────────────────────
print("sfx…")
pent = [hz(n) for n in ["D6", "E6", "F#6", "A6", "B6", "D7"]]
ticks = [hz(n) for n in ["A6", "D7", "E7", "F#6", "B6"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = max(0.1, min(c.get("dur") or 1.0, 3.0))
    pan = float(np.sin(k * 1.7) * 0.35)
    if ty == "hit":
        place(sfx, boom(0.4 * g), t0)
    elif ty == "soft":
        place(sfx, boom(0.18 * g), t0)
    elif ty == "riser":
        place(sfx, noise_sweep(d, 250, 5000, 0.06 * g), t0)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 2500, 0.1 * g, "bell"), t0, pan=pan)
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
meta = json.load(open(os.path.join(ROOT, "scripts", ".vo", "short", "meta.json")))
for m in meta:
    s, sr = sf.read(os.path.join(ROOT, "scripts", ".vo", "short", f"line_{m['i']:02d}.wav"))
    if sr != SR:
        s = resample_poly(s, SR, sr)
    # a warm, close voice: low cut, a touch of chest, a soft air lift, no harsh presence peak
    s = hp(s, 75)
    s = s + 0.14 * bp(s, 140, 380) + 0.08 * bp(s, 5000, 10000) + 0.06 * bp(s, 1800, 3500)
    place(vo, s, m["at"], 1.0)
lvl = np.abs(vo[0]) + np.abs(vo[1])
lvl = lfilter([1 - 0.9995], [1, -0.9995], lvl)
vo *= np.where(lvl > 0.08, (0.08 / np.maximum(lvl, 1e-6)) ** 0.3, 1.0)  # gentle levelling, keeps the dynamics

# ── space, ducking, master ───────────────────────────────────────────────
print("mix…")
bus = music + 0.5 * sfx
wet = np.stack([reverb(bus[0], 0.0, 1.3), reverb(bus[1], 2.3, 1.3)])
music_mix = music * 0.85 + wet * 0.5 + drums * 0.95 + reverb(drums[0], 1.0, 0.6) * 0.15
sfx_mix = sfx * 0.8 + wet * 0.15
vo_mix = vo + np.stack([reverb(vo[0], 0.5, 0.7), reverb(vo[1], 1.7, 0.7)]) * 0.08
voice_env = np.abs(vo[0]) + np.abs(vo[1])
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
e = np.zeros(N)
acc = 0.0
for i in range(0, N, 64):
    v = voice_env[i : i + 64].max()
    acc = att * acc + (1 - att) * v if v > acc else rel * acc + (1 - rel) * v
    e[i : i + 64] = acc
duck = 1 - 0.8 * np.clip(e / (e.max() * 0.3 + 1e-9), 0, 1)
mid = np.stack([bp(music_mix[0], 300, 4000), bp(music_mix[1], 300, 4000)])
bed_music = music_mix * duck - mid * (1 - duck) * 0.6
bed = bed_music + sfx_mix * (0.45 + 0.55 * duck)
mix = bed + vo_mix * 1.7
for m in meta:
    a, b = int(m["at"] * SR), int((m["at"] + m["dur"]) * SR)
    rv = np.sqrt(np.mean(hp(vo_mix[0, a:b] * 1.7, 150) ** 2)) + 1e-9
    rb = np.sqrt(np.mean(hp(bed[0, a:b], 150) ** 2)) + 1e-9
    print(f"  voice/bed {m['id']:11s} {20 * np.log10(rv / rb):+5.1f} dB")
mix = np.stack([hp(mix[0], 25), hp(mix[1], 25)])
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= np.clip((DUR + 0.15 - t_all) / 1.4, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-short.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-mix-short.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
