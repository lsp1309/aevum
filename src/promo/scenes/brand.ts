import { gsap } from "../../core/gsap";
import { onFrame, clamp, smooth, cue } from "../../core/clock";
import { html, world, front, splitChars, splitWords, CX, $ } from "../stage";
import { S, VO } from "../timing";
import { paint, flare, streak } from "../light";
import { sky } from "../sky";
import { RING_A, RING_B, RING_W, RING_TILT } from "../../core/icons";

/**
 * ACT V·b — THE MARK. A point of light draws the Astrya ring. The name
 * appears under it. Then the camera flies through the ring: its inside is
 * daylight, and it opens until daylight is all there is. On that warm,
 * bright field, the mark, the name, the promise and the call to action.
 */
const ell = (a: number, b: number) => `M${-a} 0a${a} ${b} 0 1 0 ${2 * a} 0a${a} ${b} 0 1 0 ${-2 * a} 0`;
const MID_A = RING_A - RING_W / 2;
const MID_B = (MID_A * RING_B) / RING_A;
const IN_A = RING_A - RING_W;
const IN_B = (IN_A * RING_B) / RING_A;
const BAND = `${ell(RING_A, RING_B)}${ell(IN_A, IN_B)}`;
const U = 3; // svg px per mark unit

let uid = 0;
function mark(cls: string, withDay: boolean, onLight = false) {
  // on daylight the mark carries the deep end of the blue scale
  const stops = onLight ? ["#6cc0ff", "#3b7bff", "#2350e0", "#142f9e"] : ["#e4f1ff", "#7fc4ff", "#3b7bff", "#1d3fc4"];
  const id = `pm${uid++}`;
  return html(`<svg class="mark ${cls}" viewBox="-200 -200 400 400" width="${400 * U}" height="${400 * U}" style="width:${400 * U}px;height:${400 * U}px;margin:${-200 * U}px 0 0 ${-200 * U}px" fill="none">
    <defs>
      <linearGradient id="${id}g" x1="-150" y1="-40" x2="150" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${stops[0]}"/><stop offset="0.3" stop-color="${stops[1]}"/><stop offset="0.66" stop-color="${stops[2]}"/><stop offset="1" stop-color="${stops[3]}"/>
      </linearGradient>
      <mask id="${id}m" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400">
        <path class="rv" d="${ell(MID_A, MID_B)}" stroke="#fff" stroke-width="54" stroke-linecap="round"/>
      </mask>
    </defs>
    <g transform="rotate(${RING_TILT})">
      ${withDay ? `<path class="day" d="${ell(IN_A + 0.5, IN_B + 0.5)}" fill="#f4f8fe" opacity="0"/>` : ""}
      <g mask="url(#${id}m)"><path class="band" d="${BAND}" fill="url(#${id}g)" fill-rule="evenodd"/></g>
      <path class="glint" d="${ell(MID_A, MID_B)}" stroke="#f6faff" stroke-width="4" stroke-linecap="round" opacity="0"/>
    </g>
  </svg>`);
}

export function buildBrand(tl: gsap.core.Timeline) {
  const R0 = S.ring;
  const Y1 = 800; // the mark, in the dark
  const root = html(`<section class="scene" id="s-brand">
    <div class="wordmark wm-a" style="top:1010px;font-size:104px;color:#f2f6fd">ASTRYA</div>
  </section>`);
  world.appendChild(root);
  const m1 = mark("m1", true);
  m1.style.top = `${Y1}px`;
  root.appendChild(m1);
  const rv = m1.querySelector<SVGPathElement>(".rv")!;
  const day = m1.querySelector<SVGPathElement>(".day")!;
  const glint1 = m1.querySelector<SVGPathElement>(".glint")!;
  const wmA = root.querySelector<HTMLElement>(".wm-a")!;
  const wmChars = splitChars(wmA);

  // the comet that draws the mark follows the reveal path exactly
  const len = rv.getTotalLength();
  const pts = Array.from({ length: 241 }, (_, i) => rv.getPointAtLength((len * i) / 240));
  const th = (RING_TILT * Math.PI) / 180;
  const D = { p: 0, s: 0.5 };
  const toScreen = (q: { x: number; y: number }) => ({
    x: CX + (q.x * Math.cos(th) - q.y * Math.sin(th)) * U * D.s,
    y: Y1 + (q.x * Math.sin(th) + q.y * Math.cos(th)) * U * D.s,
  });

  gsap.set(m1, { scale: D.s, transformOrigin: "50% 50%" });
  tl.set(root, { visibility: "visible" }, R0 - 0.1);
  tl.fromTo(rv, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.72, ease: "power2.inOut" }, R0);
  tl.to(D, { p: 1, duration: 0.72, ease: "power2.inOut" }, R0);
  tl.fromTo(glint1, { drawSVG: "0% 8%", opacity: 0 }, { drawSVG: "92% 100%", opacity: 0.9, duration: 0.6, ease: "power2.inOut" }, R0 + 0.72);
  tl.to(glint1, { opacity: 0, duration: 0.2 }, R0 + 1.25);
  cue("riser", R0 - 0.2, 0.9, 0.6);
  cue("chime", R0 + 0.72, undefined, 1.0);
  paint((g, t) => {
    if (t < R0 - 0.05 || t > R0 + 1.0) return;
    const i = Math.round(D.p * 240);
    const q = toScreen(pts[i]);
    const a = smooth(clamp((t - R0 + 0.05) / 0.15)) * (1 - smooth(clamp((t - (R0 + 0.72)) / 0.25)));
    flare(g, q.x, q.y, 170, a);
    // a short tail behind the head
    for (let k = 1; k < 10; k++) {
      const j = Math.max(0, i - k * 3);
      const qq = toScreen(pts[j]);
      flare(g, qq.x, qq.y, 70, a * (1 - k / 10) * 0.5);
    }
  });

  // the name, under the mark — on "Astrya"
  tl.fromTo(wmChars, { opacity: 0, y: 30, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.04, ease: "power3.out" }, VO.brand.start - 0.05);
  tl.fromTo(wmA, { letterSpacing: "0.5em" }, { letterSpacing: "0.22em", duration: 0.9, ease: "power3.out" }, VO.brand.start - 0.05);

  // through the ring, into daylight
  const F = S.flood;
  tl.to(day, { opacity: 1, duration: 0.2, ease: "power2.out" }, F - 0.05);
  tl.to(D, { s: 13, duration: 0.55, ease: "power3.in" }, F);
  tl.to(wmA, { scale: 1.8, y: 260, opacity: 0, filter: "blur(16px)", duration: 0.4, ease: "power3.in" }, F);
  tl.to(sky, { flood: 1, duration: 0.25 }, F + 0.25);
  tl.to(m1, { opacity: 0, duration: 0.35, ease: "power1.inOut" }, F + 0.55);
  tl.set(root, { visibility: "hidden" }, F + 0.95);
  onFrame((t) => {
    if (t < R0 - 0.2 || t > F + 1) return;
    m1.style.transform = `scale(${D.s.toFixed(4)})`;
  });
  cue("whoosh", F - 0.25, 0.7, 1.0);
  cue("hit", F + 0.5, undefined, 1.0);
  paint((g, t) => {
    const k = t - (F + 0.45);
    if (k < -0.2 || k > 1) return;
    streak(g, CX, Y1, 1600, 50, 0.5 * Math.exp(-Math.max(0, k) * 4) * smooth(clamp((k + 0.2) / 0.2)), "110,165,255");
  });

  // ── the end card ─────────────────────────────────────────────────────────
  const Y2 = 700;
  const end = html(`<section class="scene" id="s-end">
    <div class="end-rig" style="position:absolute;inset:0;transform-origin:540px 960px">
      <div class="end-glow" style="top:${Y2 - 110}px"></div>
      <div class="wordmark wm-b wm-sheen" style="top:930px;font-size:118px">ASTRYA</div>
      <div class="end-tag" style="top:1092px">Intelligence that works with you.</div>
      <div class="end-cta" style="top:1300px">Discover Astrya<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
    </div>
  </section>`);
  front.appendChild(end);
  const rig = end.querySelector<HTMLElement>(".end-rig")!;
  const m2 = mark("m2", false, true);
  m2.style.top = `${Y2}px`;
  rig.insertBefore(m2, rig.children[1]);
  const glow = end.querySelector<HTMLElement>(".end-glow")!;
  const wmB = end.querySelector<HTMLElement>(".wm-b")!;
  const tag = end.querySelector<HTMLElement>(".end-tag")!;
  const cta = end.querySelector<HTMLElement>(".end-cta")!;
  const tagWords = splitWords(tag);
  const wmBChars = splitChars(wmB);
  wmBChars.forEach((c) => c.classList.add("wm-sheen"));
  wmB.classList.remove("wm-sheen");
  gsap.set(m2.querySelector(".rv"), { drawSVG: "0% 100%" });
  gsap.set(cta, { xPercent: -50 });

  const E = F + 0.45;
  tl.set(end, { visibility: "visible" }, E - 0.05);
  tl.fromTo(rig, { scale: 1.06 }, { scale: 1, duration: S.end - E, ease: "power2.out" }, E);
  tl.fromTo(m2, { scale: 0.62, rotation: 24, opacity: 0, filter: "blur(14px)" }, { scale: 0.52, rotation: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "power3.out" }, E);
  tl.fromTo(glow, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }, E + 0.1);
  tl.fromTo(wmBChars, { opacity: 0, y: 40, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, stagger: 0.045, ease: "power3.out" }, E + 0.12);
  tl.fromTo(wmB, { letterSpacing: "0.42em" }, { letterSpacing: "0.22em", duration: 1.1, ease: "power3.out" }, E + 0.12);
  tl.fromTo(tagWords, { opacity: 0, y: 24, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.07, ease: "power3.out" }, VO.brand.phrases[1] - 0.05);
  tl.fromTo(cta, { opacity: 0, y: 30, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.25)" }, VO.brand.phrases[1] + 0.75);
  tl.fromTo(wmBChars, { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 1.1, stagger: 0.04, ease: "power2.inOut" }, S.end - 1.35);
  tl.to($("#vig"), { opacity: 0.25, duration: 0.6 }, F + 0.3);
  tl.to($("#grain"), { opacity: 0.05, duration: 0.6 }, F + 0.3);
  cue("soft", VO.brand.phrases[1], undefined, 0.6);
  cue("click", VO.brand.phrases[1] + 0.8, undefined, 0.8);
}
