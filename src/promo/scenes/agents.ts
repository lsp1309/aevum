import { gsap } from "../../core/gsap";
import { onFrame, clamp, smooth, cue } from "../../core/clock";
import { html, world, CX, CY, H } from "../stage";
import { S, beat } from "../timing";
import { paint, flare } from "../light";
import { sky } from "../sky";
import { hourY, LANE_HOURS, LANE_H } from "../layout";

/**
 * ACT III·c — MEANWHILE. Three hour lines of the day light up, stretch across
 * the frame and open into three lanes: three agents working at once, each
 * with its own colour, its own steps, its own comet of progress. A live log
 * scrolls beneath them. When they are done, the lanes close back into lines,
 * the lines turn upright and fuse into a single beam of light.
 */
const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path class="ck" d="m6 12.5 4 4 8-9"/></svg>`;

const AGENTS = [
  { c: "255,208,138", label: "FINANCE AGENT", title: "Invoice 4821", steps: ["Checking the September payment run", "Transfer found · 12 Sep · CHF 4,820", "Reconciled · reply drafted for Luka"] },
  { c: "255,140,90", label: "LOGISTICS AGENT", title: "Shipment AT-8891", steps: ["Delay detected at the border", "Rerouting via Basel", "Rerouted · arrives Friday 09:00"] },
  { c: "255,111,152", label: "DOCS AGENT", title: "Q4 brief for Ziyad", steps: ["Reading 14 threads · 3 decks", "Drafting · 3 pages", "Brief ready · shared with Ziyad"] },
];
const LOG: Array<[number, string, string]> = [
  [0, "finance", "payment run · sep · 214 lines"],
  [1, "logistics", "AT-8891 · customs hold detected"],
  [2, "docs", "reading #launch-q4 · 48 msgs"],
  [0, "finance", "match · CHF 4,820 · 12 Sep"],
  [1, "logistics", "route via Basel · +0 days"],
  [2, "docs", "outline · 3 sections"],
  [0, "finance", "draft reply → Luka"],
  [1, "logistics", "carrier confirmed · ETA Fri"],
  [2, "docs", "brief shared → Ziyad"],
];

export function buildAgents(tl: gsap.core.Timeline) {
  const L0 = S.lanes;
  const ys = LANE_HOURS.map((h) => hourY(h));
  const root = html(`<section class="scene" id="s-agents">
    <div class="ag-rig">
      <div class="ag-head"><div class="serif">Meanwhile…</div><div class="mono">3 AGENTS · RUNNING IN PARALLEL</div></div>
      ${AGENTS.map(
        (a, i) => `<div class="lane" style="--c:${a.c};top:${ys[i] - LANE_H / 2}px">
          <div class="ln-top"><span class="ln-glyph"><i></i></span><span>${a.label}</span><span class="ln-step">01 / 03</span></div>
          <div class="ln-title">${a.title}</div>
          <div class="ln-status">${a.steps[0]}</div>
          <div class="ln-check">${check}</div>
          <div class="ln-track"><i class="ln-fill"></i><i class="ln-head"></i></div>
        </div>`,
      ).join("")}
      <div class="ag-log"><div class="lg-in">${LOG.map(([i, n, s], k) => `<div class="lg" style="--c:${AGENTS[i].c}">16:02:${String(11 + Math.floor(k / 2)).padStart(2, "0")}  <b>${n.padEnd(9, " ")}</b> ▸ ${s}</div>`).join("")}</div></div>
      ${ys.map((y) => `<div class="ag-line" style="top:${y}px"></div>`).join("")}
    </div>
  </section>`);
  world.appendChild(root);
  const rig = root.querySelector<HTMLElement>(".ag-rig")!;
  const lanes = Array.from(root.querySelectorAll<HTMLElement>(".lane"));
  const lines = Array.from(root.querySelectorAll<HTMLElement>(".ag-line"));
  const head = root.querySelector<HTMLElement>(".ag-head")!;
  const logIn = root.querySelector<HTMLElement>(".lg-in")!;
  const logLines = Array.from(root.querySelectorAll<HTMLElement>(".lg"));

  tl.set(root, { visibility: "visible" }, L0 - 0.4);
  // the three kept hour lines take over from the week's, light up, stretch
  tl.to(lines, { background: "rgba(255,220,170,0.9)", boxShadow: "0 0 18px rgba(255,170,100,0.8)", duration: 0.3 }, L0 - 0.35);
  tl.to(lines, { left: 70, width: 940, duration: 0.4, ease: "power3.inOut" }, L0 - 0.25);
  cue("sweep", L0 - 0.3, 0.5, 0.8);

  // the lanes open out of their lines
  const done = [beat(21), beat(22), beat(23)];
  const prog = AGENTS.map(() => ({ p: 0 }));
  lanes.forEach((ln, i) => {
    const t = L0 + i * 0.1;
    tl.fromTo(ln, { clipPath: "inset(50% 0% 50% 0% round 30px)" }, { clipPath: "inset(0% 0% 0% 0% round 30px)", duration: 0.6, ease: "power3.inOut" }, t);
    tl.from(ln.querySelectorAll(".ln-top, .ln-title, .ln-status"), { opacity: 0, y: 24, filter: "blur(8px)", duration: 0.5, stagger: 0.06, ease: "power3.out" }, t + 0.25);
    tl.to(lines[i], { opacity: 0, duration: 0.3 }, t + 0.3);
    cue("whoosh", t, 0.5, 0.4);
    // work: three steps, a comet of progress
    const p0 = L0 + 0.45 + i * 0.12;
    tl.to(prog[i], { p: 1, duration: done[i] - p0, ease: "power1.inOut" }, p0);
    const status = ln.querySelector<HTMLElement>(".ln-status")!;
    const step = ln.querySelector<HTMLElement>(".ln-step")!;
    AGENTS[i].steps.slice(1).forEach((s, k) => {
      const ts = p0 + ((done[i] - p0) * (k + 1)) / 3;
      tl.to(status, { scrambleText: { text: s, chars: "abcdefghijklmnopqrstuvwxyz·", speed: 1.4 }, duration: 0.4, ease: "none" }, ts);
      tl.set(step, { textContent: `0${k + 2} / 03` }, ts);
      cue("tick", ts, undefined, 0.6);
    });
    // done: the check pops
    const ck = ln.querySelector<HTMLElement>(".ln-check")!;
    tl.fromTo(ck, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2.6)" }, done[i]);
    tl.fromTo(ck.querySelector(".ck"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.35, ease: "power2.out" }, done[i] + 0.08);
    tl.to(ln, { boxShadow: `inset 0 1px 0 rgba(255,240,225,0.16), inset 0 0 0 1.5px rgba(${AGENTS[i].c},0.7), 0 0 70px -10px rgba(${AGENTS[i].c},0.55), 0 40px 80px -40px rgba(0,0,0,0.95)`, duration: 0.4 }, done[i]);
    cue("chime", done[i], undefined, 0.9);
    cue("hit", done[i], undefined, 0.3);
  });
  gsap.set(root.querySelectorAll(".ln-check"), { scale: 0 });

  const fills = lanes.map((l) => l.querySelector<HTMLElement>(".ln-fill")!);
  const heads = lanes.map((l) => l.querySelector<HTMLElement>(".ln-head")!);
  const glyphs = lanes.map((l) => l.querySelector<HTMLElement>(".ln-glyph i")!);
  onFrame((t) => {
    if (t < L0 - 0.4 || t > S.pillar + 0.2) return;
    prog.forEach((g, i) => {
      fills[i].style.transform = `scaleX(${g.p.toFixed(4)})`;
      heads[i].style.left = `${(g.p * 100).toFixed(3)}%`;
      heads[i].style.opacity = (g.p > 0 && g.p < 1 ? 1 : 0).toString();
      glyphs[i].style.transform = `rotate(${(t * (300 + i * 40)).toFixed(1)}deg)`;
    });
  });

  // camera: a slow lateral orbit across the three lanes
  gsap.set(lanes, { z: (i: number) => -i * 50 });
  tl.fromTo(rig, { rotationY: -11, rotationX: 5, x: -20 }, { rotationY: 7, rotationX: 2, x: 16, duration: done[2] - L0 + 0.4, ease: "sine.inOut" }, L0 - 0.2);
  tl.from(head.children, { opacity: 0, y: 40, filter: "blur(10px)", duration: 0.7, stagger: 0.08, ease: "power3.out" }, L0 + 0.1);

  // the log writes itself under the lanes
  const lg0 = L0 + 0.5;
  const step = (done[2] - lg0) / LOG.length;
  logLines.forEach((el, k) => {
    tl.from(el, { opacity: 0, x: -20, duration: 0.25, ease: "power2.out" }, lg0 + k * step);
  });
  tl.fromTo(logIn, { y: 290 }, { y: 290 - 36 * LOG.length, duration: done[2] - lg0 + 0.2, ease: "none" }, lg0);

  // the lanes close; the lines turn upright and fuse into one beam
  const C0 = S.pillar - 0.48;
  tl.to(rig, { rotationY: 0, rotationX: 0, x: 0, duration: 0.35, ease: "power2.inOut" }, C0 - 0.1);
  tl.to([head, root.querySelector(".ag-log")], { opacity: 0, y: -20, filter: "blur(8px)", duration: 0.3, ease: "power2.in" }, C0 - 0.1);
  tl.to(lanes, { clipPath: "inset(50% 0% 50% 0% round 30px)", duration: 0.26, ease: "power3.in", stagger: 0.02 }, C0);
  tl.set(lines, { opacity: 1 }, C0 + 0.1);
  lines.forEach((ln, i) => {
    tl.to(ln, { top: CY, rotation: 90, scaleX: H / 940, duration: 0.4, ease: "power3.inOut" }, C0 + 0.12 + i * 0.02);
  });
  tl.to(lines, { opacity: 0, duration: 0.12 }, S.pillar);
  tl.set(root, { visibility: "hidden" }, S.pillar + 0.15);
  cue("riser", C0 - 0.3, 0.8, 0.8);

  paint((g, t) => {
    // where a lane ends its work, a burst of its colour
    done.forEach((d, i) => {
      const k = t - d;
      if (k < 0 || k > 0.7) return;
      flare(g, 70 + 940 - 36 - 32, ys[i] - LANE_H / 2 + 124, 260, 0.6 * Math.exp(-k * 5), AGENTS[i].c);
    });
    // the beam forming
    const k = clamp((t - (S.pillar - 0.2)) / 0.2);
    if (k > 0 && t < S.pillar + 0.3) flare(g, CX, CY, 900, 0.7 * smooth(k) * (1 - smooth(clamp((t - S.pillar) / 0.3))), "255,200,140");
  });

  // light: three warm sources, low
  tl.to(sky, { top: "9,7,10", bot: "16,9,10", c1: "255,180,110", l1x: 0.1, l1y: 0.35, l1r: 0.45, l1i: 0.2, c2: "255,100,140", l2x: 0.95, l2y: 0.8, l2r: 0.5, l2i: 0.18, duration: 1.2, ease: "power2.inOut" }, L0 - 0.3);
}
