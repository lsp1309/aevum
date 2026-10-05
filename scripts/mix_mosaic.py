#!/usr/bin/env python3
"""
ASTRYA — Mosaic (mosaic.html, 9:16): score + voice-over + sound design.

    node scripts/render.mjs --dev --page mosaic --cues scripts/cues.mosaic.json
    python3 scripts/voice.py mosaic
    python3 scripts/mix_mosaic.py               # → public/audio/astrya-mosaic.m4a

D major, 105 BPM from the burst. The sound of the film is the split-flap:
every tile that flips clacks (density follows the picture).
  PIECES     no harmony: clatter, a ticking pulse that tightens, a low drone,
             a riser… then one huge clatter (every tile at once) and silence
  TOGETHER   a cobalt shimmer, a warm open chord, two chimes on the name,
             an impact as the mosaic bursts
  THE APP    clean and precise: soft kick, shaker, muted plucks, round bass —
             a layer more for each module (keys for the reply, claps for the
             week, an arpeggio for the agents)
  NIGHT      sub drop, wide pad, a pulse; a hit on every tower; the big one
             on "together"
  PICTURE    a rising shimmer through the mosaics, the final chord on the mark
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import lfilter, resample_poly

from audiolib import SR, rng, hz, env, lp, hp, bp, saw_pad, pluck, keys, kick, tom, clap, hat, boom, noise_sweep, reverse_swell, click_s, chime_s, reverb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.mosaic.json")))
S = sheet["chapters"]
DUR = float(sheet["duration"])
N = int((DUR + 1.0) * SR)
t_all = np.arange(N) / SR
music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
vo = np.zeros((2, N))
BEAT = 60 / 105
B0 = S["burst"] + 0.35


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


def flap(g, bright=1.0):
    """One split-flap clack: a hard plastic tick and a short hollow body."""
    n = int(0.07 * SR)
    tt = np.arange(n) / SR
    tick = bp(rng.standard_normal(n), 1800, 7000) * np.exp(-tt * 320)
    body = np.sin(2 * np.pi * (480 + 300 * bright) * tt) * np.exp(-tt * 90) * 0.5
    thock = np.sin(2 * np.pi * 150 * tt) * np.exp(-tt * 60) * 0.35
    return (tick + body + thock) * g * 0.12


def clatter(dur, g):
    """Every tile at once: a dense rattle that dies away."""
    n = int(dur * SR)
    out = np.zeros(n)
    k = 0
    t = 0.0
    while t < dur * 0.8:
        s = flap(1.0, rng.random())
        i = int(t * SR)
        m = min(len(s), n - i)
        out[i : i + m] += s[:m] * (1 - t / dur) * (0.6 + 0.4 * rng.random())
        t += 0.0025 + 0.004 * rng.random() + t * 0.02
        k += 1
    return out * g


def sub(note, t, dur, gain):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = hz(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.22 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.006, min(0.1, dur / 2)) * np.exp(-tt * 2.2)
    place(music, s, t, gain)


def marimba(f, dur=0.6):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) + 0.35 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt * 30)
    return s * (1 - np.exp(-tt * 900))


D_ = ["D3", "A3", "E4", "F#4"]  # Dadd9
B_ = ["B2", "F#3", "D4", "A4"]  # Bm7
G_ = ["G2", "D3", "B3", "F#4"]  # Gmaj7
A_ = ["A2", "E3", "C#4", "E4"]  # Asus-ish
ROOTS = {"D": "D2", "B": "B1", "G": "G1", "A": "A1"}
CH = {"D": D_, "B": B_, "G": G_, "A": A_}
bars = [(B0 + 4 * BEAT * k, "DBGA"[k % 4]) for k in range(12)]


def chord_at(t):
    c = "D"
    for t0, n in bars:
        if t >= t0 - 1e-6:
            c = n
    return c


print("score…")
RS = S["reset"]
# ── PIECES ──────────────────────────────────────────────────────────────
pad(["D1", "A1"], 0.2, RS, 0.08, bright=1.1, a=1.5, r=0.05)
pad(["Ab3", "D4"], 2.2, RS, 0.02, bright=2.0, a=2.0, r=0.05)  # a tritone that will not resolve
tb = 1.2
while tb < RS - 0.1:  # a ticking pulse that tightens
    place(drums, kick(0.22 + 0.3 * tb / RS, deep=2.0), tb)
    place(sfx, flap(0.5, 0.2), tb + 0.01)
    tb += max(0.25, 0.75 - 0.09 * tb)
place(sfx, noise_sweep(RS - 2.0, 300, 7000, 0.12), 2.0)
L, R = reverse_swell(1.0, ["D2", "Ab2", "D3", "Ab3"], 0.12)
place(music, L, RS - 1.0, 1, -0.3)
place(music, R, RS - 1.0, 1, 0.3)
place(sfx, clatter(0.9, 1.6), RS - 0.01)
place(drums, boom(0.4), RS)
# ── TOGETHER ────────────────────────────────────────────────────────────
W0 = S["wave"]
place(sfx, noise_sweep(0.8, 1500, 9000, 0.07, "bell"), W0)
pad(["D2", "A2", "D3"], W0, S["burst"], 0.1, bright=2.0, a=0.3, r=0.6)
pad(["F#4", "A4", "E5"], W0 + 0.2, S["burst"], 0.04, bright=3.0, a=0.6, r=0.6)
for t, n in zip([S["letters"], S["letters"] + 0.33, S["letters"] + 0.9], ["A5", "E6", "F#6"]):
    place(music, keys(hz(n), 2.6), t, 0.05, pan=0.2)
L, R = reverse_swell(0.7, ["D3", "A3", "D4", "F#4"], 0.18)
place(music, L, S["burst"] - 0.4, 1, -0.3)
place(music, R, S["burst"] - 0.4, 1, 0.3)
place(drums, boom(1.0), B0)
# ── THE APP (B0 → night) ─────────────────────────────────────────────────
NI = S["night"]
for t in grid(B0, NI, BEAT):
    place(drums, kick(0.55, deep=1.1), t)
for t in grid(B0, NI, BEAT / 2):
    place(drums, hat(0.045 if round((t - B0) / (BEAT / 2)) % 2 else 0.07), t, pan=0.3)
for t in grid(B0, NI, BEAT / 2):
    sub(ROOTS[chord_at(t)], t, BEAT / 2 - 0.02, 0.13)
for (t0, c), (t1, _) in zip(bars, bars[1:] + [(NI, None)]):
    if t0 >= NI:
        break
    pad(CH[c], t0, min(t1, NI), 0.04, bright=2.0, a=0.25, r=0.4)
for i, t in enumerate(grid(B0, NI, BEAT / 2)):
    c = CH[chord_at(t)]
    place(music, marimba(hz(c[[1, 3, 2, 3][i % 4]]) * 2), t, 0.035, pan=0.4 * np.sin(i * 0.9))
for t, n in zip(grid(S["write"], S["chip"] + 0.3, BEAT), ["A4", "D5", "F#5", "E5"]):  # keys: the reply
    place(music, keys(hz(n), 2.0), t, 0.04, pan=-0.2)
for t in grid(S["chip"] + BEAT, NI, 2 * BEAT):  # claps join on the week
    place(drums, clap(0.22), t)
for i, t in enumerate(grid(S["agents"], NI, BEAT / 4)):  # the agents' arpeggio
    c = CH[chord_at(t)]
    place(music, pluck(hz(c[i % 4]) * 4, 0.25, 1.0), t, 0.014 + 0.01 * (t - S["agents"]) / (NI - S["agents"]), pan=[-0.5, 0, 0.5][i % 3])
place(sfx, noise_sweep(1.2, 300, 8000, 0.12), NI - 1.2)
# ── NIGHT (night → retract) ──────────────────────────────────────────────
RT = S["retract"]
place(drums, boom(1.2), NI)
pad(["B0", "B1", "F#2"], NI, RT, 0.11, bright=1.5, a=0.05, r=0.5)
pad(["D4", "F#4", "A4", "C#5"], NI + 0.3, RT, 0.05, bright=3.0, a=0.8, r=0.5)
for t in grid(NI + BEAT, RT, BEAT):
    sub("B1", t, BEAT - 0.03, 0.12)
    place(drums, kick(0.5, deep=1.3), t)
place(drums, boom(1.1), S["together"])
pad(["G1", "G2", "D3", "B3", "F#4", "A4"], S["together"], RT + 0.4, 0.09, bright=4.0, a=0.02, r=0.8)
# ── PICTURE ───────────────────────────────────────────────────────────────
PI, MK = S["picture"], S["mark"]
pad(["D2", "A2"], PI, MK, 0.07, bright=1.2, a=0.4, r=0.4)
for i, t in enumerate(grid(PI + 0.1, MK, 0.07)):
    place(music, pluck(hz(["D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6", "A6"][min(8, i // 3)]), 0.35, 1.2), t, 0.016 + 0.0015 * i, pan=np.sin(i * 0.7) * 0.5)
L, R = reverse_swell(0.8, ["D3", "A3", "D4", "F#4", "A4"], 0.2)
place(music, L, MK - 0.8, 1, -0.3)
place(music, R, MK - 0.8, 1, 0.3)
place(drums, boom(1.0), MK)
pad(["D1", "D2", "A2"], MK, DUR - 0.2, 0.1, bright=2.0, a=0.02, r=1.6)
pad(["F#3", "A3", "C#4", "E4"], MK, DUR - 0.2, 0.055, bright=2.6, a=0.15, r=1.6)
pad(["A4", "D5", "F#5"], MK + 0.6, DUR - 0.2, 0.018, bright=1.0, a=1.0, r=1.6)
for t, n in zip([S["word"] + 0.6, S["tag"] + 0.3, S["cta"], S["cta"] + 0.9], ["F#5", "A5", "D6", "E6"]):
    place(music, keys(hz(n), 3.0), t, 0.045, pan=0.2)

# ── sound design from the timeline's cues ─────────────────────────────────
print("sfx…")
pent = [hz(n) for n in ["D6", "E6", "F#6", "A6", "B6", "D7"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = max(0.1, min(c.get("dur") or 1.0, 3.0))
    pan = float(np.sin(k * 1.7) * 0.4)
    if ty == "tick":  # every tick of this film is a flap
        if t0 < RS:  # the wall: several flaps per cue, spread across the stereo field
            for j in range(1 + int(g * 3)):
                place(sfx, flap(0.55 + 0.45 * g, rng.random()), t0 + rng.random() * 0.045, pan=float(rng.random() * 1.6 - 0.8))
        else:
            place(sfx, flap(0.8 * g, 0.6), t0, pan=pan * 0.5)
    elif ty == "hit":
        place(sfx, boom(0.35 * g), t0)
    elif ty == "soft":
        place(sfx, boom(0.14 * g), t0)
    elif ty == "riser":
        place(sfx, noise_sweep(d, 250, 6000, 0.05 * g), t0)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 3000, 0.09 * g, "bell"), t0, pan=pan)
    elif ty == "click":
        place(sfx, click_s(g * 1.2), t0, pan=0.15)
        place(sfx, flap(0.7 * g, 0.9), t0)
    elif ty == "chime":
        place(sfx, chime_s(g, pent[k % len(pent)]), t0, pan=pan * 0.6)
    elif ty == "sweep":
        place(sfx, noise_sweep(d, 2500, 9500, 0.06 * g, "bell"), t0, pan=pan)

# ── voice-over ────────────────────────────────────────────────────────────
print("voice…")
meta = json.load(open(os.path.join(ROOT, "scripts", ".vo", "mosaic", "meta.json")))
for m in meta:
    s, sr = sf.read(os.path.join(ROOT, "scripts", ".vo", "mosaic", f"line_{m['i']:02d}.wav"))
    if sr != SR:
        s = resample_poly(s, SR, sr)
    s = hp(s, 80)
    s = s + 0.15 * bp(s, 130, 360) + 0.08 * bp(s, 5000, 10000) + 0.05 * bp(s, 1800, 3500)
    place(vo, s, m["at"], 1.0)
lvl = np.abs(vo[0]) + np.abs(vo[1])
lvl = lfilter([1 - 0.9995], [1, -0.9995], lvl)
vo *= np.where(lvl > 0.08, (0.08 / np.maximum(lvl, 1e-6)) ** 0.3, 1.0)

# ── space, ducking, master ────────────────────────────────────────────────
print("mix…")
bus = music + 0.4 * sfx
wet = np.stack([reverb(bus[0], 0.0, 1.3), reverb(bus[1], 2.3, 1.3)])
music_mix = music * 0.85 + wet * 0.5 + drums * 0.95 + reverb(drums[0], 1.0, 0.6) * 0.12
sfx_mix = sfx * 0.9 + wet * 0.12
vo_mix = vo + np.stack([reverb(vo[0], 0.5, 0.7), reverb(vo[1], 1.7, 0.7)]) * 0.08
voice_env = np.abs(vo[0]) + np.abs(vo[1])
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
e = np.zeros(N)
acc = 0.0
for i in range(0, N, 64):
    v = voice_env[i : i + 64].max()
    acc = att * acc + (1 - att) * v if v > acc else rel * acc + (1 - rel) * v
    e[i : i + 64] = acc
duck = 1 - 0.75 * np.clip(e / (e.max() * 0.3 + 1e-9), 0, 1)
mid = np.stack([bp(music_mix[0], 300, 4000), bp(music_mix[1], 300, 4000)])
bed_music = music_mix * duck - mid * (1 - duck) * 0.6
bed = (bed_music + sfx_mix * (0.5 + 0.5 * duck)) * 1.75
mix = bed + vo_mix * 1.75
for m in meta:
    a, b = int(m["at"] * SR), int((m["at"] + m["dur"]) * SR)
    rv = np.sqrt(np.mean(hp(vo_mix[0, a:b] * 1.75, 150) ** 2)) + 1e-9
    rb = np.sqrt(np.mean(hp(bed[0, a:b], 150) ** 2)) + 1e-9
    print(f"  voice/bed {m['id']:9s} {20 * np.log10(rv / rb):+5.1f} dB")
mix = np.stack([hp(mix[0], 25), hp(mix[1], 25)])
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= np.clip((DUR + 0.15 - t_all) / 1.2, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-mosaic.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-mosaic.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
