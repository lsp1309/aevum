import { gsap } from "../core/gsap";
import { overlay, html, W, fmt, VERTICAL } from "../core/stage";
import { toRaw } from "../core/film";
import VO from "../narration.timing.json";
import "./kinetic.css";

/**
 * Kinetic typography — single words that land with the narration (film time).
 * They complement the voice, never transcribe it: one idea at a time, arriving
 * with velocity (stretch + blur) and leaving the same way.
 */
interface Word {
  text: string;
  in: number; // film seconds
  out: number;
  y: number;
  size?: number;
  accent?: boolean;
}

const R = VO.reads.phrases; // [reads, puts what matters first, and understands…]
export const KINETIC: Word[] = [
  { text: "Reads.", in: R[0] + 0.05, out: R[1] - 0.1, y: fmt(92, 330), size: fmt(54, 64) },
  { text: "Prioritizes.", in: R[1] + 0.05, out: R[2] - 0.1, y: fmt(92, 330), size: fmt(54, 64) },
  { text: "Understands.", in: R[2] + 0.1, out: VO.reads.end + 0.1, y: fmt(92, 330), size: fmt(54, 64), accent: true },
  { text: "In your voice.", in: VO.voice.start + 1.1, out: VO.voice.phrases[1] + 0.6, y: fmt(92, 330), size: fmt(54, 64), accent: true },
];

export function buildKinetic(tl: gsap.core.Timeline) {
  for (const w of KINETIC) {
    const el = html(`<div class="kin${w.accent ? " accent" : ""}" style="font-size:${w.size ?? 64}px">${w.text}</div>`);
    overlay.appendChild(el);
    gsap.set(el, { xPercent: -50, yPercent: -50, x: W / 2, y: w.y });
    const a = toRaw(w.in);
    const b = toRaw(w.out);
    const d = (f: number, s: number) => toRaw(f + s) - toRaw(f);
    tl.fromTo(
      el,
      { opacity: 0, y: w.y + 34, scaleY: 1.35, skewX: -6, filter: "blur(16px)", letterSpacing: "0.16em" },
      { opacity: 1, y: w.y, scaleY: 1, skewX: 0, filter: "blur(0px)", letterSpacing: "-0.02em", duration: d(w.in, 0.55), ease: "cine" },
      a,
    );
    tl.to(el, { opacity: 0, y: w.y - 26, scaleY: 1.2, skewX: 8, filter: "blur(12px)", duration: d(w.out - 0.3, 0.3), ease: "exit" }, b - d(w.out - 0.3, 0.3));
  }
}

/**
 * Burned-in captions for the 9:16 cut (most social viewing is sound-off).
 * One chunk per spoken phrase, placed just above the platforms' bottom UI.
 */
export function buildCaptions(tl: gsap.core.Timeline) {
  if (!VERTICAL) return;
  const d = (f: number, s: number) => toRaw(f + s) - toRaw(f);
  for (const line of Object.values(VO) as Array<{ start: number; end: number; phrases: number[]; captions: string[] }>) {
    line.captions.forEach((text, i) => {
      if (!text) return; // already said on screen
      const fin = line.phrases[i];
      const fout = i + 1 < line.captions.length ? line.phrases[i + 1] - 0.04 : line.end + 0.35;
      const el = html(`<div class="cap"><span>${text}</span></div>`);
      overlay.appendChild(el);
      gsap.set(el, { xPercent: -50, x: W / 2, y: 1418 });
      tl.fromTo(el, { opacity: 0, y: 1430, filter: "blur(6px)" }, { opacity: 1, y: 1418, filter: "blur(0px)", duration: d(fin, 0.22), ease: "cine" }, toRaw(fin));
      tl.to(el, { opacity: 0, filter: "blur(4px)", duration: d(fout - 0.15, 0.15), ease: "sine.in" }, toRaw(fout - 0.15));
    });
  }
}
