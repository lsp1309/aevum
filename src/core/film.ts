import { gsap } from "./gsap";
import { master, renderFrame } from "./clock";

/**
 * Film time ↔ authored ("raw") time.
 *
 * Scenes are authored on the raw master timeline. The edit is a monotone,
 * smooth remapping of that timeline through anchor pairs (raw, film): where
 * anchors are close in film time the action accelerates, where they are far
 * apart it slows — continuous speed ramps, never cuts, so motion stays fluid.
 * Narration, captions, cues and the renderer all live in film time.
 */
export interface Anchor {
  raw: number;
  film: number;
}

/** One continuous reel: anchors sorted by film time, monotone cubic between. */
interface Reel {
  F: number[];
  R: number[];
  M: number[]; // dR/dF slopes at anchors (monotone cubic)
}
let reels: Reel[] = [];

function makeReel(anchors: Anchor[]): Reel {
  const a = [...anchors].sort((p, q) => p.film - q.film);
  const F = a.map((p) => p.film);
  const R = a.map((p) => p.raw);
  const n = a.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((R[i + 1] - R[i]) / (F[i + 1] - F[i]));
  // Fritsch–Carlson monotone tangents → no overshoot, no time running backwards
  const M: number[] = new Array(n);
  M[0] = d[0];
  M[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) M[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      M[i] = M[i + 1] = 0;
      continue;
    }
    const al = M[i] / d[i];
    const be = M[i + 1] / d[i];
    const s = al * al + be * be;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      M[i] = tau * al * d[i];
      M[i + 1] = tau * be * d[i];
    }
  }
  return { F, R, M };
}

/** A continuous edit (speed ramps only). */
export function setAnchors(anchors: Anchor[]) {
  reels = [makeReel(anchors)];
}

/**
 * An edit made of several reels joined by hard cuts: each reel is its own
 * anchor list (raw ranges must increase from reel to reel); film time runs
 * on, raw time jumps. Transitions mask the joins (core/transitions.ts).
 */
export function setReels(list: Anchor[][]) {
  reels = list.map(makeReel);
}

function rawIn(r: Reel, f: number) {
  const { F, R, M } = r;
  if (f <= F[0]) return R[0] + (f - F[0]) * M[0];
  const n = F.length;
  if (f >= F[n - 1]) return R[n - 1] + (f - F[n - 1]) * M[n - 1];
  let i = 0;
  while (f > F[i + 1]) i++;
  const h = F[i + 1] - F[i];
  const t = (f - F[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * R[i] + (t3 - 2 * t2 + t) * h * M[i] + (-2 * t3 + 3 * t2) * R[i + 1] + (t3 - t2) * h * M[i + 1];
}

/** Film seconds → raw (authored) seconds. */
export function toRaw(f: number) {
  let k = 0;
  while (k + 1 < reels.length && f >= reels[k + 1].F[0]) k++;
  return rawIn(reels[k], f);
}

/** Raw seconds → film seconds (numeric inverse). NaN for raw time cut out of the edit. */
export function toFilm(r: number) {
  let reel = reels[0];
  if (reels.length > 1) {
    const hit = reels.find((x) => r >= x.R[0] - 1e-6 && r <= x.R[x.R.length - 1] + 1e-6);
    if (!hit) {
      if (r < reels[0].R[0]) reel = reels[0];
      else if (r > reels[reels.length - 1].R[reels[reels.length - 1].R.length - 1]) reel = reels[reels.length - 1];
      else return NaN;
    } else reel = hit;
  }
  const { F } = reel;
  let lo = F[0] - (reels.length > 1 ? 0 : 5);
  let hi = F[F.length - 1] + 5;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (rawIn(reel, mid) < r) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** A tightening of the edit: span [from, to] (film s) plays `cut` s shorter. */
export interface Trim {
  from: number;
  to: number;
  cut: number;
}
/** Pre-trim film time → trimmed film time (piecewise linear). */
export function trimMap(trims: Trim[]) {
  return (f: number) => {
    let out = f;
    for (const s of trims) {
      if (f >= s.to) out -= s.cut;
      else if (f > s.from) out -= ((f - s.from) * s.cut) / (s.to - s.from);
    }
    return out;
  };
}
/**
 * Re-time an edit: sample the original raw↔film curve at its anchors and
 * around every span (guards 0.4 s outside, so the ramps stay local), then move
 * each sample to its trimmed film time. Nothing in the scenes changes — the
 * same animation simply plays faster through the spans.
 */
export function tighten(anchors: Anchor[], trims: Trim[]): Anchor[] {
  setAnchors(anchors);
  const end = anchors[anchors.length - 1].film;
  const M = trimMap(trims);
  const pts = new Map<number, number>();
  for (const a of anchors) pts.set(a.film, a.raw);
  for (const s of trims)
    for (const f of [s.from - 0.4, s.from, s.to, s.to + 0.4]) {
      const g = Math.round(f * 1000) / 1000;
      if (g > 0 && g < end && !pts.has(g)) pts.set(g, toRaw(g));
    }
  return [...pts].sort((p, q) => p[0] - q[0]).map(([f, raw]) => ({ raw, film: M(f) }));
}

/** Playback controller in film time. */
/** Layers that live in film time (cut transitions) rather than on the master timeline. */
const filmFns: Array<(f: number) => void> = [];
export function onFilmFrame(fn: (f: number) => void) {
  filmFns.push(fn);
}

export const film = {
  time: 0,
  duration: 0,
  paused: true,
  seek(f: number) {
    this.time = Math.max(0, Math.min(this.duration, f));
    master.seek(Math.max(0, toRaw(this.time)), false);
    renderFrame(true);
    for (const fn of filmFns) fn(this.time);
  },
  play() {
    if (this.time >= this.duration) this.seek(0);
    this.paused = false;
  },
  pause() {
    this.paused = true;
  },
  progress() {
    return this.duration ? this.time / this.duration : 0;
  },
};

gsap.ticker.add((_t, dt) => {
  if (film.paused) return;
  film.time += dt / 1000;
  if (film.time >= film.duration) {
    film.time = film.duration;
    film.paused = true;
  }
  master.seek(Math.max(0, toRaw(film.time)), false);
  for (const fn of filmFns) fn(film.time);
});
