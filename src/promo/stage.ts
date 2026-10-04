/**
 * The promo is authored on a fixed 1080×1920 (9:16) canvas, uniformly scaled
 * to fit any viewport. Everything is a pure function of the master timeline.
 */
export const W = 1080;
export const H = 1920;
export const CX = W / 2;
export const CY = H / 2;

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];

export const stage = $("#stage");
/** DOM layer under the storm canvas (giant type, far planes). */
export const back = $("#back");
/** Main 3D world (perspective container). */
export const world = $("#world");
/** DOM layer above the light canvas. */
export const front = $("#front");

stage.style.width = `${W}px`;
stage.style.height = `${H}px`;

export function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  stage.style.transform = `translate3d(-50%, -50%, 0) scale(${s})`;
}

/** Build DOM from a template string. */
export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

/** A canvas covering the stage at `k` × stage resolution. */
export function sizeCanvas(c: HTMLCanvasElement, k = 1) {
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
}

/** Wrap every character of an element in a span (keeps words together). */
export function splitChars(el: HTMLElement, cls = "ch") {
  const text = el.textContent ?? "";
  el.textContent = "";
  const out: HTMLElement[] = [];
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) {
      el.appendChild(document.createTextNode(" "));
      continue;
    }
    const w = document.createElement("span");
    w.className = "wd";
    for (const c of word) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = c;
      w.appendChild(s);
      out.push(s);
    }
    el.appendChild(w);
  }
  return out;
}

/** Wrap every word of an element in a span. */
export function splitWords(el: HTMLElement, cls = "wd") {
  const text = el.textContent ?? "";
  el.textContent = "";
  const out: HTMLElement[] = [];
  text.split(/\s+/).forEach((word, i) => {
    if (i) el.appendChild(document.createTextNode(" "));
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = word;
    el.appendChild(s);
    out.push(s);
  });
  return out;
}

/** Layout box of `el` relative to the stage (ignores CSS transforms). */
export function box(el: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== stage) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
}
