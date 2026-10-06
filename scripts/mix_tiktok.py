#!/usr/bin/env python3
"""
ASTRYA — TikTok (tiktok.html, 9:16): cinematic score + sound design (no voice).

    node scripts/render.mjs --page astria --cues scripts/cues.tiktok.json
    python3 scripts/mix_tiktok.py           # → public/audio/astrya-tiktok.m4a

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
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.tiktok.json")))
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
GRID0 = S["inbox"]
def chord(t):
    k = int(np.floor((t - GRID0) / (4 * BEAT) + 1e-6)) % 4
    return PROG[k]



def groove(t0, t1, full=1.0, clap_on=True, filt=None):
    for t in grid(t0, t1, BEAT):
        place(drums, kick(0.95 * full), t)
    if clap_on:
        for t in grid(t0 + BEAT, t1, 2 * BEAT):
            place(drums, clap(0.4 * full), t)
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


# ── I. space: eclipse ─────────────────────────────────────────────────────
sub("D1", 0.0, S["dive"], 0.16, a=1.5, r=0.6)
pad(["D2", "A2", "D3", "F3"], 0.0, S["dive"] + 0.4, 0.06, bright=1.8, a=1.5, r=0.6)
L, R = reverse_swell(1.4, ["D4", "A4", "D5", "E5"], 0.2)
place(music, L, 0.15, 1, -0.3); place(music, R, 0.15, 1, 0.3)
place(drums, boom(0.9), 1.55)
pad(["A4", "D5", "E5", "A5"], 1.55, S["dive"], 0.022, bright=7, a=0.05, r=0.5)
place(music, keys(hz("A5"), 3.0), S["signal"], 0.07, pan=0.3)
place(music, keys(hz("D6"), 3.0), S["signal"] + 0.3, 0.05, pan=0.3)
for i, t in enumerate(grid(S["notice"], S["dive"], BEAT / 2)):
    place(drums, kick(0.35 + 0.1 * i, deep=1.4), t)
L, R = reverse_swell(0.8, ["D4", "A4", "D5", "F5"], 0.18)
place(music, L, S["dive"] - 0.8, 1, -0.3); place(music, R, S["dive"] - 0.8, 1, 0.3)

# ── II. the dive, the city, the envelope ──────────────────────────────────
place(drums, boom(1.0), S["dive"])
place(sfx, noise_sweep(S["city"] - S["dive"], 200, 9000, 0.16, "rise"), S["dive"])
place(drums, boom(0.6), S["city"])
sub("D1", S["city"], S["env"], 0.14, a=0.05, r=0.1)
for i, t in enumerate(grid(S["city"], S["env"], BEAT / 2)):
    place(drums, kick(0.5 + 0.04 * i, deep=1.3), t)
    place(music, lp(pluck(hz(["D4", "A4", "F4", "A4"][i % 4]) * 2, 0.25, 0.8), 1200 + 500 * i), t, 0.05, pan=0.4 * np.sin(i))
place(sfx, noise_sweep(1.0, 400, 10000, 0.14, "rise"), S["env"] - 1.0)
place(drums, boom(1.1), S["env"])
pad(["D3", "A3", "D4", "F4", "A4"], S["env"], S["inbox"] + 0.3, 0.05, bright=4, a=0.02, r=0.6)
for i in range(10):
    place(music, pluck(hz(["D5", "F5", "A5", "C6", "D6", "E6", "F6"][i % 7]), 0.6, 1.2), S["unfold"] + i * 0.06, 0.028, pan=np.sin(i * 1.3) * 0.7)

# ── III. the flood ────────────────────────────────────────────────────────
groove(S["inbox"], S["tooMany"], 0.7, clap_on=False, filt=1800)
place(drums, boom(1.1), S["tooMany"])
groove(S["tooMany"], S["tower"], 1.0)
pad(["D2", "Eb3", "A3", "D4", "Eb4"], S["saturate"], S["tower"], 0.05, bright=6, a=0.4, r=0.05)
place(sfx, noise_sweep(S["tower"] - S["saturate"] + 0.6, 300, 12000, 0.15, "rise"), S["saturate"] - 0.6)
for t in grid(S["saturate"], S["tower"], 0.075):
    place(drums, tom(70 + 30 * (t - S["saturate"]) / (S["tower"] - S["saturate"]), 0.3), t)

# ── IV. the tower ─────────────────────────────────────────────────────────
place(drums, boom(1.4), S["tower"] + 0.42)
sub("D1", S["tower"] + 0.42, S["converge"], 0.15, a=0.3, r=0.1)
pad(["D3", "A3", "C4", "F4"], S["tower"] + 0.42, S["converge"] + 0.4, 0.045, bright=3, a=0.4, r=0.3)
for k in range(5):
    t0 = S["levels"] + k * 0.8
    place(drums, boom(0.45 + 0.1 * k), t0)
    for i, t in enumerate(grid(t0, t0 + 0.8, BEAT / 4)):
        nm, ch = PROG[k % 4]
        place(music, pluck(hz(ch[i % 4]) * (2 + (k > 2)), 0.25, 1.1), t, 0.022 + 0.004 * k, pan=0.5 * np.sin(i))
    for t in grid(t0, t0 + 0.8, BEAT / (2 if k < 3 else 4)):
        place(drums, kick(0.6 + 0.08 * k, deep=1.2), t)
place(sfx, noise_sweep(S["clean"] - S["converge"] + 1.0, 300, 13000, 0.17, "rise"), S["converge"] - 1.0)
L, R = reverse_swell(0.9, ["D3", "A3", "D4", "F4", "A4"], 0.26)
place(music, L, S["clean"] - 0.9, 1, -0.3); place(music, R, S["clean"] - 0.9, 1, 0.3)

# ── V. the clean inbox, the email, the reply, the tasks ───────────────────
place(drums, boom(1.7), S["clean"])
place(drums, boom(0.9), S["clean"] + 0.02)
pad(["A4", "D5", "F5", "A5"], S["clean"], S["into"], 0.022, bright=6, a=0.05, r=0.4)
groove(S["clean"], S["into"], 0.75, filt=3000)
groove(S["detail"], S["approve"], 0.55, clap_on=False, filt=2200)
place(drums, boom(1.2), S["approve"] + 0.15)
groove(S["approve"] + 0.15, S["morning"], 1.05)
pad(["A4", "D5", "F5", "A5"], S["approve"] + 0.15, S["morning"], 0.02, bright=6, a=0.05, r=0.3)

# ── VI. morning, pull-out, finale ─────────────────────────────────────────
pad(["F3", "A3", "C4", "E4"], S["morning"], S["pullout"], 0.05, bright=3, a=0.1, r=0.5)
for i, t in enumerate(grid(S["morning"], S["pullout"] - 0.2, BEAT / 2)):
    place(music, pluck(hz(["F5", "A5", "C6", "E6"][i % 4]), 0.5, 1.2), t, 0.025, pan=np.sin(i) * 0.6)
place(drums, boom(1.3), S["pullout"])
place(sfx, noise_sweep(1.6, 9000, 300, 0.12, "bell"), S["pullout"])
pad(["Bb1", "Bb2", "F3"], S["pullout"], S["logo"], 0.08, bright=2, a=0.05, r=0.6)
pad(["D4", "F4", "A4", "C5"], S["pullout"], S["logo"], 0.035, bright=3, a=0.4, r=0.6)
for i, t in enumerate(grid(S["net"], S["logo"] - 0.2, 0.18)):
    place(music, pluck(hz(["F5", "A5", "C6", "D6", "E6"][i % 5]), 0.6, 1.3), t, 0.02, pan=np.sin(i * 1.1) * 0.7)
place(drums, boom(1.4), S["logo"])
pad(["D1", "D2", "A2"], S["logo"], DUR - 0.3, 0.1, bright=2, a=0.02, r=1.8)
pad(["F3", "A3", "D4", "E4", "A4"], S["logo"], DUR - 0.3, 0.05, bright=3, a=0.2, r=1.8)
for t, n in zip([S["logo"] + 0.3, S["logo"] + 0.7, S["tag"], S["tag"] + 0.4], ["A5", "D6", "E6", "F6"]):
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
wav = os.path.join(ROOT, "scripts", ".mix-tiktok.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-tiktok.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=10", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
