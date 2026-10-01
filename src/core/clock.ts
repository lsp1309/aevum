import { gsap } from "./gsap";

/**
 * One master timeline drives the entire film. Procedural layers (particles,
 * orb shader, orbits, grain) never read wall-clock time: they read
 * `master.time()` through `onFrame`, so any frame can be reproduced exactly
 * by seeking — which is what the MP4 renderer relies on.
 */
export const master = gsap.timeline({ paused: true });

type FrameFn = (t: number) => void;
const frameFns: FrameFn[] = [];

export function onFrame(fn: FrameFn) {
  frameFns.push(fn);
}

let lastT = -1;
let dirty = true;

export function invalidate() {
  dirty = true;
}

export function renderFrame(force = false) {
  const t = master.time();
  if (!force && !dirty && t === lastT) return;
  lastT = t;
  dirty = false;
  for (const fn of frameFns) fn(t);
}

/** Deterministic PRNG so particles look identical on every run / render. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** Progress of `t` inside [start, start+dur], clamped 0..1. */
export const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur);

/**
 * Sound cues. Scenes register what happens and when; the score generator
 * (scripts/score.py) reads them so audio hits land on the exact frame.
 */
export type CueType = "hit" | "soft" | "riser" | "whoosh" | "click" | "tick" | "chime" | "sweep";
export const cues: Array<{ t: number; type: CueType; dur?: number; gain?: number }> = [];
export function cue(type: CueType, t: number, dur?: number, gain?: number) {
  cues.push({ t: Math.round(t * 1000) / 1000, type, dur, gain });
}
