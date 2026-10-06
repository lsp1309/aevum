/** The control film's stage: 16:9 or 9:16 (see layout.ts), uniformly scaled to the viewport. */
import { W, H } from "./layout";
export { W, H };

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const stage = $("#stage");
export const world = $("#world");
export const front = $("#front");
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;
world.style.perspectiveOrigin = front.style.perspectiveOrigin = `${W / 2}px ${H / 2}px`;

export function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  stage.style.transform = `translate3d(-50%, -50%, 0) scale(${s})`;
}

export function html<T extends HTMLElement = HTMLElement>(markup: string): T {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

/** Wrap every character in a span (words kept together). */
export function splitChars(el: HTMLElement) {
  const text = el.textContent ?? "";
  el.textContent = "";
  const out: HTMLElement[] = [];
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) {
      const sp = document.createElement("span");
      sp.className = "ch sp";
      sp.textContent = " ";
      el.appendChild(sp);
      out.push(sp);
      continue;
    }
    const w = document.createElement("span");
    w.className = "wd";
    for (const c of word) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      w.appendChild(s);
      out.push(s);
    }
    el.appendChild(w);
  }
  return out;
}
