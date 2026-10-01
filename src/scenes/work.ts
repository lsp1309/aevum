import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, atmos, cam, share, box } from "../core/stage";
import { titleIn } from "../core/text";
import { trail, burst } from "../core/fx";
import { icon } from "../core/icons";
import { calendar, tasks } from "../data";
import { T } from "../timing";
import "./work.css";

const C = { x: 770, y: 150, w: 1000, h: 780 };
const GUTTER = 72;
const COL = 180;
const GRID_TOP = 150;
const HOUR = 60;
const evRect = (day: number, start: number, end: number) => ({
  x: GUTTER + day * COL + 4,
  y: GRID_TOP + (start - calendar.startHour) * HOUR + 2,
  w: COL - 8,
  h: (end - start) * HOUR - 4,
});

export function buildWork(tl: gsap.core.Timeline) {
  const hours = Array.from({ length: calendar.endHour - calendar.startHour + 1 }, (_, i) => calendar.startHour + i);
  const events = calendar.events
    .map((e) => {
      const r = evRect(e.day, e.start, e.end);
      const hh = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
      return `<div class="ev ev-${e.tone}" ${e.id ? `data-id="${e.id}"` : ""} style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px">
        <b>${e.title}</b>${r.h > 40 ? `<span>${hh(e.start)} – ${hh(e.end)}</span>` : ""}</div>`;
    })
    .join("");
  const kick = calendar.events.find((e) => e.id === "kickoff")!;
  const kr = evRect(kick.day, kick.start, kick.end);
  const pr = evRect(3, 14.5, 15);

  const taskRows = tasks
    .map(
      (t) => `<div class="task" data-id="${t.id}">
        <span class="tk-box"><svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.6 3.6L17.5 8.5"/></svg></span>
        <div class="tk-text"><div class="tk-title"><span class="tk-strike"></span>${t.title}</div><div class="tk-meta">${t.meta}</div></div>
        ${t.chip ? `<span class="chip tk-chip ${t.chip.tone}">${t.chip.label}</span>` : ""}
      </div>`,
    )
    .join("");

  const root = html(`<section class="scene" id="s-work">
    <div class="work-upper">
      <div class="cal card">
        <div class="cal-head">
          <div class="cal-title">October 2026</div><span class="chip">Week 40</span>
          <div class="cal-seg"><span>Day</span><span class="on">Week</span><span>Month</span></div>
        </div>
        <div class="cal-days">${calendar.days
          .map((d, i) => `<div class="cal-day ${d.today ? "today" : ""}" style="left:${GUTTER + i * COL}px"><span>${d.d}</span><b>${d.n}</b></div>`)
          .join("")}</div>
        <div class="cal-today" style="left:${GUTTER + 3 * COL}px;top:${GRID_TOP}px;width:${COL}px;height:${(hours.length - 1) * HOUR}px"></div>
        ${hours
          .map(
            (h, i) =>
              `<div class="cal-hline" style="top:${GRID_TOP + i * HOUR}px"></div><div class="cal-hour" style="top:${GRID_TOP + i * HOUR - 8}px">${String(h).padStart(2, "0")}:00</div>`,
          )
          .join("")}
        ${calendar.days.map((_, i) => `<div class="cal-vline" style="left:${GUTTER + i * COL}px;top:${GRID_TOP}px;height:${(hours.length - 1) * HOUR}px"></div>`).join("")}
        <div class="cal-now" style="left:${GUTTER + 3 * COL - 5}px;top:${GRID_TOP + 1.25 * HOUR}px;width:${COL + 5}px"><i></i></div>
        <div class="ev-ghost" style="left:${kr.x}px;top:${kr.y}px;width:${kr.w}px;height:${kr.h}px"></div>
        ${events}
        <div class="slot-ripple" style="left:${pr.x}px;top:${pr.y}px;width:${pr.w}px;height:${pr.h}px"></div>
        <div class="ev-tag chip green" style="left:${kr.x}px;top:${kr.y + 2 * HOUR + kr.h + 8}px">${icon.check}3 attendees notified</div>
      </div>
    </div>

    <div class="fly"><span class="fly-a">walk through pricing on a call</span><span class="fly-b"><b>Pricing call</b><span>14:30 – 15:00</span></span></div>

    <div class="work-lower">
      <div class="tasks card">
        <div class="tk-head"><span class="tk-ico">${icon.tasks}</span><span class="tk-h">Today</span><span class="chip tk-count">4 open</span><span class="tk-sync mono">Synced with calendar</span></div>
        ${taskRows}
        <div class="task task-new" data-id="call">
          <span class="tk-box"><svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.6 3.6L17.5 8.5"/></svg></span>
          <div class="tk-text"><div class="tk-title">Pricing call with Eva Brunner</div><div class="tk-meta">Thursday · 14:30 · invite sent</div></div>
          <span class="chip tk-chip blue">${icon.sparkle}New</span>
        </div>
      </div>

      <div class="agent card">
        <div class="ag-head">
          <span class="ag-glyph"><i class="ag-orbit"><b></b></i></span>
          <div><div class="ag-name">Finance agent</div><div class="ag-sub shimmer">Working on Invoice 4821</div></div>
          <span class="ag-count mono">0 / 3</span>
        </div>
        <div class="ag-bar"><i></i></div>
        <div class="ag-steps">
          <div class="ag-step"><span class="ag-st"><svg class="sp" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg><svg class="ok" viewBox="0 0 24 24"><path d="m6.5 12.5 3.6 3.6L17.5 8.5"/></svg></span><span class="ag-tx">Checked the September payment run</span><span class="ag-r mono">done</span></div>
          <div class="ag-step"><span class="ag-st"><svg class="sp" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg><svg class="ok" viewBox="0 0 24 24"><path d="m6.5 12.5 3.6 3.6L17.5 8.5"/></svg></span><span class="ag-tx">Found the transfer · 12 Sep</span><span class="ag-r ag-amount">CHF 0</span></div>
          <div class="ag-step"><span class="ag-st"><svg class="sp" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg><svg class="ok" viewBox="0 0 24 24"><path d="m6.5 12.5 3.6 3.6L17.5 8.5"/></svg></span><span class="ag-tx">Reply drafted for Marc Dufour</span><span class="ag-r mono">ready</span></div>
        </div>
        <div class="ag-foot"><span class="btn primary ag-btn"><span class="btn-sheen"></span>Mark as paid &amp; send</span><span class="btn">View transfer</span></div>
      </div>

      <div class="pill card soft p-log"><span class="pl-ico">${icon.truck}</span><div><b>Logistics agent</b><span>AT-8891 rerouted via Basel</span></div><i class="pl-ok">${icon.check}</i></div>
      <div class="pill card soft p-docs"><span class="pl-ico">${icon.doc}</span><div><b>Docs agent</b><span>Q4 brief drafted for Priya</span></div><i class="pl-ok">${icon.check}</i></div>
      <div class="pill card soft p-cal"><span class="pl-ico">${icon.calendar}</span><div><b>Calendar</b><span>3 conflicts resolved this week</span></div><i class="pl-ok">${icon.check}</i></div>
      <h3 class="work-title">Handled. In parallel.</h3>
    </div>
  </section>`);
  camera.appendChild(root);
  const q = <E extends Element = HTMLElement>(s: string) => root.querySelector(s) as unknown as E;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const upper = q(".work-upper");
  const lower = q(".work-lower");
  const cal = q(".cal");
  Object.assign(cal.style, { left: `${C.x}px`, top: `${C.y}px`, width: `${C.w}px`, height: `${C.h}px` });
  gsap.set(qa(".btn-sheen"), { xPercent: -130 });

  const W = T.work;
  const reply = share.reply as HTMLElement;
  const intent = share.intent as HTMLElement;
  const from = share.intentRect as { x: number; y: number; w: number; h: number };
  tl.set(root, { autoAlpha: 1 }, W - 0.4);

  // ── calendar glides in; the world pans with it ─────────────────────────
  tl.fromTo(cal, { x: 760, z: -320, rotationY: -26, opacity: 0, filter: "blur(12px)" }, { x: 0, z: 0, rotationY: 0, opacity: 1, filter: "blur(0px)", duration: 1.6, ease: "cine" }, W - 0.35);
  cue("whoosh", W - 0.5, 1.8, 0.6);
  tl.to(cam, { x: 420, duration: 1.8, ease: "cineInOut" }, W - 0.4);
  tl.add(titleIn(q(".cal-title"), { stagger: 0.05, dur: 1, blur: 8, y: 10, glow: false }), W + 0.1);
  tl.fromTo(qa(".cal-hline"), { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: "cine", stagger: 0.03 }, W + 0.15);
  tl.fromTo(qa(".cal-vline"), { scaleY: 0 }, { scaleY: 1, duration: 1.0, ease: "cine", stagger: 0.05 }, W + 0.2);
  tl.fromTo(qa(".cal-hour"), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.03 }, W + 0.25);
  tl.fromTo(qa(".cal-day"), { opacity: 0, y: 10, filter: "blur(5px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.06 }, W + 0.25);
  tl.fromTo(".cal-today", { opacity: 0 }, { opacity: 1, duration: 1.2 }, W + 0.5);
  tl.fromTo(".cal-now", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: "cine" }, W + 0.7);
  const evs = qa(".ev");
  tl.fromTo(
    evs,
    { opacity: 0, scale: 0.86, filter: "blur(6px)", transformOrigin: "0% 0%" },
    { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "spring", stagger: { each: 0.05, from: "start" } },
    W + 0.45,
  );

  // ── the sentence becomes a meeting ─────────────────────────────────────
  const fly = q(".fly");
  const f0 = W + 1.45;
  const fdur = 1.35;
  const to = { x: C.x + pr.x, y: C.y + pr.y, w: pr.w, h: pr.h };
  const sx = from.x + from.w / 2;
  const sy = from.y + from.h / 2;
  const ex = to.x + to.w / 2;
  const ey = to.y + to.h / 2;
  const cx = (sx + ex) / 2 - 40;
  const cy = Math.min(sy, ey) - 260;
  const bez = (p: number) => ({
    x: (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * cx + p * p * ex,
    y: (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * cy + p * p * ey,
  });
  gsap.set(fly, { width: from.w, height: from.h, x: from.x, y: from.y, z: 6, visibility: "hidden" });
  const fp = { p: 0 };
  const ease = gsap.parseEase("cineInOut");
  tl.set(fly, { visibility: "visible" }, f0);
  tl.to(intent, { color: "rgba(196,212,255,0.45)", backgroundSize: "100% 100%", duration: 0.4 }, f0);
  tl.fromTo(fly, { scale: 1 }, { scale: 1.08, duration: 0.35, ease: "sine.out" }, f0);
  tl.to(
    fp,
    {
      p: 1,
      duration: fdur,
      ease: "none",
      onUpdate: () => {
        const e = ease(fp.p);
        const o = bez(e);
        const w = from.w + (to.w - from.w) * e;
        const h = from.h + (to.h - from.h) * e;
        gsap.set(fly, { x: o.x - w / 2, y: o.y - h / 2, width: w, height: h, rotation: Math.sin(e * Math.PI) * -6 });
      },
    },
    f0,
  );
  tl.fromTo(".fly-a", { opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(6px)", duration: fdur * 0.45, ease: "sine.in" }, f0 + 0.15);
  tl.fromTo(".fly-b", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: fdur * 0.45, ease: "sine.out" }, f0 + fdur * 0.5);
  tl.fromTo(fly, { "--fill": 0 }, { "--fill": 1, duration: fdur * 0.6, ease: "sine.inOut" }, f0 + fdur * 0.3);
  cue("riser", f0, fdur, 0.5);
  cue("chime", f0 + fdur, undefined, 0.75);
  trail(f0, fdur, (p) => bez(ease(p)), 110, 71);
  const land = f0 + fdur;
  tl.to(fly, { scale: 1, duration: 0.7, ease: "spring" }, land - 0.05);
  tl.fromTo(".slot-ripple", { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 1.35, duration: 0.9, ease: "cine", immediateRender: false }, land);
  burst(land, 0.8, ex, ey, 46, 150, 72, 0.5);

  // ── the conflict resolves itself ───────────────────────────────────────
  const kickEl = q('.ev[data-id="kickoff"]');
  const k0 = land + 0.25;
  tl.to(kickEl, { boxShadow: "0 0 0 1.5px rgba(255,140,160,0.8), 0 0 24px rgba(255,120,140,0.45)", duration: 0.3 }, k0);
  tl.fromTo(".ev-ghost", { opacity: 0 }, { opacity: 1, duration: 0.4 }, k0 + 0.35);
  cue("whoosh", k0 + 0.4, 0.9, 0.3);
  tl.to(kickEl, { y: 2 * HOUR, scale: 1.04, duration: 0.95, ease: "cineInOut" }, k0 + 0.4);
  tl.to(kickEl, { scale: 1, boxShadow: "0 0 0 1px rgba(160,140,255,0.3), 0 0 0px rgba(0,0,0,0)", duration: 0.6, ease: "cine" }, k0 + 1.3);
  tl.set(kickEl.querySelector("span"), { textContent: "16:00 – 17:00" }, k0 + 0.95);
  tl.to(".ev-ghost", { opacity: 0, duration: 0.6 }, k0 + 1.4);
  tl.fromTo(".ev-tag", { opacity: 0, y: -8, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "spring" }, k0 + 1.3);
  tl.to(reply, { x: -120, opacity: 0, filter: "blur(10px)", duration: 0.9, ease: "exit" }, k0 + 0.6);
  tl.set(share.inboxRoot as HTMLElement, { autoAlpha: 0 }, k0 + 1.6);

  // ── the camera tilts down: tasks and agents ────────────────────────────
  const v0 = W + 4.7;
  // the meeting block rides with the calendar
  tl.to([upper, fly], { y: "-=980", rotationX: 16, opacity: 0.2, filter: "blur(10px)", duration: 1.35, ease: "cineInOut" }, v0);
  tl.fromTo(lower, { y: 980, rotationX: -12 }, { y: 0, rotationX: 0, duration: 1.35, ease: "cineInOut" }, v0);
  cue("whoosh", v0, 1.4, 0.7);
  tl.to(cam, { y: 700, duration: 1.4, ease: "cineInOut" }, v0);
  tl.set([upper, fly], { autoAlpha: 0 }, v0 + 1.4);

  const tk = q(".tasks");
  const rowsEls = qa(".task:not(.task-new)");
  const newRow = q(".task-new");
  rowsEls.forEach((r, i) => gsap.set(r, { y: 84 + i * 70 }));
  gsap.set(newRow, { y: 84 + 2 * 70 });
  tl.fromTo(rowsEls, { opacity: 0, x: -16, filter: "blur(6px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.07, ease: "cine" }, v0 + 0.8);
  tl.fromTo(".tk-head > *", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05 }, v0 + 0.7);

  // the renewal is done — it was sent minutes ago
  const renew = q('.task[data-id="renew"]');
  const c0 = v0 + 1.55;
  tl.to(renew.querySelector(".tk-box"), { backgroundColor: "#4d7cff", boxShadow: "0 0 0 1px #7ea4ff, 0 0 18px rgba(80,130,255,0.7)", duration: 0.3 }, c0);
  cue("tick", c0, undefined, 0.6);
  tl.fromTo(renew.querySelector(".tk-box path"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.45, ease: "cine" }, c0 + 0.05);
  tl.fromTo(renew.querySelector(".tk-strike"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "cineInOut" }, c0 + 0.2);
  tl.to(renew.querySelector(".tk-text"), { opacity: 0.45, duration: 0.5 }, c0 + 0.4);
  tl.set(renew.querySelector(".tk-meta"), { textContent: "Done · replied 09:14 by ASTRYA" }, c0 + 0.4);

  // the meeting appears as a task, pushing the rest down
  const n0 = c0 + 0.55;
  rowsEls.slice(2).forEach((r, i) => tl.to(r, { y: 84 + (3 + i) * 70, duration: 0.7, ease: "cineInOut" }, n0));
  tl.fromTo(newRow, { opacity: 0, scaleY: 0.4, filter: "blur(8px)", transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, filter: "blur(0px)", duration: 0.8, ease: "spring" }, n0 + 0.2);
  tl.fromTo(newRow, { backgroundColor: "rgba(110,150,255,0.18)" }, { backgroundColor: "rgba(110,150,255,0.0)", duration: 1.4 }, n0 + 0.4);
  tl.set(".tk-count", { textContent: "4 open · 1 done" }, n0 + 0.2);

  // finance agent works through its steps
  const ag = q(".agent");
  const a0 = v0 + 1.35;
  tl.fromTo(ag, { x: 260, z: -380, rotationY: 28, opacity: 0, filter: "blur(12px)" }, { x: 0, z: 0, rotationY: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "cine" }, a0);
  tl.fromTo(".ag-orbit", { rotation: 0 }, { rotation: 720, duration: 5.5, ease: "none" }, a0);
  tl.fromTo(".ag-sub", { backgroundPosition: "100% 0" }, { backgroundPosition: "-100% 0", duration: 1.1, ease: "none", repeat: 3 }, a0 + 0.3);
  const steps = qa(".ag-step");
  tl.fromTo(steps, { opacity: 0, x: 14 }, { opacity: 0.35, x: 0, duration: 0.6, stagger: 0.06 }, a0 + 0.5);
  const stepDur = [0.6, 0.65, 0.55];
  let st = a0 + 0.9;
  steps.forEach((s, i) => {
    const sp = s.querySelector(".sp")!;
    const ok = s.querySelector(".ok")!;
    tl.to(s, { opacity: 1, duration: 0.3 }, st);
    tl.fromTo(sp, { opacity: 0, rotation: 0 }, { opacity: 1, rotation: 360, duration: stepDur[i], ease: "none" }, st);
    tl.fromTo(sp.querySelector("circle"), { drawSVG: "0% 25%" }, { drawSVG: "40% 90%", duration: stepDur[i], ease: "none" }, st);
    tl.to(sp, { opacity: 0, duration: 0.15 }, st + stepDur[i]);
    cue("tick", st + stepDur[i], undefined, 0.55);
    tl.fromTo(ok, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.45, ease: "spring" }, st + stepDur[i]);
    tl.fromTo(ok.querySelector("path"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.35, ease: "cine" }, st + stepDur[i]);
    tl.fromTo(s.querySelector(".ag-r"), { opacity: 0, x: 8 }, { opacity: 1, x: 0, duration: 0.4 }, st + stepDur[i] - 0.1);
    tl.to(".ag-bar i", { scaleX: (i + 1) / 3, duration: 0.5, ease: "cine" }, st + stepDur[i]);
    tl.set(".ag-count", { textContent: `${i + 1} / 3` }, st + stepDur[i]);
    if (i === 1) {
      const amt = s.querySelector(".ag-amount") as HTMLElement;
      const o = { v: 0 };
      tl.to(o, { v: 4820, duration: 0.6, ease: "cine", onUpdate: () => (amt.textContent = `CHF ${Math.round(o.v).toLocaleString("en-US")}`) }, st + stepDur[i] - 0.1);
    }
    st += stepDur[i] + 0.12;
  });
  tl.set(".ag-sub", { textContent: "Invoice 4821 · resolved" }, st);
  tl.fromTo(".ag-foot .btn", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 }, st - 0.2);
  tl.fromTo(".ag-btn .btn-sheen", { xPercent: -130 }, { xPercent: 130, duration: 0.9, ease: "cineInOut", immediateRender: false }, st + 0.3);

  // the overdue task resolves
  const inv = q('.task[data-id="inv"]');
  const chip = inv.querySelector(".tk-chip") as HTMLElement;
  tl.to(chip, { opacity: 0, scale: 0.8, filter: "blur(4px)", duration: 0.25 }, st);
  tl.set(chip, { textContent: "Resolved", attr: { class: "chip tk-chip green" } }, st + 0.26);
  tl.to(chip, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "spring" }, st + 0.28);
  tl.to(inv.querySelector(".tk-box"), { backgroundColor: "#4d7cff", boxShadow: "0 0 0 1px #7ea4ff, 0 0 18px rgba(80,130,255,0.7)", duration: 0.3 }, st + 0.2);
  tl.fromTo(inv.querySelector(".tk-box path"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.4 }, st + 0.25);

  // other agents report in — the pace peaks
  const pills = [q(".p-cal"), q(".p-log"), q(".p-docs")];
  pills.forEach((p, i) => {
    const at = a0 + 2.4 + i * 0.32;
    tl.fromTo(p, { opacity: 0, z: -500, scale: 0.7, filter: "blur(14px)", rotationX: 30 }, { opacity: 1, z: 0, scale: 1, filter: "blur(0px)", rotationX: 0, duration: 1.0, ease: "cine" }, at);
    cue("tick", at + 0.7, undefined, 0.5);
    tl.fromTo(p.querySelector(".pl-ok"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "spring" }, at + 0.7);
  });
  tl.add(titleIn(q(".work-title"), { stagger: 0.08, dur: 1.1, track: ["0.08em", "-0.02em"] }), a0 + 2.45);
  tl.to(atmos, { halo: 0.85, leak: 0.4, duration: 3 }, W + 4.8);

  // hand the cards to the CORE scene: they become its orbiting nodes
  share.nodesFrom = {
    tasks: tk,
    finance: ag,
    calendar: pills[0],
    logistics: pills[1],
    docs: pills[2],
  };
  share.workTitle = q(".work-title");
  share.workRoot = root;
  share.workRects = Object.fromEntries(Object.entries(share.nodesFrom as Record<string, HTMLElement>).map(([k, el]) => [k, box(el, root)]));
}
