import { gsap } from "../../core/gsap";
import { onFrame, clamp, smooth, lerp, cue } from "../../core/clock";
import { html, world, CX, CY, $ } from "../../promo/stage";
import { T, VO } from "../timing";
import { FlapText } from "../flap";
import { ICON } from "../faces";

/**
 * ACT III — THE APP, ALIVE. A porcelain bento of Astrya, filmed in one
 * continuous tracking shot. Nothing is "shown": information travels and the
 * camera follows it — the inbox sorts itself, Luka's mail lifts off as a
 * cobalt token and runs down a gutter into the reply, which writes itself
 * flap by flap; "Thu 14:00" leaves the reply and slides the week open; the
 * week drops three agents into their lanes, whose progress clicks on tile by
 * tile.
 */
export const bcam = { fx: 540, fy: 590, z: -900, rx: 30, ry: 0, rz: -8, s: 0.6 };
export let brig: HTMLElement;

const X = 48;
const W = 984;
const CELL = {
  inbox: { y: 120, h: 940 },
  reply: { y: 1084, h: 600 },
  week: { y: 1708, h: 720 },
  agents: { y: 2452, h: 640 },
  kpi: { y: 3116, h: 260 },
};
export const BENTO_H = CELL.kpi.y + CELL.kpi.h + 120;

const MAIL = [
  { a: "Z", f: "Ziyad · Ops", s: "Shipment AT-8891 delayed", t: "13:05" },
  { a: "HL", f: "Helios Legal", s: "September legal brief", t: "12:40" },
  { a: "L", f: "Luka · Alpine Supplies", s: "Contract renewal — confirm by Friday", t: "09:12", k: true },
  { a: "SP", f: "Silo Pay", s: "Payment received — INV-4820", t: "11:36" },
  { a: "L", f: "Luka · Alpine Supplies", s: "Invoice 4821 — payment status", t: "08:04", k: true },
  { a: "NR", f: "Northline Retail", s: "Product newsletter — October", t: "07:20" },
  { a: "AF", f: "Atlas Freight", s: "AT-8891 — tracking update", t: "08:51" },
];

/** Point at fraction p along a polyline. */
function along(pts: Array<[number, number]>, p: number): [number, number] {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = clamp(p) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? d / seg[i] : 0;
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
}
const pathD = (pts: Array<[number, number]>) => pts.map((q, i) => `${i ? "L" : "M"}${q[0]} ${q[1]}`).join(" ");

export function buildBento(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-bento"><div class="rig b-rig" style="width:1080px;height:${BENTO_H}px"></div></section>`);
  world.appendChild(root);
  brig = root.querySelector<HTMLElement>(".rig")!;
  const rig = brig;
  const cell = (key: keyof typeof CELL, inner: string, extra = "") =>
    `<div class="cell c-${key}" style="left:${X}px;top:${CELL[key].y}px;width:${W}px;height:${CELL[key].h}px${extra}">${inner}</div>`;

  // ── markup ──────────────────────────────────────────────────────────────
  const SLOT = { x: 40 + 70, y: 136, w: 158, h: 66, px: 166, py: 72 };
  const ev = (c: number, r: number, n: number, cls: string, title: string, sub = "") =>
    `<div class="ev ${cls}" data-c="${c}" data-r="${r}" style="left:${SLOT.x + c * SLOT.px}px;top:${SLOT.y + r * SLOT.py}px;width:${SLOT.w}px;height:${n * SLOT.py - (SLOT.py - SLOT.h)}px">${title}${sub ? `<small>${sub}</small>` : ""}</div>`;
  rig.innerHTML = `
    <svg class="trace" width="1080" height="${BENTO_H}" viewBox="0 0 1080 ${BENTO_H}" fill="none"></svg>
    ${cell(
      "inbox",
      `<div class="lbl abs" style="left:40px;top:44px">Inbox · <b class="ib-st">sorting</b></div>
       <div class="cnum abs ib-n" style="right:40px;left:auto;top:28px;font-size:120px">312</div>
       <div class="lbl abs" style="right:44px;left:auto;top:150px;font-size:14px">unread</div>
       ${MAIL.map(
         (m, i) => `<div class="mrow${m.k ? " key" : ""}" style="top:${200 + i * 104}px"><span class="av${m.k ? " k" : ""}">${m.a}</span><div class="tx"><b>${m.f}</b><span>${m.s}</span></div>${m.k ? `<span class="tagc">NEEDS YOU</span>` : `<span class="tm">${m.t}</span>`}</div>`,
       ).join("")}
       <div class="digest abs" style="left:40px;top:${200 + 3 * 104 + 24}px">${Array.from({ length: 310 }, () => "<i></i>").join("")}</div>
       <div class="lbl abs dg-l" style="left:40px;top:${200 + 3 * 104 + 24 + 10 * 30 + 18}px"><b>3</b> drafted · 93 FYI · 214 archived</div>
       <div class="mrow sum" style="top:${200 + 2 * 104}px;background:#eef1ff"><span class="av" style="background:#dfe5ff;color:var(--cobalt)">${ICON.check}</span><div class="tx"><b class="sum-t">310 more — sorted & summarized</b><span>214 archived · 3 replies drafted · 93 FYI</span></div></div>`,
    )}
    ${cell(
      "reply",
      `<div class="lbl abs" style="left:40px;top:44px">Reply · in your voice</div>
       <p class="rp-text" style="top:150px;margin:0"><span class="rp-a">Hi Luka — the renewal looks right on our side. Could we walk through pricing on</span> <span class="hi"><span class="rp-b">Thu 14:00</span></span><span class="rp-q">?</span></p>
       <div class="lbl abs" style="left:40px;top:430px">Your tone</div>
       <div class="meter" style="left:40px;top:470px">${"<i></i>".repeat(24)}</div>
       <div class="cnum abs rp-pc" style="left:auto;right:40px;top:440px;font-size:64px">0%</div>
       <div class="lbl abs" style="left:40px;top:528px;color:#0d1020">Warm · Direct · Brief</div>`,
    )}
    ${cell(
      "week",
      `<div class="lbl abs" style="left:40px;top:44px">Week · Oct 1</div>
       <div class="lbl abs wk-st" style="left:auto;right:40px;top:44px"><b>4 conflicts</b></div>
       <div class="wk-grid">
         ${["MON", "TUE", "WED", "THU", "FRI"].map((d, j) => `<div class="d" style="left:${SLOT.x + j * SLOT.px}px;top:100px;width:${SLOT.w}px">${d}</div>`).join("")}
         ${Array.from({ length: 8 }, (_, r) => `<div class="h" style="left:40px;top:${SLOT.y + r * SLOT.py + 22}px">${9 + r}:00</div>`).join("")}
         ${Array.from({ length: 40 }, (_, k) => `<div class="slot" style="left:${SLOT.x + (k % 5) * SLOT.px}px;top:${SLOT.y + Math.floor(k / 5) * SLOT.py}px;width:${SLOT.w}px;height:${SLOT.h}px"></div>`).join("")}
         ${ev(0, 0, 1, "", "Standup")}${ev(0, 6, 1, "", "Hiring")}
         ${ev(1, 1, 2, "g", "Budget review", "10:00 – 12:00")}
         ${ev(2, 0, 1, "", "Standup")}${ev(2, 4, 2, "g", "Board prep", "13:00 – 15:00")}
         ${ev(3, 0, 1, "", "Ops sync")}${ev(3, 2, 1, "", "Design review")}${ev(3, 3, 1, "", "Team lunch")}${ev(3, 4, 1, "g", "Kickoff")}${ev(3, 5, 1, "", "Vendor call")}${ev(3, 6, 1, "", "Hiring")}
         ${ev(4, 6, 1, "", "Retro")}
         ${ev(1, 4, 2, "f wk-focus", "Focus · Q4", "protected")}
       </div>`,
    )}
    ${cell(
      "agents",
      `<div class="lbl abs" style="left:40px;top:44px">Agents · <b class="ag-st">3 running</b></div>
       ${[
         ["coin", "Invoice 4821", "Matching the September run"],
         ["truck", "Shipment AT-8891", "Delay detected at the border"],
         ["doc", "Q4 brief for Ziyad", "Reading 14 threads"],
       ]
         .map(
           ([ic, n, s], i) => `<div class="agrow" style="top:${110 + i * 170}px"><span class="ai">${ic === "coin" ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><path d="M14.5 9.5c-.6-.8-1.5-1.2-2.6-1.2-1.6 0-2.6.8-2.6 1.9 0 2.6 5.4 1.3 5.4 3.9 0 1.1-1.1 1.9-2.7 1.9-1.2 0-2.2-.5-2.8-1.3M12 6.8v1.5M12 15.7v1.5"/></svg>` : ICON[ic as "truck" | "doc"]}</span><div class="an">${n}</div><div class="as">${s}</div><div class="prog">${"<i></i>".repeat(16)}</div><span class="ok">${ICON.check}</span></div>`,
         )
         .join("")}`,
    )}
    ${[
      ["2", "need you"],
      ["0", "conflicts"],
      ["3/3", "done"],
    ]
      .map(
        ([n, l], i) => `<div class="cell kpi" style="left:${X + i * 336}px;top:${CELL.kpi.y}px;width:312px;height:${CELL.kpi.h}px"><div class="lbl">${l}</div><div class="cnum kn">${n}</div></div>`,
      )
      .join("")}
    <div class="token tk-mail"><i>L</i>Luka · Renewal</div>
    <div class="token tk-time" style="height:52px;padding:0 20px;font-size:21px">Thu 14:00</div>
    ${[0, 1, 2].map((i) => `<div class="token tk-ag tk-ag${i}" style="width:64px;height:64px;padding:0;border-radius:18px"></div>`).join("")}
  `;
  const q = <E extends Element = HTMLElement>(s: string) => rig.querySelector(s) as unknown as E;
  const qa = (s: string) => Array.from(rig.querySelectorAll<HTMLElement>(s));
  const svg = q<SVGSVGElement>(".trace");
  const cells = qa(".cell");

  // ── camera ──────────────────────────────────────────────────────────────
  onFrame(() => {
    rig.style.transform = `translate3d(${CX}px, ${CY}px, ${bcam.z.toFixed(2)}px) rotateX(${bcam.rx.toFixed(3)}deg) rotateY(${bcam.ry.toFixed(3)}deg) rotateZ(${bcam.rz.toFixed(3)}deg) scale(${bcam.s.toFixed(4)}) translate3d(${(-bcam.fx).toFixed(2)}px, ${(-bcam.fy).toFixed(2)}px, 0)`;
  });
  const mid = (k: keyof typeof CELL) => CELL[k].y + CELL[k].h / 2;
  const cellBox = cells.map((c) => ({ y: c.offsetTop, h: c.offsetHeight }));
  onFrame((t) => {
    if (t < T.burst || t > T.night + 0.5) return;
    cells.forEach((c, i) => {
      const b = cellBox[i];
      const d = Math.max(0, Math.abs(b.y + b.h / 2 - bcam.fy) - b.h / 2 - 40);
      const k = clamp(d / 420) * (t < T.kpi ? 1 : 1 - smooth(clamp((t - T.kpi) / 0.6)));
      c.style.filter = k > 0.02 ? `blur(${(3.2 * k).toFixed(2)}px)` : "";
    });
  });
  tl.set(root, { visibility: "visible" }, T.burst + 0.05);
  tl.to(bcam, { z: 0, rx: 15, rz: -4, s: 1.0, duration: 1.0, ease: "power3.out" }, T.burst + 0.1);
  tl.fromTo(cells.slice(0, 2), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08 }, T.burst + 0.15);
  // the camera follows the information down the bento
  tl.to(bcam, { fy: mid("reply") - 40, rz: -2, duration: 0.85, ease: "power3.inOut" }, T.lift + 0.15);
  tl.to(bcam, { fy: mid("week"), rz: -5, ry: 3, duration: 0.85, ease: "power3.inOut" }, T.chip + 0.05);
  tl.to(bcam, { fy: mid("agents"), rz: -2, ry: -2, duration: 0.85, ease: "power3.inOut" }, T.agents + 0.05);
  tl.to(bcam, { fy: CELL.agents.y + 520, s: 0.74, rx: 18, rz: -7, ry: 0, duration: 1.0, ease: "power3.inOut" }, T.kpi - 0.15);
  cue("whoosh", T.burst + 0.1, 0.9, 0.5);

  // ── inbox: sort ───────────────────────────────────────────────────────
  const rows = qa(".c-inbox .mrow:not(.sum)");
  const sum = q(".c-inbox .sum");
  const keys = rows.filter((r) => r.classList.contains("key"));
  const rest = rows.filter((r) => !r.classList.contains("key"));
  const tags = qa(".c-inbox .tagc");
  gsap.set(tags, { scale: 0, opacity: 0, transformOrigin: "100% 50%" });
  gsap.set(sum, { opacity: 0, scale: 0.92 });
  tl.from(rows, { opacity: 0, y: 40, duration: 0.5, stagger: 0.05, ease: "power3.out" }, T.burst + 0.3);
  const S0 = T.sort;
  keys.forEach((r, k) => {
    const from = 200 + MAIL.indexOf(MAIL.filter((m) => m.k)[k]) * 104;
    tl.to(r, { y: 200 + k * 104 - from, duration: 0.7, ease: "power3.inOut" }, S0 + k * 0.08);
  });
  rest.forEach((r, k) => {
    const from = 200 + MAIL.indexOf(MAIL.filter((m) => !m.k)[k]) * 104;
    tl.to(r, { y: 200 + 2 * 104 - from + k * 4, scale: 0.94 - k * 0.01, opacity: 0, duration: 0.6, ease: "power3.inOut" }, S0 + 0.12 + k * 0.05);
  });
  tl.to(tags, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.1, ease: "back.out(1.6)" }, S0 + 0.55);
  tl.to(sum, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }, S0 + 0.6);
  // the 310 others, each a tiny tile, sort themselves into what happened to them
  const dg = qa(".digest i");
  gsap.set(qa(".dg-l"), { opacity: 0 });
  tl.to(q(".dg-l"), { opacity: 1, duration: 0.4 }, S0 + 1.5);
  onFrame((t) => {
    if (t < S0 || t > T.chip + 1) return;
    dg.forEach((d, i) => {
      const appear = clamp((t - (S0 + 0.75 + (i % 31) * 0.012 + Math.floor(i / 31) * 0.03)) / 0.2);
      const sorted = t > S0 + 1.25 + (i % 31) * 0.01;
      const cls = !sorted ? (i * 7) % 3 : i < 3 ? 3 : i < 96 ? 1 : 2;
      const col = ["#d5dae4", "#8e97aa", "#c3c9d6", "#1e3cff"][cls];
      d.style.background = col;
      d.style.transform = `scale(${(0.3 + 0.7 * smooth(appear)).toFixed(3)})`;
      d.style.opacity = appear.toFixed(3);
    });
  });
  tl.to(q(".ib-st"), { scrambleText: { text: "2 need you", chars: "0123456789", speed: 1 }, duration: 0.5, ease: "none" }, S0 + 0.6);
  // the unread count rolls down, digit by digit
  const nEl = q(".ib-n");
  const steps = [312, 286, 233, 161, 97, 42, 13, 2];
  onFrame((t) => {
    const k = Math.floor((t - S0 - 0.1) / 0.1);
    const v = k < 0 ? 312 : steps[Math.min(steps.length - 1, k)];
    if (nEl.textContent !== String(v)) nEl.textContent = String(v);
    const ph = (t - S0 - 0.1) / 0.1 - k;
    nEl.style.transform = k >= 0 && k < steps.length ? `scaleY(${(0.55 + 0.45 * smooth(clamp(ph * 2.5))).toFixed(3)})` : "";
  });
  cue("whoosh", S0, 0.7, 0.4);
  steps.forEach((_, k) => cue("tick", S0 + 0.1 + k * 0.1, undefined, 0.6));
  cue("chime", S0 + 0.55, undefined, 0.5);

  // ── flow 1: Luka's mail runs down to the reply ────────────────────────
  const tkMail = q(".tk-mail");
  const p1: Array<[number, number]> = [
    [X + 40, CELL.inbox.y + 200 + 16],
    [22, CELL.inbox.y + 200 + 16],
    [22, CELL.reply.y + 70],
    [X + 40, CELL.reply.y + 70],
  ];
  const tr1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  tr1.setAttribute("d", pathD(p1));
  for (const [k, v] of Object.entries({ stroke: "#1e3cff", "stroke-width": "4", "stroke-linecap": "round", "stroke-linejoin": "round" })) tr1.setAttribute(k, v);
  svg.appendChild(tr1);
  const M1 = { p: 0 };
  gsap.set(tkMail, { opacity: 0, scale: 0.6, transformOrigin: "30px 30px" });
  tl.to(keys[0], { z: 40, scale: 1.02, boxShadow: "0 30px 50px -20px rgba(30,60,255,0.45)", duration: 0.3, ease: "power2.out" }, T.lift - 0.2);
  tl.to(keys[0], { z: 0, scale: 1, boxShadow: "0 0 0 0 rgba(30,60,255,0)", duration: 0.4 }, T.lift + 0.3);
  tl.to(tkMail, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, T.lift);
  tl.to(M1, { p: 1, duration: 0.95, ease: "power2.inOut" }, T.lift + 0.12);
  tl.fromTo(tr1, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.95, ease: "power2.inOut" }, T.lift + 0.12);
  tl.to(tr1, { drawSVG: "100% 100%", duration: 0.5, ease: "power2.in" }, T.lift + 1.1);
  onFrame((t) => {
    if (t < T.lift - 0.1 || t > T.chip + 2) return;
    const [x, y] = along(p1, M1.p);
    tkMail.style.left = `${x - 30}px`;
    tkMail.style.top = `${y - 30}px`;
  });
  cue("click", T.lift, undefined, 0.8);
  cue("whoosh", T.lift + 0.1, 0.9, 0.5);
  cue("soft", T.lift + 1.05, undefined, 0.5);

  // ── the reply writes itself ──────────────────────────────────────────
  const ftA = new FlapText(q(".rp-a"), T.write, { stagger: 0.011, spin: 0.22, seed: 3 });
  const ftB = new FlapText(q(".rp-b"), ftA.done - 0.05, { stagger: 0.03, spin: 0.2, seed: 5 });
  gsap.set(q(".rp-q"), { opacity: 0 });
  tl.to(q(".rp-q"), { opacity: 1, duration: 0.1 }, ftB.done);
  tl.to(q(".hi"), { backgroundSize: "100% 100%", duration: 0.3, ease: "power3.out" }, ftB.done + 0.05);
  const meter = qa(".meter i");
  const pc = q(".rp-pc");
  onFrame((t) => {
    if (t < T.write - 0.5 || t > T.chip + 1.5) return;
    const p = smooth(clamp((t - (T.write + 0.3)) / 1.3));
    const on = Math.round(p * 23);
    meter.forEach((m, i) => (m.style.background = i < on ? "#1e3cff" : ""));
    pc.textContent = `${Math.round(p * 96)}%`;
  });
  for (let k = 0; k < 18; k++) cue("tick", T.write + k * 0.075, undefined, 0.3);
  cue("chime", ftB.done + 0.05, undefined, 0.6);

  // ── flow 2: "Thu 14:00" leaves the reply and runs to the week ────────
  const tkTime = q(".tk-time");
  const thu = { x: SLOT.x + 3 * SLOT.px, y: SLOT.y + 5 * SLOT.py };
  // start where "Thu 14:00" sits in the reply
  const hiEl = q(".hi");
  let hx = 0;
  let hy = 0;
  for (let n: HTMLElement | null = hiEl; n && n !== rig; n = n.offsetParent as HTMLElement | null) {
    hx += n.offsetLeft;
    hy += n.offsetTop;
  }
  hx += hiEl.offsetWidth / 2;
  hy += hiEl.offsetHeight / 2;
  const p2: Array<[number, number]> = [
    [hx, hy],
    [hx, CELL.reply.y + 400],
    [1058, CELL.reply.y + 400],
    [1058, CELL.week.y + thu.y + 33],
    [X + thu.x + SLOT.w / 2, CELL.week.y + thu.y + 33],
  ];
  const tr2 = tr1.cloneNode() as SVGPathElement;
  tr2.setAttribute("d", pathD(p2));
  svg.appendChild(tr2);
  const M2 = { p: 0 };
  gsap.set(tkTime, { opacity: 0 });
  tl.to(tkTime, { opacity: 1, duration: 0.15 }, T.chip);
  tl.to(M2, { p: 1, duration: 0.95, ease: "power2.inOut" }, T.chip + 0.05);
  tl.fromTo(tr2, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.95, ease: "power2.inOut" }, T.chip + 0.05);
  tl.to(tr2, { drawSVG: "100% 100%", duration: 0.5, ease: "power2.in" }, T.chip + 1.0);
  onFrame((t) => {
    if (t < T.chip - 0.1 || t > T.agents) return;
    const [x, y] = along(p2, M2.p);
    tkTime.style.left = `${x - 62}px`;
    tkTime.style.top = `${y - 26}px`;
  });
  cue("click", T.chip, undefined, 0.8);
  cue("whoosh", T.chip + 0.05, 0.9, 0.5);

  // ── the week slides open ─────────────────────────────────────────────
  const evs = qa(".c-week .ev");
  const find = (name: string) => evs.find((e) => e.textContent?.startsWith(name))!;
  const vendor = find("Vendor call");
  const design = find("Design review");
  const kick = find("Kickoff");
  const focus = q(".wk-focus");
  gsap.set(focus, { clipPath: "inset(0% 0% 100% 0% round 14px)" });
  // the jammed day trembles until it is solved
  const thuEvs = evs.filter((e) => e.dataset.c === "3" && e !== kick);
  onFrame((t) => {
    if (t < T.chip || t > T.slide + 0.6) return;
    const a = 1.6 * (1 - smooth(clamp((t - T.slide) / 0.2)));
    thuEvs.forEach((e, i) => (e.style.translate = `${(a * Math.sin(t * 57 + i * 2)).toFixed(2)}px 0`));
  });
  const S1 = T.slide;
  tl.to(vendor, { left: `+=${SLOT.px}`, duration: 0.32, ease: "power3.inOut" }, S1);
  tl.to(design, { left: `-=${SLOT.px}`, duration: 0.32, ease: "power3.inOut" }, S1 + 0.24);
  // the token lands in the freed hour and becomes the meeting
  tl.to(tkTime, { left: X + thu.x, top: CELL.week.y + thu.y, width: SLOT.w, height: SLOT.h, borderRadius: 14, duration: 0.3, ease: "power3.out" }, S1 + 0.55);
  tl.set(tkTime, { textContent: "" }, S1 + 0.55);
  tl.to(tkTime, { boxShadow: "0 14px 30px -12px rgba(30,60,255,0.75)", duration: 0.3 }, S1 + 0.55);
  const pricing = html(`<div class="ev c" style="left:${thu.x}px;top:${thu.y}px;width:${SLOT.w}px;height:${SLOT.h}px">Pricing · Luka</div>`);
  q(".wk-grid").appendChild(pricing);
  gsap.set(pricing, { opacity: 0 });
  tl.to(pricing, { opacity: 1, duration: 0.15 }, S1 + 0.85);
  tl.set(tkTime, { opacity: 0 }, S1 + 1.0);
  // the hours the week was hiding: protected focus
  const f0 = VO.time.start + 1.6;
  tl.to(focus, { clipPath: "inset(0% 0% 0% 0% round 14px)", duration: 0.5, ease: "power3.out" }, f0);
  tl.to(q(".wk-st"), { scrambleText: { text: "Week solved", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", speed: 1 }, duration: 0.5, ease: "none" }, f0 - 0.2);
  cue("click", S1, undefined, 1.0);
  cue("click", S1 + 0.24, undefined, 1.0);
  cue("hit", S1 + 0.55, undefined, 0.5);
  cue("chime", f0, undefined, 0.6);

  // ── flow 3: three agents drop out of the week ────────────────────────
  const agTk = qa(".tk-ag");
  const agRows = qa(".agrow");
  const agIcons = qa(".agrow .ai");
  agTk.forEach((tk, i) => {
    const sx = X + SLOT.x + (1 + i) * SLOT.px + 47;
    const sy = CELL.week.y + 660;
    const ex = X + 36;
    const ey = CELL.agents.y + 110 + i * 170 + 8;
    gsap.set(tk, { left: sx, top: sy, opacity: 0, scale: 0.4 });
    const t0 = T.agents + i * 0.12;
    tl.to(tk, { opacity: 1, scale: 1, duration: 0.2, ease: "back.out(2)" }, t0);
    tl.to(tk, { left: ex, duration: 0.7, ease: "power2.inOut" }, t0 + 0.1);
    tl.to(tk, { top: ey, duration: 0.7, ease: "back.in(1.2)" }, t0 + 0.1);
    tl.set(tk, { opacity: 0 }, t0 + 0.82);
    tl.fromTo(agIcons[i], { background: "#1e3cff", scale: 1.15 }, { background: "#0d1020", scale: 1, duration: 0.5, ease: "power2.out" }, t0 + 0.8);
    cue("tick", t0 + 0.8, undefined, 0.9);
  });
  tl.from(agRows, { opacity: 0, x: 30, duration: 0.5, stagger: 0.1, ease: "power3.out" }, T.agents + 0.1);
  const done = [17.35, 17.75, 18.12];
  const STEPS = [
    ["Transfer found · CHF 4,820", "Reconciled · Luka notified"],
    ["Rerouting via Basel", "Rerouted · Friday 09:00"],
    ["Drafting 3 pages", "Brief ready · shared"],
  ];
  const progs = agRows.map((r) => Array.from(r.querySelectorAll<HTMLElement>(".prog i")));
  const oks = qa(".agrow .ok");
  gsap.set(oks, { scale: 0 });
  agRows.forEach((r, i) => {
    const st = r.querySelector<HTMLElement>(".as")!;
    const t0 = T.agents + 0.6 + i * 0.1;
    const span = done[i] - t0;
    STEPS[i].forEach((s, k) => tl.to(st, { scrambleText: { text: s, chars: "abcdefghijklmnopqrstuvwxyz", speed: 1.2 }, duration: 0.35, ease: "none" }, t0 + span * (k === 0 ? 0.42 : 0.92)));
    tl.to(oks[i], { scale: 1, duration: 0.45, ease: "back.out(2)" }, done[i]);
    cue("chime", done[i], undefined, 0.8);
  });
  onFrame((t) => {
    if (t < T.agents || t > T.night + 1) return;
    progs.forEach((cells, i) => {
      const t0 = T.agents + 0.6 + i * 0.1;
      const p = clamp((t - t0) / (done[i] - t0));
      // agents work in bursts: progress steps, not a smooth bar
      const on = Math.floor(16 * (p + 0.04 * Math.sin(p * 20 + i)) + 0.001);
      cells.forEach((c, k) => {
        const want = k < on;
        if (c.classList.contains("on") !== want) c.classList.toggle("on", want);
      });
    });
  });
  for (let k = 0; k < 24; k++) cue("tick", T.agents + 0.7 + k * 0.1, undefined, 0.35);
  tl.to(q(".ag-st"), { scrambleText: { text: "3 done", chars: "0123456789", speed: 1 }, duration: 0.4, ease: "none" }, done[2] + 0.1);

  // KPI cells: the results, in big flap numbers
  const kpis = qa(".kpi");
  tl.from(kpis, { opacity: 0, y: 80, rotationX: -30, duration: 0.6, stagger: 0.08, ease: "power3.out" }, T.kpi);
  qa(".kpi .kn").forEach((k, i) => new FlapText(k, T.kpi + 0.2 + i * 0.1, { stagger: 0.05, spin: 0.3, seed: 9 + i }));
  cue("whoosh", T.kpi, 0.6, 0.4);

  // ── studio light (porcelain) ──────────────────────────────────────────
  const key = $(".st-key");
  tl.set(key, { background: "radial-gradient(80% 50% at 50% 10%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%)" }, T.burst + 0.1);
  tl.to(key, { opacity: 1, duration: 0.6 }, T.burst + 0.2);
  void W;
  void ICON;
}
