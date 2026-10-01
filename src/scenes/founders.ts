import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, atmos, CX, CY } from "../core/stage";
import { chars } from "../core/text";
import { BRAND } from "../data";
import { T } from "../timing";
import "./founders.css";

/**
 * IMPRESSION. We have pushed into the core: the frame is pure light. The
 * founders' names are written in ink, arriving from opposite sides at speed
 * and locking around the crossing. Then the whole field of light folds into a
 * single horizontal line — which becomes the slit the next scene opens through.
 */
export function buildFounders(tl: gsap.core.Timeline) {
  const [A, B] = BRAND.founders;
  const root = html(`<section class="scene" id="s-light">
    <div class="lf-fold">
      <div class="lf-field"><i class="cau c1"></i><i class="cau c2"></i><i class="cau c3"></i></div>
      <div class="lf-group">
        <div class="lf-kicker">Designed &amp; engineered by</div>
        <div class="lf-names">
          <span class="lf-name lf-a">${A}</span>
          <svg class="lf-x" viewBox="-40 -40 80 80"><line x1="-22" y1="-22" x2="22" y2="22"/><line x1="22" y1="-22" x2="-22" y2="22"/></svg>
          <span class="lf-name lf-b">${B}</span>
        </div>
      </div>
    </div>
  </section>`);
  camera.appendChild(root);
  // the line and slit edges live above every scene
  overlay.appendChild(html(`<div class="light-ov"><div class="lf-line"></div><div class="slit slit-top"></div><div class="slit slit-bot"></div></div>`));
  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const L = T.light;
  const cA = chars(q(".lf-a"));
  const cB = chars(q(".lf-b"));

  tl.set(root, { autoAlpha: 1 }, L - 0.7);
  gsap.set(".lf-line, .slit", { y: CY, xPercent: 0 });
  gsap.set(".lf-fold", { transformOrigin: `${CX}px ${CY}px` });

  // the core's flare becomes a field of light
  tl.fromTo(".lf-field", { opacity: 0 }, { opacity: 1, duration: 0.75, ease: "power2.in" }, L - 0.6);
  tl.to("#vignette", { opacity: 0.35, duration: 0.8 }, L - 0.6);
  tl.fromTo(".cau.c1", { x: -260, y: -60 }, { x: 220, y: 40, duration: 6, ease: "sine.inOut" }, L - 0.6);
  tl.fromTo(".cau.c2", { x: 240, y: 70 }, { x: -200, y: -50, duration: 6, ease: "sine.inOut" }, L - 0.6);
  tl.fromTo(".cau.c3", { scale: 0.8, opacity: 0.3 }, { scale: 1.2, opacity: 0.7, duration: 6, ease: "sine.inOut" }, L - 0.6);

  // kicker
  tl.fromTo(".lf-kicker", { opacity: 0, letterSpacing: "0.9em", filter: "blur(8px)" }, { opacity: 1, letterSpacing: "0.42em", filter: "blur(0px)", duration: 1.6, ease: "cine" }, L + 0.1);

  cue("hit", L - 0.15, undefined, 0.9);
  cue("chime", L + 0.1, undefined, 0.5);
  // names arrive at speed from opposite sides, motion-blurred, and lock
  const n0 = L + 0.35;
  tl.fromTo(
    ".lf-a",
    { x: -520, skewX: 22, scaleX: 1.3, filter: "blur(22px)", opacity: 0 },
    { x: 0, skewX: 0, scaleX: 1, filter: "blur(0px)", opacity: 1, duration: 1.5, ease: "cine" },
    n0,
  );
  tl.fromTo(
    ".lf-b",
    { x: 520, skewX: -22, scaleX: 1.3, filter: "blur(22px)", opacity: 0 },
    { x: 0, skewX: 0, scaleX: 1, filter: "blur(0px)", opacity: 1, duration: 1.5, ease: "cine" },
    n0 + 0.08,
  );
  tl.fromTo(cA, { x: (i) => (3 - i) * -18 }, { x: 0, duration: 1.7, ease: "cine", stagger: 0.03 }, n0);
  tl.fromTo(cB, { x: (i) => i * 18 }, { x: 0, duration: 1.7, ease: "cine", stagger: 0.03 }, n0 + 0.08);
  cue("whoosh", n0 - 0.1, 1.3, 0.5);
  cue("soft", n0 + 0.9, undefined, 0.6);
  tl.fromTo(".lf-x line", { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.7, ease: "cine", stagger: 0.1 }, n0 + 0.85);
  tl.fromTo(".lf-x", { rotation: -90, scale: 0.5, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 1.1, ease: "spring" }, n0 + 0.8);
  tl.fromTo(".lf-group", { scale: 0.97 }, { scale: 1.045, duration: 4.2, ease: "sine.inOut" }, L);

  // ── T: the light folds into a line … ───────────────────────────────────
  const f = T.morning - 2.2;
  cue("riser", f - 0.3, 1.1, 0.6);
  tl.to(".lf-fold", { scaleY: 0.004, duration: 0.85, ease: "expo.in" }, f);
  tl.to(".lf-group", { opacity: 0, duration: 0.6, ease: "sine.in" }, f + 0.15);
  tl.fromTo(".lf-line", { opacity: 0, scaleX: 1 }, { opacity: 1, duration: 0.25, ease: "sine.in" }, f + 0.65);
  tl.set(".lf-fold", { autoAlpha: 0 }, f + 0.86);
  tl.to(atmos, { core: 0.25, halo: 0.55, leak: 0.25, duration: 1.2 }, f + 0.6);
  tl.to(".lf-line", { scaleX: 0.75, duration: 0.5, ease: "sine.inOut" }, f + 0.85);

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
