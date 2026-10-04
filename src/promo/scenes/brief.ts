import { gsap } from "../../core/gsap";
import { cue } from "../../core/clock";
import { html, world, splitChars } from "../stage";
import { S, VO } from "../timing";
import { sky } from "../sky";

/**
 * ACT V·a — THE MORNING. Out of the bloom, dawn: the noise is gone. A quiet
 * brief — good morning, two things need you, everything else is handled —
 * and the hours that are now protected for the work only you can do.
 */
const lock = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;

export function buildBrief(tl: gsap.core.Timeline) {
  const B = S.bloom;
  const root = html(`<section class="scene" id="s-brief">
    <div class="br-rig">
      <h1 class="br-hello" style="margin:0"><span class="ln ln1">Good morning,</span><span class="ln ln2">Ziyad.</span></h1>
      <div class="br-sub"><b>TWO THINGS</b> NEED YOU TODAY.<br/>EVERYTHING ELSE IS HANDLED.</div>
      <div class="blk focus br-card" style="top:1090px"><b>${lock}Focus · Q4 launch plan</b><em>10:00 – 11:30 · protected</em><i class="sheen"></i></div>
      <div class="blk hero br-card" style="top:1266px"><b>Pricing call · Luka</b><em class="mono">14:30 – 15:30 · renewal ready</em></div>
      <div class="br-chips"><span><i></i>Inbox · 2 of 312</span><span><i></i>3 agents · done</span><span><i></i>Week · clear</span></div>
    </div>
  </section>`);
  world.appendChild(root);
  const rig = root.querySelector<HTMLElement>(".br-rig")!;
  const c1 = splitChars(root.querySelector<HTMLElement>(".ln1")!);
  const c2 = splitChars(root.querySelector<HTMLElement>(".ln2")!);
  const sub = root.querySelector<HTMLElement>(".br-sub")!;
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".br-card"));
  const chips = Array.from(root.querySelectorAll<HTMLElement>(".br-chips span"));
  const focus = cards[0];

  tl.set(root, { visibility: "visible" }, B);
  // the camera keeps drifting in, layers at different depths (parallax)
  tl.fromTo(rig, { scale: 1.12, y: 40 }, { scale: 1.0, y: -20, duration: S.ring - B + 0.2, ease: "power2.out" }, B);
  gsap.set(cards, { z: 60 });
  gsap.set(chips, { z: 110 });
  tl.fromTo([c1, c2].flat(), { yPercent: 110, rotation: 6, filter: "blur(10px)" }, { yPercent: 0, rotation: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.028, ease: "power4.out" }, B + 0.12);
  tl.fromTo(sub, { opacity: 0, y: 20, filter: "blur(8px)", letterSpacing: "0.32em" }, { opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0.18em", duration: 0.9, ease: "power3.out" }, B + 0.55);
  tl.fromTo(cards, { opacity: 0, y: 120, rotationX: -40 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" }, B + 0.75);
  tl.fromTo(chips, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.25)" }, B + 1.05);
  cue("soft", B + 0.15, undefined, 0.6);
  cue("whoosh", B + 0.75, 0.8, 0.4);
  chips.forEach((_, i) => cue("tick", B + 1.05 + i * 0.07, undefined, 0.5));
  // "…focus on what only you can do": the protected hours glow
  const ft = VO.free.start + 0.55;
  tl.fromTo(focus.querySelector(".sheen"), { xPercent: -100 }, { xPercent: 100, duration: 1.0, ease: "power2.inOut" }, ft);
  tl.to(focus, { scale: 1.035, boxShadow: "inset 0 1px 0 rgba(225,238,255,0.32), inset 0 0 0 2px rgba(160,200,255,0.9), 0 0 90px -6px rgba(70,140,255,0.7)", duration: 0.5, ease: "power2.out" }, ft);
  tl.to(focus, { scale: 1, duration: 0.8, ease: "power2.inOut" }, ft + 0.6);
  cue("chime", ft, undefined, 0.6);

  // exhale: everything rises and dissolves; only light is left
  const X = S.ring - 0.45;
  tl.to([...c1, ...c2], { yPercent: -60, opacity: 0, filter: "blur(10px)", duration: 0.5, stagger: 0.01, ease: "power2.in" }, X);
  tl.to([sub, ...cards, ...chips], { y: -80, opacity: 0, filter: "blur(10px)", duration: 0.5, stagger: 0.03, ease: "power2.in" }, X + 0.05);
  tl.set(root, { visibility: "hidden" }, S.ring + 0.2);
  cue("whoosh", X, 0.7, 0.4);

  // dawn: plum sky, an ember horizon
  tl.set(sky, { top: "3,7,20", bot: "8,20,56", c1: "130,175,255", l1x: 0.5, l1y: 0.32, l1r: 0.5, l1i: 0.5, c2: "40,105,255", l2x: 0.5, l2y: 1.0, l2r: 0.55, l2i: 0.5, horizon: 0.8, hz: "45,110,255", fog: 0.7 }, B);
  tl.to(sky, { l1i: 0.16, l2i: 0.32, duration: 1.4, ease: "power2.out" }, B + 0.05);
  tl.to(sky, { horizon: 0.5, top: "2,5,16", duration: 1.4 }, S.ring - 0.6);
}
