import { gsap, SplitText } from "./gsap";

/**
 * Typographic motion. Titles never just fade: words arrive out of focus,
 * slightly below and tilted, while the line's tracking tightens — the way a
 * lens racks focus onto a subject.
 */

export function words(el: HTMLElement) {
  return SplitText.create(el, { type: "words", wordsClass: "w" }).words as HTMLElement[];
}
export function chars(el: HTMLElement) {
  return SplitText.create(el, { type: "words,chars", wordsClass: "w", charsClass: "c" }).chars as HTMLElement[];
}
export function lines(el: HTMLElement) {
  return SplitText.create(el, { type: "lines", linesClass: "l", mask: "lines" }).lines as HTMLElement[];
}

interface InOpts {
  stagger?: number;
  dur?: number;
  track?: [string, string];
  blur?: number;
  y?: number;
  glow?: boolean;
}

export function titleIn(el: HTMLElement, o: InOpts = {}) {
  const ws = words(el);
  const tl = gsap.timeline();
  const dur = o.dur ?? 1.5;
  tl.fromTo(
    ws,
    { opacity: 0, filter: `blur(${o.blur ?? 16}px)`, y: o.y ?? 26, rotationX: -55, scale: 0.94, transformOrigin: "50% 100% -20px" },
    { opacity: 1, filter: "blur(0px)", y: 0, rotationX: 0, scale: 1, duration: dur, stagger: o.stagger ?? 0.09, ease: "cine" },
    0,
  );
  if (o.track) tl.fromTo(el, { letterSpacing: o.track[0] }, { letterSpacing: o.track[1], duration: dur + ws.length * (o.stagger ?? 0.09), ease: "cine" }, 0);
  if (o.glow !== false)
    tl.fromTo(
      el,
      { textShadow: "0 0 0px rgba(120,160,255,0)" },
      { textShadow: "0 0 26px rgba(120,160,255,0.28)", duration: dur * 0.6, ease: "sine.out" },
      dur * 0.4,
    ).to(el, { textShadow: "0 0 18px rgba(120,160,255,0.12)", duration: 1.6, ease: "sine.inOut" });
  return tl;
}

export function titleOut(el: HTMLElement, o: { stagger?: number; dur?: number; y?: number } = {}) {
  const ws = (el.querySelectorAll(".w").length ? Array.from(el.querySelectorAll(".w")) : [el]) as HTMLElement[];
  return gsap.to(ws, {
    opacity: 0,
    filter: "blur(12px)",
    y: o.y ?? -20,
    scale: 0.98,
    duration: o.dur ?? 0.8,
    stagger: o.stagger ?? 0.04,
    ease: "exit",
  });
}

/** Character reveal with depth: each glyph travels forward out of the dark. */
export function charsIn(el: HTMLElement, o: { stagger?: number; dur?: number; from?: "start" | "center" | "end"; z?: number; blur?: number } = {}) {
  const cs = chars(el);
  return gsap.fromTo(
    cs,
    { opacity: 0, filter: `blur(${o.blur ?? 14}px)`, z: o.z ?? -160, y: 8, rotationY: -18 },
    {
      opacity: 1,
      filter: "blur(0px)",
      z: 0,
      y: 0,
      rotationY: 0,
      duration: o.dur ?? 1.4,
      ease: "cine",
      stagger: { each: o.stagger ?? 0.035, from: o.from ?? "start" },
    },
  );
}

/** Masked line reveal: copy rises out of an invisible slot. */
export function linesIn(el: HTMLElement, o: { stagger?: number; dur?: number } = {}) {
  const ls = lines(el);
  return gsap.fromTo(
    ls,
    { yPercent: 110, opacity: 0, filter: "blur(4px)" },
    { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: o.dur ?? 1.1, stagger: o.stagger ?? 0.08, ease: "cine" },
  );
}

/** Words written by the AI: each lands in focus with the caret riding the line. */
export function writeWords(el: HTMLElement, caret: HTMLElement | null, perWord = 0.06) {
  const ws = words(el);
  const tl = gsap.timeline();
  ws.forEach((w, i) => {
    tl.fromTo(
      w,
      { opacity: 0, filter: "blur(6px)", y: 5 },
      { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.42, ease: "cine" },
      i * perWord,
    );
    if (caret) {
      tl.set(caret, { x: w.offsetLeft + w.offsetWidth + 3, y: w.offsetTop }, i * perWord + 0.02);
    }
  });
  return tl;
}

/** Count-up for numeric UI. Formatter receives the interpolated value. */
export function countTo(el: HTMLElement, to: number, dur: number, fmt: (v: number) => string = (v) => Math.round(v).toLocaleString("en-US"), from = 0) {
  const o = { v: from };
  el.textContent = fmt(from);
  return gsap.to(o, { v: to, duration: dur, ease: "cine", onUpdate: () => (el.textContent = fmt(o.v)) });
}
