import { gsap } from "../../core/gsap";
import { onFrame, clamp, smooth, lerp, cue } from "../../core/clock";
import { html, world, CX, CY, W, H, splitWords, $ } from "../stage";
import { S, VO, beat } from "../timing";
import { paint, rgba, flare, streak } from "../light";
import { sky } from "../sky";

/**
 * ACT IV — AS ONE. The lines have become a beam. Every part of Astrya spirals
 * out of it — mail, replies, calendar, finance, logistics, docs, tasks — and
 * orbits it as a helix the camera rises along. On "working as one" a ribbon
 * of light threads them all together, and pulses run from every module into
 * the beam. Then everything is drawn into the light and collapses to a point.
 */
const I = {
  mail: `<path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/>`,
  reply: `<path d="M10 7 5 12l5 5"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>`,
  cal: `<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>`,
  coin: `<circle cx="12" cy="12" r="7.5"/><path d="M14.5 9.5c-.6-.8-1.5-1.2-2.6-1.2-1.6 0-2.6.8-2.6 1.9 0 2.6 5.4 1.3 5.4 3.9 0 1.1-1.1 1.9-2.7 1.9-1.2 0-2.2-.5-2.8-1.3M12 6.8v1.5M12 15.7v1.5"/>`,
  truck: `<path d="M3.5 7h10v9h-10zM13.5 10h4l3 3v3h-7z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>`,
  doc: `<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>`,
  tasks: `<path d="m4.5 7 1.8 1.8L9.5 5.5M4.5 13l1.8 1.8 3.2-3.3M12.5 7.5h7M12.5 13.5h7M12.5 19h7"/>`,
};
const MODS = [
  { k: "mail", c: "255,208,138", t: "Mail", s: "312 → 2 need you" },
  { k: "reply", c: "255,111,152", t: "Replies", s: "drafted in your voice" },
  { k: "cal", c: "185,162,255", t: "Calendar", s: "3 conflicts resolved" },
  { k: "coin", c: "255,208,138", t: "Finance", s: "INV-4821 reconciled" },
  { k: "truck", c: "255,140,90", t: "Logistics", s: "AT-8891 · via Basel" },
  { k: "doc", c: "255,111,152", t: "Docs", s: "Q4 brief · ready" },
  { k: "tasks", c: "244,238,230", t: "Tasks", s: "4 due Friday · on track" },
] as const;

const PERSP = 1500;
const project = (x: number, y: number, z: number) => {
  const k = PERSP / (PERSP - z);
  return { x: CX + (x - CX) * k, y: CY + (y - CY) * k, k };
};

export function buildSystem(tl: gsap.core.Timeline) {
  const P0 = S.pillar;
  const root = html(`<section class="scene" id="s-system">
    <div class="sys-rig" style="position:absolute;inset:0;transform-style:preserve-3d">
      <div class="pillar"></div>
      ${MODS.map((m) => `<div class="mod" style="--c:${m.c}"><span class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${I[m.k]}</svg></span><div><b>${m.t}</b><span>${m.s}</span></div></div>`).join("")}
      <div class="sys-line sys-a">Every tool, every thread,</div>
      <div class="sys-line sys-b">as one.</div>
    </div>
  </section>`);
  world.appendChild(root);
  const pillar = root.querySelector<HTMLElement>(".pillar")!;
  const mods = Array.from(root.querySelectorAll<HTMLElement>(".mod"));
  const lineA = root.querySelector<HTMLElement>(".sys-a")!;
  const lineB = root.querySelector<HTMLElement>(".sys-b")!;
  const wordsA = splitWords(lineA);

  const st = { R: 0, grow: 0, spin: 0, rise: 0, tilt: 0.16, pull: 0, ribbon: 0, pulse: 0 };
  const N = MODS.length;
  const SP = 196; // vertical pitch of the helix
  const TURN = (Math.PI * 2) / 3.1;
  const MW = 440;
  const MH = 128;

  /** helix point at parameter s ∈ [0, N-1] (module i at s = i), in 3D stage coords */
  const helix = (s: number) => {
    const a = s * TURN + st.spin;
    const R = st.R * (1 - st.pull);
    const y0 = 900 - ((N - 1) * SP) / 2 + s * SP + st.rise;
    // tilt the whole helix about the beam's centre (the camera looks slightly down)
    const x = CX + R * Math.sin(a);
    const z = R * Math.cos(a);
    const yy = CY + (y0 - CY) * Math.cos(st.tilt) * (1 - 0.92 * st.pull) - z * Math.sin(st.tilt);
    const zz = (y0 - CY) * Math.sin(st.tilt) + z * Math.cos(st.tilt);
    return { x, y: yy, z: zz, front: Math.cos(a) };
  };

  tl.set(root, { visibility: "visible" }, P0 - 0.05);
  // the beam
  tl.fromTo(pillar, { scaleX: 0.15, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.35, ease: "power3.out" }, P0 - 0.05);
  tl.fromTo(sky, { beam: 0 }, { beam: 1.0, duration: 0.3, ease: "power2.out" }, P0 - 0.05);
  tl.to(sky, { beam: 0.55, duration: 1.2, ease: "power2.out" }, P0 + 0.3);
  cue("hit", P0, undefined, 1.0);
  // modules spiral out of it
  tl.to(st, { R: 360, duration: 1.1, ease: "expo.out" }, P0 + 0.08);
  tl.to(st, { grow: 1, duration: 0.8, ease: "power3.out" }, P0 + 0.08);
  tl.fromTo(st, { spin: -2.2 }, { spin: 0.2, duration: 1.3, ease: "expo.out", immediateRender: false }, P0 + 0.05);
  tl.to(st, { spin: 2.3, duration: S.implode - P0 - 1.35, ease: "none" }, P0 + 1.35);
  tl.fromTo(st, { rise: 130 }, { rise: -120, duration: S.bloom - P0, ease: "sine.inOut", immediateRender: false }, P0);
  tl.fromTo(st, { tilt: 0.3 }, { tilt: 0.12, duration: S.bloom - P0, ease: "sine.inOut", immediateRender: false }, P0);
  cue("whoosh", P0 + 0.1, 1.2, 0.9);

  onFrame((t) => {
    if (t < P0 - 0.1 || t > S.bloom + 0.1) return;
    mods.forEach((el, i) => {
      const h = helix(i);
      const g = clamp(st.grow * 1.6 - i * 0.09);
      const depth = (h.front + 1) / 2; // 0 back … 1 front
      const sc = (0.2 + 0.8 * smooth(g)) * (1 - 0.85 * st.pull);
      el.style.transform = `translate3d(${(h.x - MW / 2).toFixed(2)}px, ${(h.y - MH / 2).toFixed(2)}px, ${h.z.toFixed(2)}px) scale(${sc.toFixed(4)})`;
      el.style.opacity = (smooth(g) * (0.45 + 0.55 * depth) * (1 - st.pull * st.pull)).toFixed(3);
      const blur = 4 * (1 - depth) + 6 * st.pull;
      el.style.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : "";
    });
  });

  // typography that travels with the camera
  tl.fromTo(wordsA, { opacity: 0, y: 40, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.22, ease: "power3.out" }, VO.one.start - 0.05);
  tl.fromTo(lineB, { clipPath: "inset(0% 100% 0% 0%)", letterSpacing: "0.12em", opacity: 1 }, { clipPath: "inset(0% 0% 0% 0%)", letterSpacing: "-0.01em", duration: 0.9, ease: "power3.out" }, S.one - 0.05);
  gsap.set(lineB, { clipPath: "inset(0% 100% 0% 0%)" });
  tl.fromTo([lineA, lineB], { y: 0 }, { y: -40, duration: S.implode - VO.one.start, ease: "none", immediateRender: false }, VO.one.start);
  tl.to([lineA, lineB], { opacity: 0, filter: "blur(14px)", scale: 1.06, duration: 0.4, ease: "power2.in" }, S.implode - 0.05);

  // "as one": a ribbon of light threads every module, pulses run into the beam
  tl.to(st, { ribbon: 1, duration: 0.7, ease: "power2.inOut" }, S.one - 0.1);
  tl.to(st, { pulse: 1, duration: S.implode - S.one, ease: "none" }, S.one);
  tl.to(sky, { beam: 1.0, duration: 0.25, ease: "power2.out" }, S.one);
  tl.to(sky, { beam: 0.6, duration: 1.0 }, S.one + 0.25);
  tl.to(mods, { boxShadow: (i: number) => `inset 0 1px 0 rgba(255,240,225,0.2), inset 0 0 0 1.5px rgba(${MODS[i].c},0.8), 0 0 80px -6px rgba(${MODS[i].c},0.75), 0 30px 60px -30px rgba(0,0,0,0.95)`, duration: 0.25, stagger: 0.05 }, S.one);
  cue("chime", S.one, undefined, 1.0);
  cue("sweep", S.one - 0.1, 0.8, 0.8);
  for (let k = 0; k < 6; k++) cue("tick", S.one + 0.3 + k * 0.25, undefined, 0.45);

  paint((g, t) => {
    if (t < P0 - 0.1 || t > S.bloom + 0.6) return;
    // the helix ribbon (drawn on top → bottom), dimmer where it passes behind
    if (st.ribbon > 0 && st.pull < 0.98) {
      const end = (N - 1) * st.ribbon;
      const steps = 140;
      let prev: { x: number; y: number } | null = null;
      for (let j = 0; j <= steps; j++) {
        const s = (end * j) / steps;
        const h = helix(s);
        const p = project(h.x, h.y, h.z);
        if (prev) {
          const depth = (h.front + 1) / 2;
          const a = (0.15 + 0.85 * depth) * (1 - st.pull);
          g.strokeStyle = rgba("255,190,130", 0.18 * a);
          g.lineWidth = 16;
          g.beginPath();
          g.moveTo(prev.x, prev.y);
          g.lineTo(p.x, p.y);
          g.stroke();
          g.strokeStyle = rgba("255,245,230", 0.85 * a);
          g.lineWidth = 2.4;
          g.stroke();
        }
        prev = p;
      }
      const hd = helix(end);
      const ph = project(hd.x, hd.y, hd.z);
      if (st.ribbon < 1) flare(g, ph.x, ph.y, 140, 0.8);
    }
    // pulses: from every module into the beam
    if (st.pulse > 0 && st.pulse < 1) {
      for (let i = 0; i < N; i++) {
        for (let r = 0; r < 3; r++) {
          const u = (st.pulse * 4.2 + i * 0.37 + r * 0.33) % 1;
          const h = helix(i);
          const x = lerp(h.x, CX, u * u);
          const y = h.y + Math.sin(u * Math.PI) * -30;
          const z = lerp(h.z, 0, u);
          const p = project(x, y, z);
          const a = Math.sin(Math.PI * u) * (0.3 + 0.7 * ((h.front + 1) / 2));
          flare(g, p.x, p.y, 40 * p.k, a, MODS[i].c);
        }
      }
    }
    // the collapse: everything drawn into one point of light
    const k = clamp((t - (S.bloom - 0.35)) / 0.35);
    if (k > 0) {
      flare(g, CX, CY, 300 + 900 * k * k, 0.4 + 0.6 * k);
      streak(g, CX, CY, 400 + 1400 * k, 40, k);
    }
  });

  // implosion: the helix whirls into the beam, the beam into a point
  tl.to(st, { spin: "+=4", duration: S.bloom - S.implode, ease: "power3.in" }, S.implode);
  tl.to(st, { pull: 1, duration: S.bloom - S.implode, ease: "power3.in" }, S.implode);
  tl.to(pillar, { scaleY: 0, scaleX: 0.3, duration: 0.32, ease: "power3.in" }, S.bloom - 0.32);
  tl.to(sky, { beam: 0, duration: 0.3, ease: "power3.in" }, S.bloom - 0.3);
  tl.set(root, { visibility: "hidden" }, S.bloom + 0.02);
  cue("riser", S.implode - 0.3, 0.8, 1.0);
  cue("hit", S.bloom, undefined, 1.2);

  // the bloom
  const flash = $("#flash");
  tl.fromTo(flash, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1.4, duration: 0.12, ease: "power2.out" }, S.bloom - 0.04);
  tl.to(flash, { opacity: 0, scale: 2.2, duration: 0.9, ease: "power2.out" }, S.bloom + 0.08);

  // light: deep black so the beam carries the frame
  tl.to(sky, { top: "6,5,8", bot: "10,6,9", c1: "255,190,120", l1x: 0.5, l1y: 0.5, l1r: 0.55, l1i: 0.18, l2i: 0.08, duration: 0.6, ease: "power2.inOut" }, P0 - 0.3);
  void W;
  void H;
  void beat;
}
