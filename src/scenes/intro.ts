import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, atmos, cam, CX, CY } from "../core/stage";
import { chars, titleIn, titleOut } from "../core/text";
import { converge, implode, mote, sampleText } from "../core/fx";
import { T } from "../timing";
import { BRAND } from "../data";
import "./intro.css";

/**
 * MYSTERY. A single spark drifts through the dark and lands. Dust condenses
 * into LUKA. The camera travels right and a scanline of light writes ZIYAD.
 * The camera pulls back, both names lock up around a crossing of light —
 * then the whole identity collapses into one point: the seed of everything.
 */
export function buildIntro(tl: gsap.core.Timeline) {
  const [A, B] = BRAND.founders;
  const root = html(`<section class="scene" id="s-intro">
    <div class="beam"></div>
    <div class="intro-cam">
      <div class="intro-track">
        <div class="name n-a">
          <div class="name-glow">${A}</div>
          <div class="name-clip"><div class="name-text">${A}</div></div>
          <div class="name-sweep">${A}</div>
          <div class="name-role">Co-founder</div>
        </div>
        <div class="name n-b">
          <div class="name-glow">${B}</div>
          <div class="name-clip"><div class="name-text">${B}</div></div>
          <div class="name-sweep">${B}</div>
          <div class="scanline"></div>
          <div class="name-role">Co-founder</div>
        </div>
      </div>
      <svg class="xmark" viewBox="-60 -60 120 120" aria-hidden="true">
        <line class="x1" x1="-34" y1="-34" x2="34" y2="34"/>
        <line class="x2" x1="34" y1="-34" x2="-34" y2="34"/>
      </svg>
      <div class="x-flare"></div>
      <div class="x-streak"></div>
      <div class="intro-sub">Two founders. One intelligence.</div>
    </div>
    <div class="singularity"></div>
  </section>`);
  camera.appendChild(root);

  const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector(s) as E;
  const introCam = q(".intro-cam");
  const track = q(".intro-track");
  const nA = q(".n-a");
  const nB = q(".n-b");
  const textA = q(".n-a .name-text");
  const textB = q(".n-b .name-text");
  const sub = q(".intro-sub");
  const PAN = 1240;
  const FS = 210; // display size
  const LS_FINAL = 0.16;

  // measure the final lockup before any tween touches the layout
  gsap.set([nA, nB], { letterSpacing: `${LS_FINAL}em`, paddingLeft: `${LS_FINAL}em` });
  const wA = nA.offsetWidth;
  const wB = nB.offsetWidth;
  const cA = chars(textA);
  const cB = chars(textB);
  const lockScale = 0.56;
  const gap = 150;
  const lockA = CX - gap / 2 - (wA * lockScale) / 2;
  const lockB = CX + gap / 2 + (wB * lockScale) / 2;

  gsap.set([nA, nB], { xPercent: -50, yPercent: -50, y: CY });
  gsap.set(nA, { x: CX });
  gsap.set(nB, { x: CX + PAN });
  gsap.set([nA, nB], { filter: "blur(0px)" });
  gsap.set(".intro-sub", { xPercent: -50, x: CX, y: CY + 120 });

  const t0 = T.intro;
  tl.set(root, { autoAlpha: 1 }, t0);

  // ── atmosphere wakes up ────────────────────────────────────────────────
  tl.to(atmos, { stars: 0.6, duration: 4.5, ease: "sine.inOut" }, t0 + 0.2);
  tl.to(atmos, { halo: 0.55, duration: 5, ease: "sine.inOut" }, t0 + 1.2);
  tl.to(atmos, { zoom: 1.06, duration: 7, ease: "sine.inOut" }, t0);

  // ── the spark ──────────────────────────────────────────────────────────
  const spark = (p: number) => {
    const e = 1 - Math.pow(1 - p, 2.4);
    return { x: 1560 - 600 * e + Math.sin(p * 3.2) * 40 * (1 - e), y: 760 - 220 * e - Math.sin(p * Math.PI) * 120 };
  };
  mote(t0 + 0.4, 3.1, spark, (p) => Math.min(1, p * 4) * (1 - Math.max(0, (p - 0.86) / 0.14)));

  // beam of light opens where the spark lands
  tl.fromTo(".beam", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 0.7, duration: 2.6, ease: "cine" }, t0 + 3.0);
  tl.to(".beam", { opacity: 0.25, duration: 3, ease: "sine.inOut" }, t0 + 5.8);

  cue("riser", t0 + 0.6, 3.0, 0.35);
  cue("soft", t0 + 3.4, undefined, 0.6);
  // ── LUKA: dust condenses into letters ──────────────────────────────────
  const ptsA = sampleText(A, `500 ${FS}px "Geist Variable"`, FS * LS_FINAL, CX, CY, 5);
  converge(t0 + 2.4, 2.9, ptsA, 11, 760);
  tl.fromTo(
    cA,
    { opacity: 0, filter: "blur(22px)", scale: 1.5, z: -220, rotationY: (i) => (i - 1.5) * -14 },
    { opacity: 1, filter: "blur(0px)", scale: 1, z: 0, rotationY: 0, duration: 2.3, ease: "cine", stagger: { each: 0.12, from: "center" } },
    t0 + 3.2,
  );
  tl.fromTo(nA, { letterSpacing: "0.62em", paddingLeft: "0.62em" }, { letterSpacing: `${LS_FINAL}em`, paddingLeft: `${LS_FINAL}em`, duration: 3.6, ease: "cine" }, t0 + 2.8);
  tl.fromTo(".n-a .name-glow", { opacity: 0 }, { opacity: 0.55, duration: 1.6, ease: "sine.inOut" }, t0 + 4.6);
  tl.fromTo(".n-a .name-sweep", { backgroundPosition: "160% 0" }, { backgroundPosition: "-60% 0", duration: 1.8, ease: "cineInOut" }, t0 + 5.2);
  tl.fromTo(".n-a .name-role", { opacity: 0, y: 14, letterSpacing: "0.9em" }, { opacity: 1, y: 0, letterSpacing: "0.5em", duration: 1.4, ease: "cine" }, t0 + 5.0);
  tl.to(".n-a .name-role", { scrambleText: { text: "Co-founder", chars: "LUKA×01", speed: 0.6 }, duration: 1.1, ease: "none" }, t0 + 5.0);

  // slow dolly while we contemplate the name
  tl.fromTo(introCam, { scale: 1, rotationY: -2.5 }, { scale: 1.045, rotationY: 1.5, duration: 7.4, ease: "sine.inOut" }, t0);

  // ── camera travels right: ZIYAD is written by a scanline ───────────────
  const pan = t0 + 6.1;
  tl.to(track, { x: -PAN, duration: 2.0, ease: "cineInOut" }, pan);
  tl.to(cam, { x: PAN, duration: 2.0, ease: "cineInOut" }, pan);
  tl.to(nA, { filter: "blur(10px)", opacity: 0.3, duration: 1.6, ease: "sine.inOut" }, pan + 0.2);

  cue("whoosh", pan, 2.0, 0.6);
  const zb = pan + 0.7;
  tl.fromTo(".n-b .name-clip", { clipPath: "inset(100% -5% 0% -5%)" }, { clipPath: "inset(-10% -5% -10% -5%)", duration: 1.5, ease: "cineInOut" }, zb);
  tl.fromTo(".n-b .scanline", { y: 120, opacity: 0, scaleX: 0.4 }, { y: -120, opacity: 1, scaleX: 1, duration: 1.5, ease: "cineInOut" }, zb);
  tl.to(".n-b .scanline", { opacity: 0, scaleX: 1.4, duration: 0.6, ease: "sine.out" }, zb + 1.25);
  tl.fromTo(
    cB,
    { opacity: 0, x: (i) => (i - 2) * 46, skewX: -16, filter: "blur(10px)" },
    { opacity: 1, x: 0, skewX: 0, filter: "blur(0px)", duration: 1.6, ease: "cine", stagger: { each: 0.07, from: "edges" } },
    zb + 0.1,
  );
  tl.fromTo(nB, { letterSpacing: "0.36em", paddingLeft: "0.36em" }, { letterSpacing: `${LS_FINAL}em`, paddingLeft: `${LS_FINAL}em`, duration: 2.4, ease: "cine" }, zb);
  tl.fromTo(".n-b .name-glow", { opacity: 0 }, { opacity: 0.55, duration: 1.4, ease: "sine.inOut" }, zb + 1.0);
  tl.fromTo(".n-b .name-sweep", { backgroundPosition: "-60% 0" }, { backgroundPosition: "160% 0", duration: 1.6, ease: "cineInOut" }, zb + 1.2);
  tl.fromTo(".n-b .name-role", { opacity: 0, y: 14, letterSpacing: "0.9em" }, { opacity: 1, y: 0, letterSpacing: "0.5em", duration: 1.4, ease: "cine" }, zb + 0.9);
  tl.to(".n-b .name-role", { scrambleText: { text: "Co-founder", chars: "ZIYAD×01", speed: 0.6 }, duration: 1.1, ease: "none" }, zb + 0.9);

  cue("sweep", zb, 1.5, 0.5);
  // ── union: camera pulls back, both names lock up ───────────────────────
  const u = t0 + 9.0;
  tl.to(".name-role", { opacity: 0, filter: "blur(8px)", y: -8, duration: 0.6, ease: "exit" }, u - 0.2);
  tl.to(track, { x: 0, duration: 1.9, ease: "cineInOut" }, u);
  tl.to(cam, { x: 0, duration: 1.9, ease: "cineInOut" }, u);
  tl.to(introCam, { scale: 1, rotationY: 0, duration: 1.9, ease: "cineInOut" }, u);
  tl.to(nA, { x: lockA, scale: lockScale, filter: "blur(0px)", opacity: 1, duration: 1.9, ease: "cineInOut" }, u);
  tl.to(nB, { x: lockB, scale: lockScale, duration: 1.9, ease: "cineInOut" }, u);
  tl.to(".beam", { opacity: 0.12, scaleX: 1.6, duration: 2, ease: "sine.inOut" }, u);

  cue("whoosh", u, 1.9, 0.5);
  // the crossing of light
  const x = u + 1.35;
  gsap.set(".xmark, .x-flare, .x-streak", { xPercent: -50, yPercent: -50, x: CX, y: CY });
  tl.fromTo(".xmark .x1", { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.8, ease: "cine" }, x);
  tl.fromTo(".xmark .x2", { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.8, ease: "cine" }, x + 0.12);
  tl.fromTo(".xmark", { rotation: -45, scale: 0.6, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 1.1, ease: "spring" }, x);
  tl.fromTo(".x-flare", { scale: 0, opacity: 0 }, { scale: 1.2, opacity: 1, duration: 0.35, ease: "cine" }, x + 0.2);
  tl.to(".x-flare", { scale: 0.7, opacity: 0.45, duration: 1.4, ease: "sine.out" }, x + 0.55);
  tl.fromTo(".x-streak", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 0.9, duration: 0.5, ease: "cine" }, x + 0.2);
  tl.to(".x-streak", { opacity: 0.3, scaleX: 0.8, duration: 1.6, ease: "sine.out" }, x + 0.7);
  tl.to(".name-glow", { opacity: 0.85, duration: 0.4, ease: "sine.out" }, x + 0.2);
  tl.to(".name-glow", { opacity: 0.45, duration: 1.4, ease: "sine.inOut" }, x + 0.6);
  tl.fromTo(".n-a .name-sweep", { backgroundPosition: "-60% 0" }, { backgroundPosition: "160% 0", duration: 1.4, ease: "cineInOut", immediateRender: false }, x + 0.6);
  tl.fromTo(".n-b .name-sweep", { backgroundPosition: "-60% 0" }, { backgroundPosition: "160% 0", duration: 1.4, ease: "cineInOut", immediateRender: false }, x + 0.85);

  cue("hit", x + 0.2, undefined, 0.55);
  tl.add(titleIn(sub, { stagger: 0.08, dur: 1.3, track: ["0.12em", "0.02em"] }), x + 0.7);

  // ── T1: everything collapses into a singularity ────────────────────────
  const c = T.noise - 1.3;
  tl.add(titleOut(sub, { stagger: 0.03, dur: 0.6 }), c - 0.35);
  tl.to(nA, { x: CX - 40, scaleX: 0.08, scaleY: 0.3, filter: "blur(18px)", opacity: 0, duration: 1.0, ease: "suck" }, c);
  tl.to(nB, { x: CX + 40, scaleX: 0.08, scaleY: 0.3, filter: "blur(18px)", opacity: 0, duration: 1.0, ease: "suck" }, c);
  tl.to(".xmark", { rotation: 135, scale: 0, duration: 0.95, ease: "suck" }, c + 0.05);
  tl.to(".x-streak", { scaleX: 1.6, opacity: 1, duration: 0.35, ease: "sine.out" }, c);
  tl.to(".x-streak", { scaleX: 0, opacity: 0.6, duration: 0.7, ease: "suck" }, c + 0.35);
  tl.to(".x-flare", { scale: 0.12, opacity: 1, duration: 1.0, ease: "suck" }, c);
  tl.to(".beam", { scaleX: 0, opacity: 0, duration: 1.0, ease: "suck" }, c);
  tl.to(atmos, { pull: 0.35, duration: 1.0, ease: "suck" }, c);
  tl.to(atmos, { pull: 0, duration: 1.4, ease: "cine" }, c + 1.2);
  implode(c - 0.1, 1.2, CX, CY, 200, 900, 21);

  cue("riser", c - 0.5, 1.4, 0.6);
  cue("hit", T.noise, undefined, 0.9);
  gsap.set(".singularity", { xPercent: -50, yPercent: -50, x: CX, y: CY });
  tl.fromTo(".singularity", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "cine" }, c + 0.9);
  tl.to(".singularity", { scale: 2.4, duration: 0.25, ease: "sine.out" }, c + 1.2);
  tl.to(".singularity", { scale: 0.6, opacity: 0, duration: 0.35, ease: "cine" }, c + 1.45);
  tl.set(root, { autoAlpha: 0 }, T.noise + 0.4);
}
