import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, atmos, CX, fmt } from "../core/stage";
import { titleIn } from "../core/text";
import { orbitDust, shockwave, trail, type Pt } from "../core/fx";
import { icon, ringMark, ringPoint } from "../core/icons";
import { glintRing } from "./brand";
import { BRAND } from "../data";
import { TXT } from "../i18n";
import { T } from "../timing";
import "./finale.css";

const RING = { y: fmt(404, 760), size: 670 };

/**
 * CONCLUSION. As the draft lets go, the ASTRYA halo sweeps in over it and
 * settles — an echo ring breathes out, two glints run once around it. Then the
 * wordmark (revealed by a blade of light), the promise and the call to action.
 */
export function buildFinale(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-finale">
    <div class="fin-cam">
      <div class="fin-flash"></div>
      <div class="fin-echo"></div>
      <div class="fin-ring">${ringMark("fin", -28)}</div>
      <div class="fin-word"><span class="fw-text">${BRAND.name}</span><i class="fw-blade"></i></div>
      <div class="fin-tag">${TXT.tagline}</div>
      <div class="fin-cta-wrap">
        <i class="cta-pulse"></i><i class="cta-pulse p2"></i>
        <div class="fin-cta"><span class="btn-sheen"></span>${TXT.cta}<span class="fin-arrow">${icon.arrow}</span></div>
      </div>
    </div>
  </section>`);
  camera.appendChild(root);
  const fade = html(`<div class="fin-black"></div>`);
  overlay.appendChild(fade);

  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const at = (f: number) => T.finale + (f - 53.6); // film seconds (1:1 here)
  gsap.set(q(".btn-sheen"), { xPercent: -130 });
  tl.set(root, { autoAlpha: 1 }, at(53.35));

  // ── the halo sweeps in and settles ─────────────────────────────────────
  const ring = q(".fin-ring");
  const svg = ring.querySelector("svg")!;
  gsap.set(ring, { xPercent: -50, yPercent: -50, x: CX, y: RING.y });
  gsap.set(".fin-flash", { xPercent: -50, yPercent: -50, x: CX, y: RING.y });
  gsap.set(".fin-echo", { xPercent: -50, yPercent: -50, x: CX, y: RING.y, rotation: -28 });
  const s0 = at(53.45);
  const hit = at(54.5);
  cue("riser", s0 - 0.5, 1.05, 0.7);
  cue("whoosh", s0, 1.0, 0.6);
  tl.fromTo(ring, { opacity: 0, scale: 1.55, rotation: 24, filter: "blur(12px)" }, { opacity: 1, scale: 1, rotation: 0, filter: "blur(0px)", duration: hit - s0, ease: "cine" }, s0);
  tl.fromTo(svg.querySelector(".ring-glow"), { opacity: 0.3 }, { opacity: 1, duration: 0.5, ease: "sine.out" }, hit - 0.2);
  tl.to(svg.querySelector(".ring-glow"), { opacity: 0.6, duration: 1.8, ease: "sine.inOut" }, hit + 0.4);
  tl.set(svg.querySelector(".ring-glint"), { opacity: 0 }, s0);
  tl.fromTo(".fin-flash", { scale: 0.5, opacity: 0 }, { scale: 1.1, opacity: 0.75, duration: 0.25, ease: "sine.out" }, hit - 0.15);
  tl.to(".fin-flash", { scale: 0.75, opacity: 0.35, duration: 1.6, ease: "cine" }, hit + 0.1);
  tl.fromTo(".fin-echo", { scale: 0.92, opacity: 0 }, { scale: 1.0, opacity: 0.55, duration: 0.5, ease: "sine.out" }, hit - 0.1);
  tl.to(".fin-echo", { scale: 1.32, opacity: 0, duration: 1.8, ease: "cine" }, hit + 0.4);
  cue("hit", hit, undefined, 0.9);
  cue("chime", hit + 0.2, undefined, 0.55);
  shockwave(hit, 1.5, CX, RING.y, 900, 0.42, 2);

  // two glints run once around the halo as it settles
  const tilt = (-28 * Math.PI) / 180;
  const kk = RING.size / 400;
  const onRing = (sPath: number): Pt => {
    const o = ringPoint(((sPath % 1) + 1) % 1);
    return { x: CX + kk * (o.x * Math.cos(tilt) - o.y * Math.sin(tilt)), y: RING.y + kk * (o.x * Math.sin(tilt) + o.y * Math.cos(tilt)) };
  };
  const ge = gsap.parseEase("cineInOut");
  trail(hit - 0.1, 1.7, (p) => onRing(0.62 - 0.5 * ge(p)), 120, 101);
  trail(hit - 0.1, 1.7, (p) => onRing(0.12 + 0.5 * ge(p)), 120, 103);
  orbitDust(hit, T.end - hit - 0.3, CX, RING.y, 520, 210, 170, 95);
  tl.to(atmos, { stars: 0.5, halo: 0.42, core: 0.8, leak: 0, duration: 1.2, ease: "sine.out" }, s0);
  tl.to(atmos, { core: 0.55, duration: 2.6, ease: "sine.inOut" }, hit + 1.2);
  tl.fromTo(".fin-cam", { scale: 0.99 }, { scale: 1.03, duration: T.end - hit, ease: "sine.inOut" }, hit);

  // ── wordmark revealed by a blade of light ─────────────────────────────
  const w0 = at(55.0);
  gsap.set([".fin-word", ".fin-tag", ".fin-cta-wrap"], { xPercent: -50, x: CX });
  tl.fromTo(".fw-text", { clipPath: "inset(-30% 100% -30% 0%)" }, { clipPath: "inset(-30% 0% -30% 0%)", duration: 1.4, ease: "cineInOut" }, w0);
  tl.fromTo(".fw-blade", { left: "0%", opacity: 0 }, { left: "100%", opacity: 1, duration: 1.4, ease: "cineInOut" }, w0);
  tl.to(".fw-blade", { opacity: 0, duration: 0.35, ease: "sine.out" }, w0 + 1.2);
  tl.fromTo(".fin-word", { letterSpacing: "0.95em", paddingLeft: "0.95em", filter: "blur(6px)" }, { letterSpacing: "0.62em", paddingLeft: "0.62em", filter: "blur(0px)", duration: 2.2, ease: "cine" }, w0);
  cue("sweep", w0, 1.4, 0.5);
  tl.add(titleIn(q(".fin-tag"), { stagger: 0.08, dur: 1.3, blur: 12, y: 16, track: ["0.08em", "0em"] }), at(56.45));

  // ── call to action ─────────────────────────────────────────────────────
  const cta = q(".fin-cta");
  const c0 = at(58.15);
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
