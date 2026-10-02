import { gsap } from "./gsap";
/** The film is authored on a fixed canvas — 1920×1080, or 1080×1920 for the
 *  vertical (9:16) cut — and uniformly scaled to fit any viewport: no reflow,
 *  no layout shift, identical framing everywhere. `?format=vertical` selects 9:16. */
export const VERTICAL = new URLSearchParams(location.search).get("format") === "vertical";
export const W = VERTICAL ? 1080 : 1920;
export const H = VERTICAL ? 1920 : 1080;
/** pick a value per format */
export const fmt = <T,>(h: T, v: T): T => (VERTICAL ? v : h);
export const CX = W / 2;
export const CY = H / 2;

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll(sel)) as T[];

export const stage = $("#stage");
export const viewport = $("#viewport");
export const camera = $("#camera");
export const overlay = $("#overlay");

let scale = 1;
export const getScale = () => scale;
const resizeFns: Array<(s: number) => void> = [];
export const onResize = (fn: (s: number) => void) => {
  resizeFns.push(fn);
  fn(scale);
};

document.documentElement.classList.add(VERTICAL ? "fmt-v" : "fmt-h");
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;

export function fit() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  scale = Math.min(vw / W, vh / H);
  stage.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;
  for (const fn of resizeFns) fn(scale);
}

/** Build DOM from a template string. */
export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

/** Layout box of `el` relative to `root`, unaffected by any CSS transform. */
export function box(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
}

/** Shared, tweenable state read by procedural layers (background, grain…). */
export const cam = { x: 0, y: 0 };
export const atmos = {
  stars: 0, // starfield opacity multiplier
  halo: 0, // ambient halos
  core: 0, // central glow (brand / orb moments)
  leak: 0, // diagonal light leak
  zoom: 1, // dolly factor applied to the starfield (depth-weighted)
  warp: 0, // radial streaking of stars (fly-through)
  pull: 0, // stars drawn towards the centre (vortex)
  grain: 0.055,
};

/** Cross-scene handoffs (an element leaving one scene becomes part of the next). */
export const share: Record<string, unknown> = {};

/**
 * Product UI scenes are authored in a 1920×1080 coordinate space. Their root
 * is scaled about the authored centre (960,540) and centred in the frame;
 * in 9:16 each scene also recomposes its own layout (see the `.fmt-v` rules).
 * Scenes that hand elements to each other share the same factor.
 */
export const UI_SCALE = { work: fmt(1.12, 0.9), morning: fmt(1, 0.86) };
/** Place an authored-space root into the frame. */
export function placeUI(root: HTMLElement, s: number) {
  gsap.set(root, { scale: s, transformOrigin: "960px 540px", x: W / 2 - 960, y: H / 2 - 540 });
}
/** Stage point → authored coordinates of a placed root (axis: "x" | "y"). */
export const toLocal = (v: number, axis: "x" | "y", s: number) => (axis === "x" ? 960 + (v - W / 2) / s : 540 + (v - H / 2) / s);
/** Authored coordinates of a placed root → stage point. */
export const toStage = (v: number, axis: "x" | "y", s: number) => (axis === "x" ? W / 2 + (v - 960) * s : H / 2 + (v - 540) * s);
