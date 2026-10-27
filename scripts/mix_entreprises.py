#!/usr/bin/env python3
"""
ASTRYA — Entreprises (entreprises.html, 16:9): original score + sound design (no voice).

    node scripts/render.mjs --page entreprises --dev --cues scripts/cues.entreprises.json
    python3 scripts/mix_entreprises.py       # → public/audio/astrya-entreprises.m4a

D minor, 120 BPM. Opening: a sub drone and a cold shimmer. The problem: a
pulse that accelerates under a dissonant cluster and glitches, a riser to
the freeze, then near silence. The reveal: a reverse swell and the ring's
impact. The product: a light, filtered groove that opens up as the work gets
done. Calm: the groove recedes. Finale: open chords, the logo's impact, air.
"""
import json, os, subprocess
import numpy as np
import soundfile as sf
from audiolib import SR, rng, hz, env, lp, hp, bp, saw_pad, pluck, keys, kick, clap, hat, boom, noise_sweep, reverse_swell, click_s, chime_s, reverb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sheet = json.load(open(os.path.join(ROOT, "scripts", "cues.entreprises.json")))
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


def glitch(d, g, seed=0):
    r = np.random.default_rng(seed)
    n = int(d * SR)
    x = r.standard_normal(n)
    hold = 30 + int(r.integers(0, 80))
    x = np.repeat(x[::hold], hold)[:n]
    gate = (np.floor(np.arange(n) / (SR * 0.018)) % 3 != 1).astype(float)
    return bp(x, 800, 7000) * gate * env(n, 0.002, 0.02) * g * 0.12


PROG = [("D", ["D3", "F3", "A3", "E4"]), ("Bb", ["Bb2", "D3", "F3", "C4"]), ("F", ["F3", "A3", "C4", "G4"]), ("C", ["C3", "E3", "G3", "D4"])]
ROOT_N = {"D": "D2", "Bb": "Bb1", "F": "F2", "C": "C2"}
GRID0 = S["inbox"]
def chord(t):
    k = int(np.floor((t - GRID0) / (4 * BEAT) + 1e-6)) % 4
    return PROG[k]


def groove(t0, t1, full=1.0, clap_on=True, filt=None, hats=True, kick_on=True):
    if kick_on:
        for t in grid(t0, t1, BEAT):
            place(drums, kick(0.8 * full), t)
    if clap_on:
        for t in grid(t0 + BEAT, t1, 2 * BEAT):
            place(drums, clap(0.32 * full), t)
    if hats:
        for i, t in enumerate(grid(t0, t1, BEAT / 2)):
            place(drums, hat(0.09 * full if i % 2 else 0.04 * full, open_=i % 2 == 1), t, pan=0.25)
    for i, t in enumerate(grid(t0, t1, BEAT / 4)):
        nm, ch = chord(t)
        if i % 2 == 0:
            bass(ROOT_N[nm], t, BEAT / 4, 0.12 * full)
        s = pluck(hz(ch[[0, 2, 1, 3][i % 4]]) * 2, 0.25, 1.0)
        place(music, lp(s, filt) if filt else s, t, 0.022 * full, pan=0.5 * np.sin(i * 0.7))
    for t0b in grid(t0, t1, 4 * BEAT):
        nm, ch = chord(t0b)
        pad(ch, t0b, min(t0b + 4 * BEAT, t1), 0.035 * full, bright=3.2, a=0.05, r=0.3)


# ── I. opening: space, the streams ────────────────────────────────────────
sub("D1", 0.0, S["freeze"], 0.1, a=2.5, r=0.05)
pad(["D2", "A2", "D3", "E3"], 0.0, S["cards"] + 0.5, 0.045, bright=1.6, a=2.5, r=1.0)
pad(["A4", "D5", "E5"], S["streams"], S["cards"], 0.018, bright=5, a=1.5, r=1.0)
place(sfx, noise_sweep(3.0, 200, 1200, 0.04, "bell"), 0.0)
for t, n in zip([S["streams"], S["line1"], S["line1"] + 1.0], ["A5", "E6", "D6"]):
    place(music, keys(hz(n), 2.6), t, 0.03, pan=0.3)

# ── II. the problem: everything at once ───────────────────────────────────
pad(["D2", "Eb3", "A3", "D4"], S["cards"], S["freeze"], 0.035, bright=3.5, a=2.0, r=0.05)
tt, step = S["cards"], 0.6
while tt < S["freeze"] - 0.1:
    place(drums, kick(0.32 + 0.35 * (tt - S["cards"]) / (S["freeze"] - S["cards"]), deep=1.35), tt)
    tt += step; step = max(0.22, step * 0.94)
for t in grid(S["words"], S["freeze"], BEAT / 4):
    place(drums, hat(0.04, open_=False), t, pan=-0.3)
r_ = np.random.default_rng(7)
for k in range(22):
    t = S["more"] + (k / 22) ** 0.8 * (S["freeze"] - S["more"] - 0.2)
    place(sfx, glitch(0.05 + r_.random() * 0.1, 0.5 + 0.5 * k / 22, k), t, pan=float(r_.random() * 1.4 - 0.7))
place(sfx, noise_sweep(S["freeze"] - S["words"], 300, 11000, 0.11, "rise"), S["words"])
place(drums, boom(1.0), S["freeze"])

# ── III. the reveal ───────────────────────────────────────────────────────
place(music, keys(hz("A6"), 2.0), S["sweep"] + 0.1, 0.03)
L, R = reverse_swell(1.3, ["D3", "A3", "D4", "F4", "A4"], 0.2)
place(music, L, S["ring"] - 1.3, 1, -0.3); place(music, R, S["ring"] - 1.3, 1, 0.3)
place(drums, boom(1.7), S["ring"])
sub("D1", S["ring"], S["inbox"], 0.12, a=0.6, r=0.3)
pad(["D3", "A3", "D4", "F4", "A4"], S["ring"], S["dive"] + 0.4, 0.05, bright=3.5, a=0.05, r=0.8)
pad(["A4", "D5", "E5", "A5"], S["word"], S["dive"] + 0.4, 0.02, bright=6, a=0.8, r=0.6)
for i, t in enumerate(grid(S["tagline"], S["dive"], BEAT / 2)):
    place(music, pluck(hz(["D5", "A5", "E6", "F5"][i % 4]), 0.5, 1.3), t, 0.018, pan=np.sin(i) * 0.7)
place(sfx, noise_sweep(S["inbox"] - S["dive"] + 0.2, 300, 12000, 0.13, "rise"), S["dive"] - 0.2)
place(drums, boom(1.2), S["inbox"])

# ── IV. the product at work ───────────────────────────────────────────────
groove(S["inbox"], S["focus"], 0.6, clap_on=False, filt=1800)
groove(S["focus"], S["draft"], 0.7, clap_on=False, filt=2600, kick_on=True)
groove(S["draft"], S["auto"], 0.8, filt=3800)
L, R = reverse_swell(0.8, ["D4", "F4", "A4", "D5"], 0.18)
place(music, L, S["auto"] - 0.8, 1, -0.3); place(music, R, S["auto"] - 0.8, 1, 0.3)
place(drums, boom(0.9), S["auto"])
groove(S["auto"], S["calm"], 1.0, filt=6000)
pad(["A4", "D5", "F5", "A5"], S["control"], S["calm"], 0.02, bright=6, a=0.5, r=0.4)

# ── V. calm ───────────────────────────────────────────────────────────────
groove(S["calm"], S["finale"] - 1.0, 0.45, clap_on=False, filt=1500, hats=False)
pad(["Bb1", "Bb2", "F3"], S["calm"], S["finale"], 0.06, bright=2, a=0.6, r=0.4)
pad(["D4", "F4", "A4", "C5"], S["calm"], S["finale"], 0.025, bright=3, a=0.8, r=0.4)
for t, n in zip([S["calm"] + 0.4, S["calm"] + 1.4], ["F5", "A5"]):
    place(music, keys(hz(n), 3.0), t, 0.035, pan=0.2)
L, R = reverse_swell(1.0, ["D4", "A4", "D5", "F5"], 0.2)
place(music, L, S["finale"] - 1.0, 1, -0.3); place(music, R, S["finale"] - 1.0, 1, 0.3)

# ── VI. finale: the signature ─────────────────────────────────────────────
place(drums, boom(1.2), S["finale"])
pad(["D1", "D2", "A2"], S["finale"], DUR - 0.3, 0.08, bright=2, a=0.3, r=2.0)
pad(["F3", "A3", "D4", "E4", "A4"], S["finale"], DUR - 0.3, 0.04, bright=3, a=0.6, r=2.0)
for t, n in zip([S["fword"], S["fword"] + 0.5, S["slogan"], S["slogan"] + 0.6, S["cta"]], ["A5", "D6", "E6", "A6", "D6"]):
    place(music, keys(hz(n), 3.4), t, 0.04, pan=0.2)

# sfx from cues
pent = [hz(n) for n in ["D6", "F6", "A6", "C7", "E6"]]
for k, c in enumerate(sheet["cues"]):
    ty, t0, g = c["type"], c["t"], c.get("gain") or 1.0
    d = max(0.1, min(c.get("dur") or 1.0, 3.5)); pan = float(np.sin(k * 1.7) * 0.4)
    if ty == "tick":
        place(sfx, keytick(g), t0, pan=pan * 0.5)
    elif ty == "click":
        place(sfx, click_s(g * 1.4), t0, pan=0.1)
    elif ty == "hit":
        place(sfx, boom(0.25 * g), t0)
    elif ty == "soft":
        place(sfx, noise_sweep(d, 150, 900, 0.035 * g, "bell"), t0, pan=pan)
    elif ty == "riser":
        place(sfx, noise_sweep(d, 400, 9000, 0.08 * g, "rise"), t0, pan=pan)
    elif ty == "whoosh":
        place(sfx, noise_sweep(d, 300, 5000, 0.12 * g, "bell"), t0, pan=pan)
    elif ty == "sweep":
        place(sfx, noise_sweep(d, 2000, 11000, 0.07 * g, "bell"), t0, pan=pan)
    elif ty == "chime":
        place(sfx, chime_s(g, pent[k % len(pent)]), t0, pan=pan * 0.6)

wet = np.stack([reverb((music + 0.4 * sfx)[0], 0.0, 1.4), reverb((music + 0.4 * sfx)[1], 2.3, 1.4)])
mix = music * 0.9 + wet * 0.5 + drums + sfx * 0.9
mix = np.stack([hp(mix[0], 22), hp(mix[1], 22)])
# a breath of near silence between the freeze and the ring
duck = np.ones(N)
i0, i1 = int((S["freeze"] + 0.35) * SR), int((S["ring"] - 1.3) * SR)
duck[i0:i1] = 0.25
duck[i0 - int(0.3 * SR):i0] = np.linspace(1, 0.25, int(0.3 * SR))
duck[i1:i1 + int(0.4 * SR)] = np.linspace(0.25, 1, int(0.4 * SR))
mix = mix * duck
mix /= np.abs(mix).max()
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
t_all = np.arange(N) / SR
mix *= np.clip((DUR + 0.1 - t_all) / 1.6, 0, 1) * 0.95
mix = mix[:, : int((DUR + 0.05) * SR)]
wav = os.path.join(ROOT, "scripts", ".mix-entreprises.wav")
sf.write(wav, mix.T, SR)
out = os.path.join(ROOT, "public", "audio", "astrya-entreprises.m4a")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=10", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
os.remove(wav)
print("wrote", out, f"{DUR:.1f}s")
