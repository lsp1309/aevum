import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, atmos, CX, CY } from "../core/stage";
import { T } from "../timing";
import "./lightfold.css";

/**
 * IMPRESSION → CALM. We have pushed into the core: the frame floods with light.
 * The whole field of light folds into a single horizontal line, which then
 * opens like a slit — the next scene is revealed through it.
 */
export function buildLightFold(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-light">
    <div class="lf-fold">
      <div class="lf-field"><i class="cau c1"></i><i class="cau c2"></i><i class="cau c3"></i></div>
      <div class="lf-flare"></div>
    </div>
  </section>`);
  camera.appendChild(root);
  // the line and slit edges live above every scene
  overlay.appendChild(html(`<div class="light-ov"><div class="lf-line"></div><div class="slit slit-top"></div><div class="slit slit-bot"></div></div>`));
  const L = T.light;

  tl.set(root, { autoAlpha: 1 }, L - 0.7);
  gsap.set(".lf-line, .slit", { y: CY, xPercent: 0 });
  gsap.set(".lf-fold", { transformOrigin: `${CX}px ${CY}px` });
  gsap.set(".lf-flare", { xPercent: -50, yPercent: -50, x: CX, y: CY });

  // the core's flare becomes a field of light
  tl.fromTo(".lf-field", { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "power2.in" }, L - 0.6);
  tl.to("#vignette", { opacity: 0.35, duration: 0.6 }, L - 0.6);
  tl.fromTo(".cau.c1", { x: -260, y: -60 }, { x: 120, y: 20, duration: 2.6, ease: "sine.inOut" }, L - 0.6);
  tl.fromTo(".cau.c2", { x: 240, y: 70 }, { x: -100, y: -30, duration: 2.6, ease: "sine.inOut" }, L - 0.6);
  tl.fromTo(".lf-flare", { scaleX: 0.3, opacity: 0 }, { scaleX: 1.2, opacity: 1, duration: 0.8, ease: "cine" }, L - 0.2);

  // ── the light folds into a line … ──────────────────────────────────────
  const f = T.morning - 1.95;
  cue("riser", f - 0.4, 1.0, 0.6);
  tl.to(".lf-fold", { scaleY: 0.004, duration: 0.8, ease: "expo.in" }, f);
  tl.fromTo(".lf-line", { opacity: 0, scaleX: 1 }, { opacity: 1, duration: 0.2, ease: "sine.in" }, f + 0.6);
  tl.set(".lf-fold", { autoAlpha: 0 }, f + 0.81);
  tl.to(atmos, { core: 0.25, halo: 0.55, leak: 0.25, duration: 1.0 }, f + 0.6);
  tl.to(".lf-line", { scaleX: 0.78, duration: 0.4, ease: "sine.inOut" }, f + 0.8);

  // … which opens like a slit onto the next scene (the scene clips itself)
  const o = T.morning - 1.15;
  cue("whoosh", o, 1.0, 0.7);
  cue("soft", o, undefined, 0.6);
  tl.set(".slit", { opacity: 1 }, o);
  tl.set(".lf-line", { opacity: 0 }, o);
  tl.to(".slit-top", { y: -4, duration: 1.0, ease: "cineInOut" }, o);
  tl.to(".slit-bot", { y: 1084, duration: 1.0, ease: "cineInOut" }, o);
  tl.to(".slit", { opacity: 0, duration: 0.45, ease: "sine.in" }, o + 0.6);
  tl.set(root, { autoAlpha: 0 }, T.morning + 0.2);
}
