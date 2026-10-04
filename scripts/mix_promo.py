#!/usr/bin/env python3
"""
ASTRYA — Signal (promo.html, 9:16): score + voice-over + sound design.

    node scripts/render.mjs --dev --page promo --cues scripts/cues.promo.json
    python3 scripts/voice.py promo
    python3 scripts/mix_promo.py               # → public/audio/astrya-promo.m4a

The score follows the picture act by act, in F minor, 120 BPM from the
downbeat on "…into signal" (B0); every big picture event sits on a beat.
  0–5.55     NOISE — no harmony: a heartbeat that accelerates, notification
             pings that multiply, a riser… cut dead when time stops
  5.55–B0    THE NAME — near silence, a glass tone, six rising chimes, a
             reverse swell into the downbeat
  B0         IGNITION — impact, the scan sweep; a minimal pulse begins
  triage / reply / week — the groove grows layer by layer (bass, plucks,
             keys, claps), always under the voice
  agents     BUILD — sixteenths, toms, arps climbing, riser into the beam
  beam       CLIMAX — full kit, wide chords, lead (held back under the voice)
  bloom      the collapse into light; then DAWN — pad and keys only
  mark       a shimmer while the ring is drawn, a whoosh through it, and the
             final chord in daylight
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import lfilter, resample_poly

from audiolib import SR, rng, hz, env, lp, hp, bp, saw_pad, pluck, keys, kick, tom, clap, hat, boom, noise_sweep, reverse_swell, click_s, tick_s, chime_s, reverb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.promo.json")))
S = sheet["chapters"]
DUR = float(sheet["duration"])
B0 = S["ignite"]
beat = lambda k: B0 + 0.5 * k
N = int((DUR + 1.0) * SR)
t_all = np.arange(N) / SR
music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
vo = np.zeros((2, N))


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


def pad(notes, t0, t1, gain, bright=3.0, a=1.2, r=1.4, buf=None):
    n = int((t1 - t0 + r) * SR)
    L, R = saw_pad([hz(x) for x in notes], (t1 - t0 + r), bright)
    e = env(n, a, r)
    i = int(t0 * SR)
    m = min(n, N - i)
    b = music if buf is None else buf
    b[0, i : i + m] += (L * e)[:m] * gain
    b[1, i : i + m] += (R * e)[:m] * gain


def grid(t0, t1, step):
    return np.arange(t0, t1 - 1e-6, step)


def sub(note, t, dur, gain):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = hz(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.005, min(0.12, dur / 2)) * np.exp(-tt * 2.5)
    place(music, s, t, gain)


def ping(f, g):
    """A notification blip: two quick bright tones."""
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    a = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 40)
    b = np.sin(2 * np.pi * f * 1.5 * np.maximum(tt - 0.055, 0)) * np.exp(-np.maximum(tt - 0.055, 0) * 30) * (tt > 0.055)
    return (a + 0.8 * b) * (1 - np.exp(-tt * 2000)) * g * 0.05


def tape_stop(g):
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    f = 30 + 190 * np.exp(-tt * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.5)
    nz = lp(rng.standard_normal(n), 2500) * np.exp(-tt * 9) * 0.3
    return (s + nz) * g


def glass(notes, dur, g):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * hz(x) * tt + k) * (1 + 0.003 * np.sin(2 * np.pi * 5 * tt)) for k, x in enumerate(notes))
    return s * env(n, 0.35, 0.6) * g / len(notes)


FM9 = ["Ab3", "C4", "Eb4", "G4"]
DB = ["F3", "Ab3", "C4", "F4"]
AB = ["C4", "Eb4", "G4", "Ab4"]
EB = ["G3", "Bb3", "Eb4", "F4"]
BASS = {"F": "F1", "Db": "Db2", "Ab": "Ab1", "Eb": "Eb2"}
bars = [(beat(4 * k), ["F", "Db", "Ab", "Eb"][k % 4]) for k in range(8)]  # B0 … B0+16 s
CH = {"F": FM9, "Db": DB, "Ab": AB, "Eb": EB}


def chord_at(t):
    c = "F"
    for t0, n in bars:
        if t >= t0 - 1e-6:
            c = n
    return c


print("score…")
# ── NOISE (0 → freeze) ──────────────────────────────────────────────────
fz = S["freeze"]
pad(["F1", "C2"], 0.0, fz, 0.07, bright=1.2, a=1.5, r=0.05)
tb = 0.6
k = 0
while tb < fz - 0.05:  # heartbeat, accelerating
    place(drums, kick(0.35 + 0.35 * tb / fz, deep=1.8), tb)
    place(drums, kick(0.2 + 0.2 * tb / fz, deep=1.8), tb + 0.18)
    tb += max(0.36, 1.05 - 0.13 * tb)
    k += 1
for i, t in enumerate(grid(2.5, fz, 0.125)):  # pressure: a ticking ostinato
    place(music, pluck(hz(["F5", "C6", "Ab5", "C6"][i % 4]), 0.25, 0.6), t, 0.012 + 0.025 * ((t - 2.5) / (fz - 2.5)) ** 2, pan=0.5 * np.sin(i * 1.3))
place(sfx, noise_sweep(fz - 1.2, 200, 6000, 0.13), 1.2)
L, R = reverse_swell(1.2, ["F2", "C3", "F#3", "C#4"], 0.1)  # a dissonant swell into the stop
place(music, L, fz - 1.2, 1, -0.3)
place(music, R, fz - 1.2, 1, 0.3)
place(sfx, tape_stop(0.5), fz)
place(drums, boom(0.45), fz)
# ── THE NAME (freeze → B0) ───────────────────────────────────────────────
place(music, glass(["F5", "C6", "G6", "Ab6"], B0 - S["glow"] + 0.3, 0.05), S["glow"], 1, 0.0)
pad(["F2", "C3"], S["glow"], B0, 0.035, bright=1.0, a=1.0, r=0.1)
L, R = reverse_swell(1.0, ["F3", "Ab3", "C4", "Eb4", "G4"], 0.12)
place(music, L, B0 - 1.0, 1, -0.25)
place(music, R, B0 - 1.0, 1, 0.25)
place(sfx, noise_sweep(0.8, 400, 9000, 0.1), B0 - 0.8)
# ── IGNITION ─────────────────────────────────────────────────────────────
place(drums, boom(1.15), B0)
pad(["F1", "F2", "C3"], B0, B0 + 2.0, 0.12, bright=2.0, a=0.01, r=1.2)
pad(["Ab4", "C5", "Eb5", "G5"], B0, B0 + 1.5, 0.05, bright=4.0, a=0.01, r=1.4)
# ── GROOVE: triage → reply → week (B0+0.5 … lanes) ───────────────────────
G0, G1 = beat(1), S["lanes"]
for t in grid(G0, G1, 0.5):
    place(drums, kick(0.62, deep=1.15), t)
for t in grid(G0, G1, 0.25):
    c = chord_at(t)
    sub(BASS[c], t, 0.24, 0.16 if (t - B0) % 0.5 > 0.2 else 0.11)
for t in grid(beat(2), G1, 0.5):
    place(drums, hat(0.07, open_=False), t + 0.25, pan=0.3)
for i, t in enumerate(grid(G0, G1, 0.125)):
    c = CH[chord_at(t)]
    under = 0.55 if S["sort"] - 1.4 <= t < S["dive"] + 2.6 else 0.85
    place(music, pluck(hz(c[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]]) * 2, 0.35, 0.7), t, 0.022 * under, pan=0.45 * np.sin(i * 0.7))
for (t0, c), (t1, _) in zip(bars, bars[1:] + [(G1, None)]):
    if t0 >= G1:
        break
    pad(CH[c], t0, min(t1, G1), 0.05, bright=2.2, a=0.3, r=0.5)
for t, nt in zip(grid(S["dive"] + 0.5, S["land"], 0.5), ["C5", "Eb5", "G5", "F5", "Eb5"]):  # keys: the reply
    place(music, keys(hz(nt), 2.2), t, 0.045, pan=0.25)
for t in grid(S["land"] + 0.5, G1, 1.0):  # claps join on the week
    place(drums, clap(0.26), t)
# ── BUILD: agents (lanes → beam) ─────────────────────────────────────────
P = S["pillar"]
for t in grid(G1, P, 0.5):
    place(drums, kick(0.78, deep=1.1), t)
for t in grid(G1 + 0.5, P, 1.0):
    place(drums, clap(0.32), t)
for t in grid(G1, P, 0.125):
    place(drums, hat(0.05 + 0.04 * ((t - G1) / (P - G1)), open_=False), t, pan=-0.25)
for t in grid(G1, P, 0.25):
    c = chord_at(t)
    sub(BASS[c], t, 0.22, 0.16)
for i, t in enumerate(grid(G1, P, 0.125)):  # three arps, one per agent, climbing
    c = CH[chord_at(t)]
    oc = 2 if t < G1 + 1.5 else 4
    place(music, pluck(hz(c[i % 4]) * oc, 0.3, 1.0), t, 0.02 + 0.012 * ((t - G1) / (P - G1)), pan=[-0.5, 0, 0.5][i % 3])
for (t0, c), (t1, _) in zip(bars, bars[1:] + [(P, None)]):
    if t1 <= G1 or t0 >= P:
        continue
    pad(CH[c], max(t0, G1), min(t1, P), 0.06, bright=3.0, a=0.2, r=0.4)
for kk, t in enumerate(grid(P - 1.0, P, 0.125)):
    place(drums, tom(120 - (kk % 4) * 15, 0.22 + 0.03 * kk), t, pan=[-0.4, -0.1, 0.1, 0.4][kk % 4])
place(sfx, noise_sweep(1.5, 200, 9000, 0.14), P - 1.5)
# ── CLIMAX: the beam (P → bloom) ─────────────────────────────────────────
BL = S["bloom"]


def room(t):  # held back under "Every tool, every thread… working as one."
    return 0.38 if 20.05 <= t < 22.95 else 1.0


place(drums, boom(1.1), P)
clim = [(P, "Db", ["Db2", "Ab2"]), (P + 2.0, "Eb", ["Eb2", "Bb2"])]
for (t0, c, lo), (t1, _, _) in zip(clim, clim[1:] + [(BL - 0.5, None, None)]):
    pad(CH[c], t0, t1, 0.075, bright=4.0, a=0.02, r=0.5)
    pad(lo, t0, t1, 0.08, bright=1.5, a=0.02, r=0.5)
    pad([x[:-1] + str(int(x[-1]) + 1) for x in CH[c][1:3]], t0, t1, 0.03, bright=6.0, a=0.02, r=0.5)
for t in grid(P, BL - 0.5, 0.5):
    place(drums, kick(1.0 * (0.75 if room(t) < 1 else 1.0), deep=1.1), t)
for t in grid(P + 0.5, BL - 0.5, 1.0):
    place(drums, clap(0.4 * room(t)), t)
for t in grid(P, BL - 0.5, 0.25):
    place(drums, hat(0.11 * room(t), open_=round((t - B0) * 4) % 2 == 1), t, pan=0.2)
for t in grid(P, BL - 0.5, 0.25):
    sub(BASS["Db" if t < P + 2 else "Eb"], t, 0.22, 0.17)
lead = ["F5", "Ab5", "C6", "Eb6", "Db6", "C6", "Ab5", "Bb5"]
for i, t in enumerate(grid(P, BL - 0.5, 0.5)):
    place(music, pluck(hz(lead[i % len(lead)]), 1.0, 1.3), t, 0.055 * room(t), pan=0.15)
    place(music, pluck(hz(lead[i % len(lead)]) / 2, 1.0, 1.0), t, 0.03 * room(t), pan=-0.15)
place(drums, boom(0.3), S["one"])
place(sfx, noise_sweep(BL - S["implode"] + 0.2, 300, 10000, 0.16), S["implode"] - 0.2)
L, R = reverse_swell(0.8, ["F3", "C4", "F4", "Ab4", "C5"], 0.22)
place(music, L, BL - 0.8, 1, -0.3)
place(music, R, BL - 0.8, 1, 0.3)
# ── BLOOM → DAWN ─────────────────────────────────────────────────────────
place(drums, boom(1.3), BL)
place(sfx, noise_sweep(2.0, 9000, 400, 0.08, "bell"), BL)
R0, F = S["ring"], S["flood"]
pad(["Db2", "Ab2"], BL, R0 + 0.3, 0.1, bright=1.5, a=0.02, r=1.0)
pad(["F3", "Ab3", "C4", "Eb4"], BL, R0 + 0.3, 0.06, bright=2.0, a=0.6, r=1.0)
pad(["C5", "Eb5", "F5"], BL + 0.5, R0 + 0.3, 0.018, bright=1.0, a=1.2, r=1.0)
for t, nt in zip(grid(BL + 0.5, R0 - 0.2, 0.5), ["Ab4", "C5", "Eb5", "F5", "Eb5", "C5"]):
    place(music, keys(hz(nt), 2.6), t, 0.05, pan=0.3 * np.sin(t * 1.7))
# ── THE MARK ─────────────────────────────────────────────────────────────
for i, t in enumerate(grid(R0, R0 + 0.75, 0.0625)):  # a shimmer that traces the ring
    place(music, pluck(hz(["C6", "Eb6", "F6", "Ab6", "C7"][i % 5]), 0.4, 1.4), t, 0.02 + 0.002 * i, pan=np.sin(i * 0.8) * 0.6)
L, R = reverse_swell(0.9, ["Db3", "F3", "Ab3", "C4", "Eb4"], 0.13)
place(music, L, F - 0.9 + 0.5, 1, -0.3)
place(music, R, F - 0.9 + 0.5, 1, 0.3)
place(sfx, noise_sweep(0.6, 300, 8000, 0.14), F - 0.1)
place(drums, boom(1.0), F + 0.5)
pad(["Db1", "Db2", "Ab2"], F + 0.5, DUR - 0.2, 0.09, bright=2.0, a=0.02, r=1.6)
pad(["F3", "Ab3", "C4", "Eb4", "G4"], F + 0.5, DUR - 0.2, 0.055, bright=2.6, a=0.15, r=1.6)
pad(["C5", "F5", "Ab5"], F + 0.9, DUR - 0.2, 0.02, bright=1.0, a=1.0, r=1.6)
for t, nt in zip([F + 1.0, F + 1.5, F + 2.0, F + 2.75], ["Ab5", "C6", "Eb6", "F6"]):
    place(music, keys(hz(nt), 3.0), t, 0.05, pan=0.2)

# ── sound design from the timeline's cues ────────────────────────────────
print("sfx…")
pings = [hz(n) for n in ["C6", "E6", "Ab6", "D7", "F6", "A6", "C#7", "B6", "Eb6"]]
pent = [hz(n) for n in ["F5", "Ab5", "C6", "Eb6", "F6", "Ab6", "C7"]]
ticks = [hz(n) for n in ["C7", "F6", "Eb7", "Ab6", "G6"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = max(0.1, min(c.get("dur") or 1.0, 3.0))
    pan = float(np.sin(k * 1.7) * 0.4)
    if ty == "tick" and t0 < fz:  # the noise: notifications from everywhere
        place(sfx, ping(pings[(k * 5) % len(pings)] * (1 + 0.03 * np.sin(k)), g), t0, pan=float(np.sin(k * 2.3) * 0.8))
    elif ty == "hit":
        place(sfx, boom(0.35 * g), t0)
    elif ty == "soft":
        place(sfx, boom(0.14 * g), t0)
    elif ty == "riser":
        place(sfx, noise_sweep(d, 250, 6000, 0.05 * g), t0)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 3000, 0.09 * g, "bell"), t0, pan=pan)
    elif ty == "click":
        place(sfx, click_s(g), t0, pan=0.15)
    elif ty == "tick":
        place(sfx, tick_s(g, ticks[k % len(ticks)]), t0, pan=pan)
    elif ty == "chime":
        place(sfx, chime_s(g, pent[k % len(pent)]), t0, pan=pan * 0.6)
    elif ty == "sweep":
        place(sfx, noise_sweep(d, 2500, 9500, 0.06 * g, "bell"), t0, pan=pan)

# ── voice-over ───────────────────────────────────────────────────────────
print("voice…")
meta = json.load(open(os.path.join(ROOT, "scripts", ".vo", "promo", "meta.json")))
for m in meta:
    s, sr = sf.read(os.path.join(ROOT, "scripts", ".vo", "promo", f"line_{m['i']:02d}.wav"))
    if sr != SR:
        s = resample_poly(s, SR, sr)
    s = hp(s, 80)
    s = s + 0.16 * bp(s, 130, 360) + 0.09 * bp(s, 5000, 10000) + 0.05 * bp(s, 1800, 3500)
    place(vo, s, m["at"], 1.0)
lvl = np.abs(vo[0]) + np.abs(vo[1])
lvl = lfilter([1 - 0.9995], [1, -0.9995], lvl)
vo *= np.where(lvl > 0.08, (0.08 / np.maximum(lvl, 1e-6)) ** 0.3, 1.0)

# ── space, ducking, master ───────────────────────────────────────────────
print("mix…")
bus = music + 0.5 * sfx
wet = np.stack([reverb(bus[0], 0.0, 1.4), reverb(bus[1], 2.3, 1.4)])
music_mix = music * 0.85 + wet * 0.55 + drums * 0.95 + reverb(drums[0], 1.0, 0.6) * 0.15
sfx_mix = sfx * 0.85 + wet * 0.15
vo_mix = vo + np.stack([reverb(vo[0], 0.5, 0.75), reverb(vo[1], 1.7, 0.75)]) * 0.09
voice_env = np.abs(vo[0]) + np.abs(vo[1])
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
e = np.zeros(N)
acc = 0.0
for i in range(0, N, 64):
    v = voice_env[i : i + 64].max()
    acc = att * acc + (1 - att) * v if v > acc else rel * acc + (1 - rel) * v
    e[i : i + 64] = acc
duck = 1 - 0.78 * np.clip(e / (e.max() * 0.3 + 1e-9), 0, 1)
mid = np.stack([bp(music_mix[0], 300, 4000), bp(music_mix[1], 300, 4000)])
bed_music = music_mix * duck - mid * (1 - duck) * 0.6
bed = bed_music + sfx_mix * (0.45 + 0.55 * duck)
mix = bed * 1.25 + vo_mix * 1.75
for m in meta:
    a, b = int(m["at"] * SR), int((m["at"] + m["dur"]) * SR)
    rv = np.sqrt(np.mean(hp(vo_mix[0, a:b] * 1.75, 150) ** 2)) + 1e-9
    rb = np.sqrt(np.mean(hp(bed[0, a:b] * 1.25, 150) ** 2)) + 1e-9
    print(f"  voice/bed {m['id']:8s} {20 * np.log10(rv / rb):+5.1f} dB")
mix = np.stack([hp(mix[0], 25), hp(mix[1], 25)])
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= np.clip((DUR + 0.15 - t_all) / 1.2, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-promo.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-promo.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
