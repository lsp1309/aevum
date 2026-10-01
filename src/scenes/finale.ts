import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, atmos, share, CX, CY } from "../core/stage";
import { chars, titleIn } from "../core/text";
import { dissolve, orbitDust, burst, shockwave } from "../core/fx";
import { icon, ringMark } from "../core/icons";
import { igniteRing, glintRing } from "./brand";
import { BRAND } from "../data";
import { T } from "../timing";
import "./finale.css";

/**
 * CONCLUSION. The interface lets go — its layers drift apart and burn off
 * as light. In the dark, two lines race in from the edges and cross: the ×.
 * LUKA and ZIYAD unfold from it. The lockup rises into a signature, and the
 * halo that opened the film closes it: ASTRYA.
 */
export function buildFinale(tl: gsap.core.Timeline) {
  const [A, B] = BRAND.founders;
  const root = html(`<section class="scene" id="s-finale">
    <div class="fin-cam">
      <div class="fl fl-l"></div><div class="fl fl-r"></div>
      <div class="fin-flash"></div>
      <div class="fin-lock">
        <div class="fin-name fin-a"><div class="fn-glow">${A}</div><div class="fn-clip"><div class="fn-text">${A}</div></div><div class="fn-sweep">${A}</div></div>
        <svg class="fin-x" viewBox="-50 -50 100 100"><line class="fx1" x1="-30" y1="0" x2="30" y2="0"/><line class="fx2" x1="-30" y1="0" x2="30" y2="0"/></svg>
        <div class="fin-name fin-b"><div class="fn-glow">${B}</div><div class="fn-clip"><div class="fn-text">${B}</div></div><div class="fn-sweep">${B}</div></div>
      </div>
      <div class="fin-ring">${ringMark("fin", -28)}</div>
      <div class="fin-word">${BRAND.name}</div>
      <div class="fin-tag">${BRAND.tagline}</div>
      <div class="fin-cta"><span class="btn-sheen"></span>${BRAND.cta}<span class="fin-arrow">${icon.arrow}</span></div>
    </div>
  </section>`);
  camera.appendChild(root);
  const fade = html(`<div class="fin-black"></div>`);
  overlay.appendChild(fade);

  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const F = T.finale;
  const editor = share.editor as HTMLElement;
  const ED = share.editorRect as { x: number; y: number; w: number; h: number };
  gsap.set(q(".btn-sheen"), { xPercent: -130 });

  // ── the interface lets go ───────────────────────────────────────────────
  const d0 = F - 0.3;
  const layer = (sel: string, v: gsap.TweenVars, at: number) => tl.to(editor.querySelector(sel), { ...v, filter: "blur(12px)", opacity: 0, duration: 1.6, ease: "exit" }, at);
  layer(".ed-bar", { y: -70, scale: 1.04 }, d0);
  layer(".ed-ctx", { x: 140, y: 20, scale: 0.92 }, d0 + 0.05);
  layer(".ed-title", { y: -40, scale: 1.12 }, d0 + 0.12);
  layer(".ed-p1", { y: 10, scale: 1.05 }, d0 + 0.18);
  layer(".ed-p2", { y: 40, scale: 1.16 }, d0 + 0.22);
  tl.to(editor, { scale: 1.05, opacity: 0, filter: "blur(16px)", duration: 1.6, ease: "exit" }, d0 + 0.25);
  cue("whoosh", d0, 2.0, 0.6);
  dissolve(d0, 2.4, ED, 380, 91);
  tl.to(atmos, { stars: 0.32, halo: 0.18, core: 0, leak: 0, duration: 2.2, ease: "sine.inOut" }, d0);
  tl.set(share.morningRoot as HTMLElement, { autoAlpha: 0 }, d0 + 2.0);

  tl.set(root, { autoAlpha: 1 }, F + 0.6);

  // ── two lines race in from the edges and cross ────────────────────────
  const m0 = F + 1.15;
  gsap.set(".fin-flash", { xPercent: -50, yPercent: -50, x: CX, y: CY });
  cue("riser", m0 - 0.3, 1.15, 0.9);
  tl.fromTo(".fl-l", { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.85, ease: "suck" }, m0);
  tl.fromTo(".fl-r", { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.85, ease: "suck" }, m0);
  const hit = m0 + 0.85;
  tl.to(".fl", { opacity: 0, duration: 0.5, ease: "sine.out" }, hit);
  tl.fromTo(".fin-flash", { scale: 0, opacity: 0 }, { scale: 1.3, opacity: 1, duration: 0.25, ease: "sine.out" }, hit - 0.05);
  tl.to(".fin-flash", { scale: 0.55, opacity: 0.4, duration: 1.4, ease: "cine" }, hit + 0.2);
  cue("hit", hit, undefined, 1.0);
  shockwave(hit, 1.5, CX, CY, 1100, 0.32, 2.5);
  burst(hit, 1.4, CX, CY, 120, 600, 93, 0.35);

  // the bars rotate from a line into the ×
  tl.fromTo(".fin-x", { opacity: 0 }, { opacity: 1, duration: 0.2 }, hit - 0.05);
  tl.fromTo(".fx1", { rotation: 0, svgOrigin: "0 0" }, { rotation: 45, duration: 1.1, ease: "spring" }, hit + 0.05);
  tl.fromTo(".fx2", { rotation: 0, svgOrigin: "0 0" }, { rotation: -45, duration: 1.1, ease: "spring" }, hit + 0.05);
  tl.fromTo(".fin-x line", { drawSVG: "0% 100%" }, { drawSVG: "10% 90%", duration: 1.1, ease: "cine" }, hit + 0.05);

  // the names unfold outward from the crossing
  const u0 = hit + 0.3;
  const ca = chars(q(".fin-a .fn-text"));
  const cb = chars(q(".fin-b .fn-text"));
  tl.fromTo(".fin-a .fn-clip", { clipPath: "inset(-20% 0% -20% 100%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: 1.5, ease: "cineInOut" }, u0);
  tl.fromTo(".fin-b .fn-clip", { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: 1.5, ease: "cineInOut" }, u0);
  tl.fromTo(ca, { x: 110, opacity: 0, filter: "blur(12px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.6, ease: "cine", stagger: { each: 0.08, from: "end" } }, u0);
  tl.fromTo(cb, { x: -110, opacity: 0, filter: "blur(12px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.6, ease: "cine", stagger: { each: 0.08, from: "start" } }, u0);
  tl.fromTo(".fin-name", { letterSpacing: "0.42em" }, { letterSpacing: "0.17em", duration: 2.6, ease: "cine" }, u0);
  tl.fromTo(".fn-glow", { opacity: 0 }, { opacity: 0.55, duration: 1.8, ease: "sine.inOut" }, u0 + 0.9);
  tl.fromTo(".fin-a .fn-sweep", { backgroundPosition: "-60% 0" }, { backgroundPosition: "160% 0", duration: 1.6, ease: "cineInOut" }, u0 + 1.8);
  tl.fromTo(".fin-b .fn-sweep", { backgroundPosition: "-60% 0" }, { backgroundPosition: "160% 0", duration: 1.6, ease: "cineInOut" }, u0 + 2.05);
  tl.fromTo(".fin-cam", { scale: 0.985 }, { scale: 1.035, duration: 5.6, ease: "sine.inOut" }, hit);
  orbitDust(hit + 0.2, 6.2, CX, CY, 900, 170, 160, 95);
  tl.to(atmos, { stars: 0.5, halo: 0.4, duration: 3 }, hit);

  // ── the lockup rises into a signature; the halo returns ───────────────
  const r0 = hit + 4.0;
  cue("whoosh", r0, 1.7, 0.45);
  tl.to(".fin-lock", { y: -326, scale: 0.24, duration: 1.7, ease: "cineInOut" }, r0);
  tl.to(".fin-x line", { strokeWidth: 9, duration: 1.7, ease: "cineInOut" }, r0);
  tl.to(".fin-flash", { opacity: 0, duration: 0.8 }, r0);
  tl.to(".fn-glow", { opacity: 0.3, duration: 1.4 }, r0);

  const ring = q(".fin-ring");
  gsap.set(ring, { xPercent: -50, yPercent: -50, x: CX, y: 470 });
  tl.fromTo(ring, { scale: 0.6, rotation: -40, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 2.0, ease: "cine" }, r0 + 0.55);
  cue("hit", r0 + 0.6, undefined, 0.7);
  cue("chime", r0 + 0.8, undefined, 0.6);
  igniteRing(tl, ring.querySelector("svg")!, r0 + 0.55, 1.8);
  tl.to(atmos, { core: 0.75, duration: 1.4, ease: "sine.out" }, r0 + 0.8);
  tl.to(atmos, { core: 0.5, duration: 2.4, ease: "sine.inOut" }, r0 + 2.2);

  const word = q(".fin-word");
  const wc = chars(word);
  gsap.set([word, ".fin-tag", ".fin-cta"], { xPercent: -50, x: CX });
  const w0 = r0 + 1.4;
  tl.fromTo(wc, { opacity: 0, filter: "blur(14px)", y: (i) => (i % 2 ? 20 : -20), scaleY: 1.5 }, { opacity: 1, filter: "blur(0px)", y: 0, scaleY: 1, duration: 1.8, ease: "cine", stagger: { each: 0.07, from: "center" } }, w0);
  tl.fromTo(word, { letterSpacing: "1.3em", paddingLeft: "1.3em" }, { letterSpacing: "0.62em", paddingLeft: "0.62em", duration: 2.4, ease: "cine" }, w0);
  tl.add(titleIn(q(".fin-tag"), { stagger: 0.07, dur: 1.3, blur: 12, y: 14, track: ["0.06em", "0em"], glow: false }), w0 + 0.9);

  const cta = q(".fin-cta");
  const c0 = w0 + 1.8;
  tl.fromTo(cta, { opacity: 0, scale: 0.88, filter: "blur(10px)", y: 14 }, { opacity: 1, scale: 1, filter: "blur(0px)", y: 0, duration: 1.1, ease: "spring" }, c0);
  cue("chime", c0 + 0.1, undefined, 0.4);
  tl.fromTo(cta.querySelector(".btn-sheen"), { xPercent: -130 }, { xPercent: 130, duration: 1.2, ease: "cineInOut", immediateRender: false }, c0 + 0.8);
  tl.fromTo(".fin-arrow", { x: 0 }, { x: 5, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 3 }, c0 + 1.0);
  tl.fromTo(cta, { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 30px -8px rgba(60,110,255,0.6), 0 0 0px rgba(90,140,255,0)" }, { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 30px -8px rgba(60,110,255,0.75), 0 0 46px rgba(90,140,255,0.55)", duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 1 }, c0 + 0.9);
  glintRing(tl, ring.querySelector("svg")!, c0 + 1.6);

  // fade to black, the halo last
  const e0 = T.end - 2.0;
  tl.to(".fin-lock, .fin-x, .fin-word, .fin-tag, .fin-cta", { opacity: 0, filter: "blur(8px)", duration: 1.2, ease: "sine.in", stagger: 0.05 }, e0);
  tl.to(atmos, { stars: 0, halo: 0, core: 0.15, duration: 2, ease: "sine.in" }, e0);
  tl.fromTo(fade, { opacity: 0 }, { opacity: 1, duration: 1.9, ease: "sine.in" }, e0 + 0.1);
}
