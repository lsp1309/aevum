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

let F: number[] = [];
let R: number[] = [];
let M: number[] = []; // dR/dF slopes at anchors (monotone cubic)

export function setAnchors(anchors: Anchor[]) {
  const a = [...anchors].sort((p, q) => p.film - q.film);
  F = a.map((p) => p.film);
  R = a.map((p) => p.raw);
  const n = a.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((R[i + 1] - R[i]) / (F[i + 1] - F[i]));
  // Fritsch–Carlson monotone tangents → no overshoot, no time running backwards
  M = new Array(n);
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
}

/** Film seconds → raw (authored) seconds. */
export function toRaw(f: number) {
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

/** Raw seconds → film seconds (numeric inverse; the map is monotone). */
export function toFilm(r: number) {
  let lo = F[0] - 5;
  let hi = F[F.length - 1] + 5;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (toRaw(mid) < r) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Playback controller in film time. */
export const film = {
  time: 0,
  duration: 0,
  paused: true,
  seek(f: number) {
    this.time = Math.max(0, Math.min(this.duration, f));
    master.seek(Math.max(0, toRaw(this.time)), false);
    renderFrame(true);
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
});
