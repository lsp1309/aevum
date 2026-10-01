import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, atmos, share, CX, fmt } from "../core/stage";
import { titleIn } from "../core/text";
import { dissolve, orbitDust, burst, shockwave, trail, type Pt } from "../core/fx";
import { icon, ringMark, ringPoint } from "../core/icons";
import { glintRing } from "./brand";
import { BRAND } from "../data";
import { T } from "../timing";
import "./finale.css";

const RING = { y: fmt(410, 760), size: 520 };

/**
 * CONCLUSION. The interface lets go — its layers drift apart and burn off as
 * light. In the dark, two lines race in from the edges and collide; the flash
 * unfolds into the ASTRYA halo, drawn by two comets. The wordmark is revealed
 * by a blade of light, then the promise and the call to action.
 */
export function buildFinale(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-finale">
    <div class="fin-cam">
      <div class="fl fl-l"></div><div class="fl fl-r"></div>
      <div class="fin-flash"></div>
      <div class="fin-ring">${ringMark("fin", -28)}</div>
      <div class="fin-word"><span class="fw-text">${BRAND.name}</span><i class="fw-blade"></i></div>
      <div class="fin-tag">${BRAND.tagline}</div>
      <div class="fin-cta-wrap">
        <i class="cta-pulse"></i><i class="cta-pulse p2"></i>
        <div class="fin-cta"><span class="btn-sheen"></span>${BRAND.cta}<span class="fin-arrow">${icon.arrow}</span></div>
      </div>
    </div>
  </section>`);
  camera.appendChild(root);
  const fade = html(`<div class="fin-black"></div>`);
  overlay.appendChild(fade);

  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const F = T.finale;
  const world = share.morningWorld as HTMLElement;
  const MR = share.morningRect as { x: number; y: number; w: number; h: number };
  gsap.set(q(".btn-sheen"), { xPercent: -130 });

  // ── the day lets go: its layers drift apart in depth and burn off ──────
  const d0 = F - 0.3;
  const layer = (sel: string, v: gsap.TweenVars, at: number) => tl.to(world.querySelectorAll(sel), { ...v, filter: "blur(14px)", opacity: 0, duration: 1.5, ease: "exit" }, at);
  layer(".mo-date", { x: 60, y: -30 }, d0);
  layer(".mo-hello", { y: -80, scale: 1.1 }, d0 + 0.04);
  layer(".mo-sub", { y: -50, scale: 1.05 }, d0 + 0.08);
  layer(".stat.s1", { x: -90, y: -20, scale: 0.94 }, d0 + 0.1);
  layer(".stat.s2", { y: -30, scale: 1.08 }, d0 + 0.14);
  layer(".stat.s3", { x: 90, y: -20, scale: 0.94 }, d0 + 0.12);
  layer(".mo-today", { y: 70, scale: 1.12 }, d0 + 0.18);
  cue("whoosh", d0, 2.0, 0.6);
  dissolve(d0, 2.4, MR, 460, 91);
  tl.to(atmos, { stars: 0.32, halo: 0.18, core: 0, leak: 0, duration: 2.0, ease: "sine.inOut" }, d0);
  tl.set(share.morningRoot as HTMLElement, { autoAlpha: 0 }, d0 + 2.0);

  tl.set(root, { autoAlpha: 1 }, F + 0.5);

  // ── two lines race in from the edges and collide ───────────────────────
  const m0 = F + 0.95;
  gsap.set(".fin-flash", { xPercent: -50, yPercent: -50, x: CX, y: RING.y });
  gsap.set(".fl", { top: RING.y - 1 });
  cue("riser", m0 - 0.3, 1.15, 0.9);
  tl.fromTo(".fl-l", { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.85, ease: "suck" }, m0);
  tl.fromTo(".fl-r", { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.85, ease: "suck" }, m0);
  const hit = m0 + 0.85;
  tl.to(".fl", { opacity: 0, duration: 0.45, ease: "sine.out" }, hit);
  tl.fromTo(".fin-flash", { scale: 0, opacity: 0 }, { scale: 1.4, opacity: 1, duration: 0.22, ease: "sine.out" }, hit - 0.05);
  tl.to(".fin-flash", { scale: 0.7, opacity: 0.5, duration: 1.4, ease: "cine" }, hit + 0.18);
  cue("hit", hit, undefined, 1.0);
  cue("chime", hit + 0.25, undefined, 0.6);
  shockwave(hit, 1.6, CX, RING.y, 1150, 0.4, 2.5);
  burst(hit, 1.5, CX, RING.y, 160, 680, 93, 0.45);

  // ── the flash unfolds into the halo, drawn by two comets ──────────────
  const ring = q(".fin-ring");
  const svg = ring.querySelector("svg")!;
  const main = svg.querySelector(".ring-main")!;
  gsap.set(ring, { xPercent: -50, yPercent: -50, x: CX, y: RING.y });
  const IG = 2.1;
  const easeE = gsap.parseEase("cine");
  const easeD = gsap.parseEase("cineInOut");
  const tilt = (-28 * Math.PI) / 180;
  const k = RING.size / 400;
  const head = (s: number, p: number): Pt => {
    const e = easeE(p);
    const sc = (0.08 + 0.92 * e) * k;
    const rot = ((50 * (1 - e)) * Math.PI) / 180;
    const o = ringPoint(s);
    const x1 = o.x * Math.cos(tilt) - o.y * Math.sin(tilt);
    const y1 = o.x * Math.sin(tilt) + o.y * Math.cos(tilt);
    return { x: CX + sc * (x1 * Math.cos(rot) - y1 * Math.sin(rot)), y: RING.y + sc * (x1 * Math.sin(rot) + y1 * Math.cos(rot)) };
  };
  const ig = { p: 0 };
  tl.set(ring, { opacity: 1 }, hit);
  tl.to(
    ig,
    {
      p: 1,
      duration: IG,
      ease: "none",
      onUpdate: () => {
        const e = easeE(ig.p);
        const d = easeD(ig.p);
        gsap.set(ring, { scale: 0.08 + 0.92 * e, rotation: 50 * (1 - e) });
        gsap.set(main, { drawSVG: `${62 * (1 - d)}% ${62 + 38 * d}%` });
      },
    },
    hit,
  );
  trail(hit, IG, (p) => head(0.62 * (1 - easeD(p)), p), 150, 101);
  trail(hit, IG, (p) => head(0.62 + 0.38 * easeD(p), p), 150, 103);
  tl.fromTo(svg.querySelector(".ring-glow"), { opacity: 0 }, { opacity: 1, duration: 1.1, ease: "sine.out" }, hit + 0.6);
  tl.to(svg.querySelector(".ring-glow"), { opacity: 0.6, duration: 1.6, ease: "sine.inOut" }, hit + 1.8);
  tl.fromTo(svg.querySelector(".ring-echo"), { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 0.4, duration: IG * 1.15, ease: "cineInOut" }, hit + 0.3);
  tl.set(svg.querySelector(".ring-glint"), { opacity: 0 }, hit);
  orbitDust(hit + 0.4, T.end - hit - 0.6, CX, RING.y, 520, 210, 170, 95);
  tl.to(atmos, { stars: 0.55, halo: 0.45, core: 0.85, duration: 1.4, ease: "sine.out" }, hit);
  tl.to(atmos, { core: 0.55, duration: 2.6, ease: "sine.inOut" }, hit + 1.6);
  tl.fromTo(".fin-cam", { scale: 0.99 }, { scale: 1.03, duration: T.end - hit, ease: "sine.inOut" }, hit);

  // ── wordmark revealed by a blade of light ─────────────────────────────
  const w0 = hit + 1.45;
  gsap.set([".fin-word", ".fin-tag", ".fin-cta-wrap"], { xPercent: -50, x: CX });
  tl.fromTo(".fw-text", { clipPath: "inset(-30% 100% -30% 0%)" }, { clipPath: "inset(-30% 0% -30% 0%)", duration: 1.4, ease: "cineInOut" }, w0);
  tl.fromTo(".fw-blade", { left: "0%", opacity: 0 }, { left: "100%", opacity: 1, duration: 1.4, ease: "cineInOut" }, w0);
  tl.to(".fw-blade", { opacity: 0, duration: 0.35, ease: "sine.out" }, w0 + 1.2);
  tl.fromTo(".fin-word", { letterSpacing: "0.95em", paddingLeft: "0.95em", filter: "blur(6px)" }, { letterSpacing: "0.62em", paddingLeft: "0.62em", filter: "blur(0px)", duration: 2.2, ease: "cine" }, w0);
  cue("sweep", w0, 1.4, 0.5);
  tl.add(titleIn(q(".fin-tag"), { stagger: 0.08, dur: 1.3, blur: 12, y: 16, track: ["0.08em", "0em"] }), w0 + 1.0);

  // ── call to action ─────────────────────────────────────────────────────
  const cta = q(".fin-cta");
  const c0 = w0 + 2.0;
  tl.fromTo(cta, { opacity: 0, scale: 0.86, filter: "blur(10px)", y: 16 }, { opacity: 1, scale: 1, filter: "blur(0px)", y: 0, duration: 1.1, ease: "spring" }, c0);
  cue("chime", c0 + 0.1, undefined, 0.5);
  tl.fromTo(cta.querySelector(".btn-sheen"), { xPercent: -130 }, { xPercent: 130, duration: 1.2, ease: "cineInOut", immediateRender: false }, c0 + 0.7);
  tl.fromTo(".fin-arrow", { x: 0 }, { x: 6, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 5 }, c0 + 0.9);
  tl.fromTo(".cta-pulse", { scale: 1, opacity: 0.7 }, { scale: 1.5, opacity: 0, duration: 1.6, ease: "cine", stagger: 0.8, repeat: 0, immediateRender: false }, c0 + 0.8);
  tl.fromTo(
    cta,
    { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 14px 40px -10px rgba(60,110,255,0.7), 0 0 0px rgba(90,140,255,0)" },
    { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 14px 40px -10px rgba(60,110,255,0.85), 0 0 60px rgba(90,140,255,0.65)", duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 1 },
    c0 + 0.9,
  );
  glintRing(tl, svg, c0 + 1.4);

  // fade to black, the halo last
  const e0 = T.end - 1.9;
  tl.to(".fin-word, .fin-tag, .fin-cta-wrap", { opacity: 0, filter: "blur(8px)", duration: 1.1, ease: "sine.in", stagger: 0.06 }, e0);
  tl.to(atmos, { stars: 0, halo: 0, core: 0.15, duration: 1.9, ease: "sine.in" }, e0);
  tl.fromTo(fade, { opacity: 0 }, { opacity: 1, duration: 1.8, ease: "sine.in" }, e0 + 0.1);
}
