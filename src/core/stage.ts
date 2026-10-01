/** The film is authored on a fixed 1920×1080 canvas and uniformly scaled to
 *  fit any viewport: no reflow, no layout shift, identical framing everywhere. */
export const W = 1920;
export const H = 1080;
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
