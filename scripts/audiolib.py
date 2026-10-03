"""
Instruments and effects shared by the scores (scripts/mix.py, scripts/mix_short.py):
synthesised pads, plucks, keys, drums, impacts, sweeps and a small reverb.
One seeded generator, so every render of a score is identical.
"""
import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 44100
rng = np.random.default_rng(11)


def hz(note):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


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
