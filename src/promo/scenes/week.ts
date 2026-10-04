import { gsap } from "../../core/gsap";
import { onFrame, clamp, smooth, cue } from "../../core/clock";
import { html, world } from "../stage";
import { S, VO } from "../timing";
import { paint, glowPath, flare } from "../light";
import { sky } from "../sky";
import { DAY, hourY, slot, PRICING } from "../layout";

/**
 * ACT III·b — THE WEEK. The day stands up as a tall vertical ruler. Three
 * meetings pile up on the same hour, shaking against each other; the pricing
 * call lands right in the middle of them. Astrya untangles it: each block
 * springs to a free slot, leaving a trail of light, and a protected focus
 * block grows in the morning.
 */
const lock = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;

interface Move {
  el: HTMLElement;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  at: number;
}

export function buildWeek(tl: gsap.core.Timeline) {
  const L = S.land;
  const root = html(`<section class="scene week" id="s-week">
    <div class="wk-rig week">
      <div class="wk-head"><span class="wk-day">Thursday</span><span class="wk-date">OCT 1</span><span class="wk-chip">3 conflicts</span></div>
      ${Array.from({ length: 9 }, (_, i) => `<div class="hr-label" style="top:${hourY(9 + i)}px">${String(9 + i).padStart(2, "0")}:00</div><div class="hr-line" data-h="${9 + i}" style="top:${hourY(9 + i)}px"></div>`).join("")}
    </div>
  </section>`);
  world.appendChild(root);
  const rig = root.querySelector<HTMLElement>(".wk-rig")!;
  const blk = (cls: string, r: { x: number; y: number; w: number; h: number }, title: string, meta: string, c = "#5a6b8f") => {
    const el = html(`<div class="blk ${cls}" style="--c:${c};left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"><b>${title}</b><em>${meta}</em><i class="ring"></i></div>`);
    rig.appendChild(el);
    return el;
  };
  const ops = blk("short", slot(9.5, 10), "Ops sync · Ziyad", "");
  const focus = blk("focus", slot(10, 11.5), `${lock}Focus · Q4 launch plan`, "10:00 – 11:30 · protected");
  focus.insertAdjacentHTML("beforeend", `<i class="sheen"></i>`);
  const clash = (h0: number, h1: number, dx: number) => {
    const r = slot(h0, h1);
    return { x: r.x + dx, y: r.y, w: r.w - dx, h: r.h };
  };
  const moves: Move[] = [];
  const mk = (title: string, meta: string, c: string, from: Move["from"], to: Move["to"], at: number) => {
    const el = blk("clash", from, title, meta, c);
    moves.push({ el, from, to, at });
    return el;
  };
  const m0 = VO.week.start + 0.05;
  const board = mk("Board prep", "60 min · moved to 11:30", "#8fa8ff", clash(13.5, 14.5, 0), slot(11.5, 12.5), m0);
  const kick = mk("Northline kickoff", "60 min · moved to 13:00", "#3b7bff", clash(14, 15, 60), slot(13, 14), m0 + 0.2);
  const hiring = mk("Hiring sync", "45 min · moved to 16:00", "#5ad1ff", clash(14, 14.75, 120), slot(16, 16.75), m0 + 0.4);
  const pricing = html(`<div class="blk hero" style="left:${PRICING.x}px;top:${PRICING.y}px;width:${PRICING.w}px;height:${PRICING.h}px"><b>Pricing call · Luka</b><em class="mono">14:30 – 15:30 · invite sent</em></div>`);
  rig.appendChild(pricing);
  const chip = root.querySelector<HTMLElement>(".wk-chip")!;
  const lines = Array.from(root.querySelectorAll<HTMLElement>(".hr-line"));
  const labels = Array.from(root.querySelectorAll<HTMLElement>(".hr-label"));
  const rings = moves.map((m) => m.el.querySelector<HTMLElement>(".ring")!);
  const head = root.querySelector<HTMLElement>(".wk-head")!;

  gsap.set(pricing, { autoAlpha: 0 });
  gsap.set(focus, { scaleY: 0, transformOrigin: "50% 0%", autoAlpha: 0 });
  gsap.set(rig, { transformOrigin: "540px 1100px" });
  tl.set(root, { visibility: "visible" }, L - 0.6);

  // the camera tilts down onto the day: it rises from below and settles flat
  tl.fromTo(rig, { y: 1350, rotationX: -34, z: -200 }, { y: 0, rotationX: 0, z: 0, duration: 0.62, ease: "power3.out" }, L - 0.56);
  tl.from(lines, { scaleX: 0, duration: 0.7, stagger: 0.03, ease: "power3.out" }, L - 0.4);
  tl.from(labels, { opacity: 0, x: -16, duration: 0.5, stagger: 0.03, ease: "power2.out" }, L - 0.3);
  tl.from(head.children, { opacity: 0, y: 30, filter: "blur(8px)", duration: 0.6, stagger: 0.07, ease: "power3.out" }, L - 0.25);
  tl.from([ops, board, kick, hiring], { opacity: 0, scale: 0.94, duration: 0.5, stagger: 0.05, ease: "power3.out" }, L - 0.2);
  cue("whoosh", L - 0.6, 0.7, 0.7);
  // the pricing call (the phrase that flew in) takes its place
  tl.set(pricing, { autoAlpha: 1 }, L + 0.52);

  // clash: the three blocks vibrate against each other until untangled
  onFrame((t) => {
    if (t < L - 0.3 || t > m0 + 1.2) return;
    moves.forEach((m, i) => {
      const k = 1 - smooth(clamp((t - m.at) / 0.12));
      const a = 2.6 * k * (t > L ? 1 : 0.4);
      m.el.style.translate = `${(a * Math.sin(t * 61 + i * 2)).toFixed(2)}px ${(a * 0.5 * Math.sin(t * 47 + i)).toFixed(2)}px`;
    });
  });

  // untangle: each block springs to a free slot
  moves.forEach((m, i) => {
    tl.to(m.el, { left: m.to.x, top: m.to.y, width: m.to.w, height: m.to.h, duration: 0.78, ease: "back.out(1.15)" }, m.at);
    tl.to(rings[i], { opacity: 0, duration: 0.3 }, m.at + 0.1);
    cue("tick", m.at + 0.05, undefined, 0.9);
    cue("soft", m.at + 0.3, undefined, 0.3);
  });
  paint((g, t) => {
    for (const m of moves) {
      const k = t - m.at;
      if (k < 0 || k > 0.9) continue;
      const p = smooth(clamp(k / 0.45));
      const x0 = m.from.x + 26;
      const y0 = m.from.y + m.from.h / 2;
      const x1 = m.to.x + 26;
      const y1 = m.to.y + m.to.h / 2;
      const path = new Path2D();
      path.moveTo(x0, y0);
      path.bezierCurveTo(x0 - 120, y0, x1 - 120, y1, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p);
      const a = (1 - smooth(clamp((k - 0.35) / 0.5))) * 0.8;
      glowPath(g, path, 3.5, a, "120,175,255");
      flare(g, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, 90, a * 0.8);
    }
  });

  // focus time, protected
  const f0 = VO.week.phrases[1] + 0.05;
  tl.to(focus, { scaleY: 1, autoAlpha: 1, duration: 0.6, ease: "power3.out" }, f0);
  tl.from(focus.children, { opacity: 0, y: 12, duration: 0.45, stagger: 0.06 }, f0 + 0.2);
  tl.fromTo(focus.querySelector(".sheen"), { xPercent: -100 }, { xPercent: 100, duration: 0.9, ease: "power2.inOut" }, f0 + 0.3);
  tl.to(chip, { scrambleText: { text: "Week untangled ✓", chars: "·•", speed: 1 }, color: "#c8f0ff", boxShadow: "inset 0 0 0 1.5px rgba(90,209,255,0.65), 0 0 30px rgba(90,209,255,0.32)", duration: 0.5, ease: "none" }, f0 + 0.25);
  cue("chime", f0, undefined, 0.7);
  cue("chime", f0 + 0.25, undefined, 0.5);

  // a slow drift while the day settles
  tl.to(rig, { rotationX: 9, y: -40, scale: 0.97, duration: 1.4, ease: "sine.inOut" }, L + 0.6);
  tl.to(rig, { rotationX: 0, y: 0, scale: 1, duration: 0.6, ease: "power2.inOut" }, S.lanes - 0.75);

  // exit: blocks and labels dissolve; three hour lines stay and light up
  const keep = [11, 13, 15];
  const all = [ops, focus, board, kick, hiring, pricing];
  tl.to(all, { opacity: 0, scale: 0.94, filter: "blur(8px)", duration: 0.4, stagger: 0.03, ease: "power2.in" }, S.lanes - 0.45);
  tl.to([head, ...labels], { opacity: 0, y: -10, duration: 0.35, ease: "power2.in" }, S.lanes - 0.4);
  tl.to(lines.filter((l) => !keep.includes(Number(l.dataset.h))), { opacity: 0, duration: 0.3 }, S.lanes - 0.35);
  tl.set(root, { visibility: "hidden" }, S.lanes + 0.05);

  // light: violet shadows, ember floor
  tl.to(sky, { top: "4,8,22", bot: "5,11,30", c1: "95,125,255", l1x: 0.15, l1y: 0.2, l1r: 0.5, l1i: 0.24, c2: "40,110,255", l2x: 0.7, l2y: 1.05, l2i: 0.2, duration: 1.0, ease: "power2.inOut" }, L - 0.5);
  void DAY;
}
