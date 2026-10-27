import { gsap } from "../core/gsap";
import { onFrame, clamp } from "../core/clock";
import { $, html } from "../core/stage";
import { titleIn } from "../core/text";
import VOICE from "../narration.timing.entreprises.json";

/** Shared vocabulary of the « Entreprises » film: visibility windows, guarded
 *  from/to tweens, captions, the flash, the halo's ignition and a cursor. */

export const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const eOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const eInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Element is visible only inside [a, b) of film time — no stray frames. */
export function show(el: HTMLElement, a: number, b: number) {
  onFrame((t) => {
    el.style.visibility = t >= a && t < b ? "visible" : "hidden";
  });
}

const seen = new WeakSet<object>();
/** fromTo whose start state is also set at t=0, so seeking backwards is exact. */
export function ft(tl: gsap.core.Timeline, el: gsap.TweenTarget, from: gsap.TweenVars, to: gsap.TweenVars, at: number) {
  const list = (gsap.utils.toArray(el) as object[]).filter((e) => !seen.has(e));
  list.forEach((e) => seen.add(e));
  if (list.length) tl.set(list, { ...from }, 0);
  return tl.fromTo(el, from, { ...to, immediateRender: false }, at);
}

/** Section root appended to a layer, hidden outside its window. */
export function section(parent: HTMLElement, id: string, markup: string, a: number, b: number) {
  const el = html(`<section class="scene" id="${id}">${markup}</section>`);
  parent.appendChild(el);
  show(el, a, b);
  return el;
}

/** Brief white-blue flash on a cut. */
export function flash(tl: gsap.core.Timeline, at: number, peak = 0.8, rise = 0.06, fall = 0.5) {
  const el = $("#flash");
  tl.set(el, { opacity: 0 }, 0);
  tl.to(el, { opacity: peak, duration: rise, ease: "none" }, at - rise);
  tl.to(el, { opacity: 0, duration: fall, ease: "power2.out" }, at);
}

/** A caption line: words rack into focus, then leave upwards. */
export function caption(tl: gsap.core.Timeline, parent: HTMLElement, cls: string, text: string, a: number, b: number, style = "") {
  const el = html(`<div class="cap ${cls}" style="${style}">${text}</div>`);
  parent.appendChild(el);
  show(el, a, b + 0.05);
  tl.add(titleIn(el, { stagger: 0.07, dur: 1.1, blur: 14, y: 22 }), a);
  const ws = el.querySelectorAll(".w");
  tl.to(ws, { opacity: 0, filter: "blur(12px)", y: -18, duration: 0.55, stagger: 0.03, ease: "exit" }, b - 0.55);
  return el;
}

/** Voice-over lines in film time: start, end and the start of every phrase. */
export const VO = VOICE as Record<string, { start: number; end: number; phrases: number[] }>;

/** Fills `el` with a line that is revealed as it is spoken. Phrases are split
 *  with « | », accent words wrapped in *…* (blue), « <br> » breaks the line.
 *  Every word arrives on its own beat; the line leaves at `out`. */
export function say(tl: gsap.core.Timeline, el: HTMLElement, id: string, text: string, out: number) {
  const v = VO[id];
  const starts = v.phrases;
  const ends = [...starts.slice(1).map((x) => x - 0.12), v.end];
  let acc = false;
  const phrases: HTMLElement[][] = [];
  el.innerHTML = "";
  text.split("|").forEach((part, j) => {
    const ws: HTMLElement[] = [];
    part.trim().split(/\s+/).forEach((tok) => {
      if (tok === "<br>") return void el.appendChild(document.createElement("br"));
      const open = tok.startsWith("*");
      const close = tok.endsWith("*") || tok.replace(/[.,?…!]+$/, "").endsWith("*");
      if (open) acc = true;
      const w = document.createElement("span");
      w.className = acc ? "w acc" : "w";
      w.textContent = tok.replace(/\*/g, "");
      if (close) acc = false;
      if (el.lastChild && el.lastChild.nodeName !== "BR") el.appendChild(document.createTextNode(" "));
      el.appendChild(w);
      ws.push(w);
    });
    phrases[j] = ws;
  });
  phrases.forEach((ws, j) => {
    const a = starts[Math.min(j, starts.length - 1)];
    const span = Math.max(0.2, (ends[Math.min(j, ends.length - 1)] - a) * 0.8);
    ws.forEach((w, k) => {
      ft(tl, w, { opacity: 0, y: 22, filter: "blur(12px)", scale: 0.96 }, { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.5, ease: "cine" }, a - 0.04 + (k / ws.length) * span);
    });
  });
  const all = phrases.flat();
  if (Number.isFinite(out)) tl.to(all, { opacity: 0, y: -18, filter: "blur(12px)", duration: 0.45, stagger: 0.02, ease: "exit" }, out - 0.45);
  return el;
}

/** A caption element driven by a voice line (see `say`). */
export function voCap(tl: gsap.core.Timeline, parent: HTMLElement, cls: string, id: string, text: string, out: number, style = "") {
  const el = html(`<div class="cap ${cls}" style="${style}"></div>`);
  parent.appendChild(el);
  show(el, VO[id].start - 0.1, out + 0.1);
  return say(tl, el, id, text, out);
}

/** Draws the halo: the band unfolds both ways from one point, an echo breathes
 *  out and a glint travels once around it (same gesture as the main film). */
export function igniteRing(tl: gsap.core.Timeline, svg: Element, at: number, dur = 1.6) {
  const main = svg.querySelector(".ring-reveal");
  const echo = svg.querySelector(".ring-echo");
  const glow = svg.querySelector(".ring-glow");
  const glint = svg.querySelector(".ring-glint");
  ft(tl, main, { drawSVG: "62% 62%" }, { drawSVG: "0% 100%", duration: dur, ease: "cineInOut" }, at);
  ft(tl, glow, { opacity: 0 }, { opacity: 0.9, duration: dur * 0.6, ease: "sine.out" }, at + dur * 0.35);
  tl.to(glow, { opacity: 0.5, duration: 1.4, ease: "sine.inOut" }, at + dur * 0.95);
  ft(tl, echo, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 0.35, duration: dur * 1.2, ease: "cineInOut" }, at + 0.25);
  tl.to(echo, { opacity: 0, duration: 1.2, ease: "sine.inOut" }, at + dur * 1.3);
  ft(tl, glint, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 1, duration: dur, ease: "cineInOut" }, at);
  tl.to(glint, { drawSVG: "100% 100%", opacity: 0, duration: 0.9, ease: "cine" }, at + dur * 0.85);
}

/** A short highlight running once around the halo. */
export function glintRing(tl: gsap.core.Timeline, svg: Element, at: number) {
  const glint = svg.querySelector(".ring-glint");
  tl.fromTo(glint, { drawSVG: "0% 0%", opacity: 1 }, { drawSVG: "88% 100%", duration: 1.8, ease: "cineInOut", immediateRender: false }, at);
  tl.to(glint, { opacity: 0, duration: 0.4, ease: "sine.out" }, at + 1.5);
}

/** Pointer used in the product scenes: glides between targets and presses. */
export function makeCursor(parent: HTMLElement) {
  const el = html(`<div class="cursor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8-6.2 1.6L9.6 19z" fill="#fff" stroke="rgba(10,20,50,.6)" stroke-width="1.2" stroke-linejoin="round"/></svg><i></i></div>`);
  parent.appendChild(el);
  const ring = el.querySelector("i") as HTMLElement;
  return {
    el,
    move(tl: gsap.core.Timeline, x: number, y: number, at: number, dur = 0.7) {
      tl.to(el, { x, y, duration: dur, ease: "cineInOut" }, at);
    },
    press(tl: gsap.core.Timeline, at: number) {
      tl.to(el, { scale: 0.86, duration: 0.08, ease: "power2.out" }, at);
      tl.to(el, { scale: 1, duration: 0.25, ease: "cine" }, at + 0.08);
      tl.fromTo(ring, { scale: 0.2, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.5, ease: "cine", immediateRender: false }, at);
    },
  };
}
