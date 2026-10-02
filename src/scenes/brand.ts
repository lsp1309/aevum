import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, atmos, CX, CY, fmt } from "../core/stage";
import { chars, titleIn } from "../core/text";
import { burst, shockwave, trail, orbitDust, type Pt } from "../core/fx";
import { ringMark, ringPoint, RING_A, RING_B, RING_TILT } from "../core/icons";
import { BRAND } from "../data";
import { T } from "../timing";
import { TXT } from "../i18n";
import "./brand.css";

export const RING_Y = fmt(452, CY - 110);
const SIZE = 760; // mark box (px): the ring is ~570 px across, as in the original

/** Draws the halo: the band unfolds both ways from one point, a hairline
 *  echo breathes out, and a glint travels once around it. */
export function igniteRing(tl: gsap.core.Timeline, svg: Element, at: number, dur = 1.6) {
  const main = svg.querySelector(".ring-reveal");
  const echo = svg.querySelector(".ring-echo");
  const glow = svg.querySelector(".ring-glow");
  const glint = svg.querySelector(".ring-glint");
  tl.fromTo(main, { drawSVG: "62% 62%" }, { drawSVG: "0% 100%", duration: dur, ease: "cineInOut" }, at);
  tl.fromTo(glow, { opacity: 0 }, { opacity: 0.9, duration: dur * 0.6, ease: "sine.out" }, at + dur * 0.35);
  tl.to(glow, { opacity: 0.5, duration: 1.4, ease: "sine.inOut" }, at + dur * 0.95);
  tl.fromTo(echo, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 0.35, duration: dur * 1.2, ease: "cineInOut" }, at + 0.25);
  tl.to(echo, { opacity: 0, duration: 1.2, ease: "sine.inOut" }, at + dur * 1.3);
  tl.fromTo(glint, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 1, duration: dur, ease: "cineInOut" }, at);
  tl.to(glint, { drawSVG: "100% 100%", opacity: 0, duration: 0.9, ease: "cine" }, at + dur * 0.85);
}

/** A short highlight running once around the ring. */
export function glintRing(tl: gsap.core.Timeline, svg: Element, at: number) {
  const glint = svg.querySelector(".ring-glint");
  tl.fromTo(glint, { drawSVG: "0% 0%", opacity: 1 }, { drawSVG: "88% 100%", duration: 1.8, ease: "cineInOut", immediateRender: false }, at);
  tl.to(glint, { opacity: 0, duration: 0.4, ease: "sine.out" }, at + 1.5);
}

export function buildBrand(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-brand">
    <div class="brand-ring"><div class="ring-tilt"><div class="ring-squash">${ringMark("brand", 0)}</div></div></div>
    <div class="brand-word">${BRAND.name}</div>
    <div class="brand-line">${TXT.brandLine}</div>
  </section>`);
  camera.appendChild(root);
  const ring = root.querySelector(".brand-ring") as HTMLElement;
  const svg = ring.querySelector("svg")!;
  const tilt = ring.querySelector(".ring-tilt") as HTMLElement;
  const squash = ring.querySelector(".ring-squash") as HTMLElement;
  gsap.set(tilt, { rotation: RING_TILT });
  const word = root.querySelector(".brand-word") as HTMLElement;
  const line = root.querySelector(".brand-line") as HTMLElement;
  const cs = chars(word);

  const t0 = T.brand - 0.3;
  gsap.set([ring, word, line], { xPercent: -50, yPercent: -50, x: CX });
  gsap.set(ring, { y: RING_Y });
  gsap.set(word, { y: fmt(703, CY + 150) });
  gsap.set(line, { y: fmt(778, CY + 228) });
  tl.set(root, { autoAlpha: 1 }, t0 - 0.1);

  // ── the point unfolds into a halo ─────────────────────────────────────
  tl.fromTo(ring, { y: CY, scale: 0.15, rotation: 70, filter: "blur(6px)" }, { y: RING_Y, scale: 1, rotation: 0, filter: "blur(0px)", duration: 2.0, ease: "cine" }, t0);
  cue("hit", t0 + 0.08, undefined, 1.0);
  cue("chime", t0 + 0.3, undefined, 0.5);
  igniteRing(tl, svg, t0 + 0.05, 1.7);
  // two comets trace the halo as it unfolds (same curves as the tweens above)
  const eT = gsap.parseEase("cine");
  const eD = gsap.parseEase("cineInOut");
  const tiltR = (RING_TILT * Math.PI) / 180;
  const k = SIZE / 400;
  const head = (sOf: (d: number) => number) => (p: number): Pt => {
    const tau = 0.05 + 1.7 * p;
    const e = eT(Math.min(1, tau / 2.0));
    const d = eD(p);
    const o = ringPoint(sOf(d));
    const sc = (0.15 + 0.85 * e) * k;
    const rot = ((70 * (1 - e)) * Math.PI) / 180;
    const x1 = o.x * Math.cos(tiltR) - o.y * Math.sin(tiltR);
    const y1 = o.x * Math.sin(tiltR) + o.y * Math.cos(tiltR);
    return { x: CX + sc * (x1 * Math.cos(rot) - y1 * Math.sin(rot)), y: CY + (RING_Y - CY) * e + sc * (x1 * Math.sin(rot) + y1 * Math.cos(rot)) };
  };
  trail(t0 + 0.05, 1.7, head((d) => 0.62 * (1 - d)), 140, 111);
  trail(t0 + 0.05, 1.7, head((d) => 0.62 + 0.38 * d), 140, 113);
  orbitDust(t0 + 0.4, T.inbox - t0 - 1.6, CX, RING_Y, 420, 170, 150, 115);
  shockwave(t0 + 0.15, 1.6, CX, CY - 20, 1100, 0.55, 3);
  burst(t0 + 0.1, 1.6, CX, CY - 30, 160, 760, 51, 0.55);
  tl.to(atmos, { core: 1, duration: 0.5, ease: "sine.out" }, t0 + 0.1);
  tl.to(atmos, { core: 0.55, duration: 2.2, ease: "sine.inOut" }, t0 + 0.7);
  tl.to(atmos, { leak: 0.25, halo: 0.6, duration: 2, ease: "sine.inOut" }, t0);

  // ── wordmark: tracking settles like a lens finding focus ──────────────
  const wAt = t0 + 0.9;
  tl.fromTo(
    cs,
    { opacity: 0, filter: "blur(14px)", y: (i) => (i % 2 ? 22 : -22), scaleY: 1.5 },
    { opacity: 1, filter: "blur(0px)", y: 0, scaleY: 1, duration: 1.8, ease: "cine", stagger: { each: 0.075, from: "center" } },
    wAt,
  );
  tl.fromTo(word, { letterSpacing: "1.6em", paddingLeft: "1.6em" }, { letterSpacing: "0.9em", paddingLeft: "0.9em", duration: 2.4, ease: "cine" }, wAt);
  tl.add(titleIn(line, { stagger: 0.06, dur: 1.2, blur: 10, y: 14, glow: false }), wAt + 0.9);
  glintRing(tl, svg, wAt + 1.6);

  cue("sweep", wAt + 1.6, 1.8, 0.35);
  // ── T3: we fly through the halo, into the product ─────────────────────
  const z = T.inbox - 1.5;
  tl.to(word, { y: "+=70", opacity: 0, filter: "blur(14px)", scale: 0.92, duration: 0.8, ease: "exit" }, z - 0.15);
  tl.to(line, { y: "+=60", opacity: 0, filter: "blur(10px)", duration: 0.7, ease: "exit" }, z - 0.2);
  // the halo turns to face us…
  tl.to(tilt, { rotation: 0, duration: 0.9, ease: "cineInOut" }, z);
  tl.to(squash, { scaleY: RING_A / RING_B, duration: 0.9, ease: "cineInOut" }, z);
  tl.to(ring, { y: CY, duration: 0.9, ease: "cineInOut" }, z);
  // …and we pass through it
  tl.to(ring, { scale: 9, duration: 1.15, ease: "expo.in" }, z + 0.55);
  tl.to(ring, { opacity: 0, filter: "blur(10px)", duration: 0.3, ease: "sine.in" }, z + 1.4);
  cue("riser", z + 0.2, 1.4, 0.8);
  cue("whoosh", z + 1.1, 1.2, 0.9);
  cue("soft", z + 1.65, undefined, 0.8);
  tl.to(atmos, { warp: 1, zoom: 1.5, duration: 1.2, ease: "expo.in" }, z + 0.4);
  tl.to(atmos, { warp: 0, duration: 1.0, ease: "cine" }, z + 1.6);
  tl.to(atmos, { zoom: 1.35, duration: 1.6, ease: "cine" }, z + 1.6);
  tl.to(atmos, { core: 0.2, duration: 1.2, ease: "sine.inOut" }, z + 1.2);
  tl.set(root, { autoAlpha: 0 }, z + 1.75);
}
