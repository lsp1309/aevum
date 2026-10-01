import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, atmos, box, share, CY } from "../core/stage";
import { titleIn, chars, words } from "../core/text";
import { Cursor } from "../core/cursor";
import { icon, ringMark } from "../core/icons";
import { T } from "../timing";
import "./morning.css";

/** Timeline axis of the "Today" strip. */
const AX = { x: 60, w: 1300, from: 8, to: 18 };
const hx = (h: number) => AX.x + ((h - AX.from) / (AX.to - AX.from)) * AX.w;
const ED = { x: 400, y: 128, w: 1120, h: 740 };

const BLOCKS = [
  { s: 9.5, e: 10.5, t: "Ops weekly", c: "muted" },
  { s: 10.5, e: 12.5, t: "Focus · Q4 launch plan", c: "focus" },
  { s: 14.5, e: 15, t: "Pricing call", c: "blue" },
  { s: 16, e: 17, t: "Northline kickoff", c: "violet" },
  { s: 17, e: 17.5, t: "Priya", c: "muted" },
];

export function buildMorning(tl: gsap.core.Timeline) {
  const spark = "M0 56 L40 50 L80 52 L120 40 L160 44 L200 30 L240 34 L280 20 L320 12 L360 6";
  const root = html(`<section class="scene" id="s-morning">
    <div class="mo-world">
      <div class="mo-date mono">Thursday · 1 October · 09:05</div>
      <h1 class="mo-hello">Good morning.</h1>
      <p class="mo-sub">Two things need you today. <span class="mo-handled">ASTRYA handled the rest.</span></p>

      <div class="stat card s1">
        <div class="st-label">Emails triaged</div>
        <div class="st-num"><span class="n">0</span></div>
        <span class="chip green st-delta">+18% this week</span>
        <svg class="spark" viewBox="0 0 360 60" preserveAspectRatio="none">
          <defs><linearGradient id="spf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d8cff" stop-opacity=".35"/><stop offset="1" stop-color="#5d8cff" stop-opacity="0"/></linearGradient></defs>
          <path class="spark-fill" d="${spark} L360 60 L0 60 Z" fill="url(#spf)"/>
          <path class="spark-line" d="${spark}" fill="none" stroke="#8fb0ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="stat card s2">
        <div class="st-label">Time given back</div>
        <div class="st-num"><span class="n">0h 00m</span></div>
        <span class="chip st-delta">this week</span>
        <div class="bars">${[38, 52, 30, 64, 48, 72, 86].map((h) => `<i style="height:${h}%"></i>`).join("")}</div>
      </div>
      <div class="stat card s3">
        <div class="st-label">Closed by agents</div>
        <div class="st-num"><span class="n">0</span><small>/ 15</small></div>
        <span class="chip violet st-delta">${icon.sparkle}4 agents</span>
        <svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" class="ring-bg"/><circle cx="50" cy="50" r="40" class="ring-fg" transform="rotate(-90 50 50)"/></svg>
      </div>

      <div class="today card">
        <div class="td-head"><span class="td-title">Today</span><span class="chip blue">${icon.shield}Focus time protected</span></div>
        <div class="td-axis">${Array.from({ length: 11 }, (_, i) => `<span style="left:${hx(8 + i)}px">${String(8 + i).padStart(2, "0")}</span>`).join("")}</div>
        <div class="td-track">${Array.from({ length: 11 }, (_, i) => `<i style="left:${hx(8 + i)}px"></i>`).join("")}</div>
        ${BLOCKS.map(
          (b) =>
            `<div class="blk blk-${b.c}" style="left:${hx(b.s)}px;width:${hx(b.e) - hx(b.s) - 6}px">${b.c === "focus" ? icon.shield : ""}<span>${b.t}</span></div>`,
        ).join("")}
        <div class="td-now" style="left:${hx(9 + 5 / 60)}px"><i></i></div>
      </div>
    </div>

    <div class="editor card">
      <div class="ed-skin">${icon.shield}<span>Focus · Q4 launch plan</span></div>
      <div class="ed-bar">
        <span class="ed-crumb">Northline <i>/</i> Launch <i>/</i> <b>Q4 Launch Plan</b></span>
        <span class="chip blue ed-focus"><svg class="ed-prog" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/></svg>Focus · 1h 54m left</span>
      </div>
      <div class="ed-doc">
        <div class="ed-kicker mono">Draft</div>
        <h2 class="ed-title">Q4 Launch Plan</h2>
        <p class="ed-p1">Northline opens in Geneva, Zurich and Milan. The first market proves the model; the next two scale it.</p>
        <div class="ed-ms">
          <div class="ms-h mono">Milestones</div>
          <div class="ms-row"><span class="ms-dot"></span><b>Geneva</b><span class="ms-bar"><i style="width:72%"></i></span><span class="ms-d mono">March</span></div>
          <div class="ms-row"><span class="ms-dot"></span><b>Zurich</b><span class="ms-bar"><i style="width:38%"></i></span><span class="ms-d mono">May</span></div>
          <div class="ms-row"><span class="ms-dot"></span><b>Milan</b><span class="ms-bar"><i style="width:14%"></i></span><span class="ms-d mono">September</span></div>
        </div>
        <p class="ed-p2"><span class="ed-typed"></span><span class="ed-caret"></span><span class="ed-ghost">ch the first market by March, with the whole team on it.</span><span class="ed-caret ed-caret2"></span><span class="kbd ed-tab">Tab</span></p>
      </div>
      <div class="ed-ctx card soft">
        <div class="ctx-head">${ringMark("ctx", -28).replace('class="ring-mark ctx"', 'class="ring-mark mini-ring"')}<span>Context</span></div>
        <div class="ctx-item">${icon.calendar}<div><b>Pricing call · Eva</b><span>Thu 14:30</span></div></div>
        <div class="ctx-item">${icon.file}<div><b>Q4 allocation</b><span>Priya · due Fri</span></div></div>
        <div class="ctx-item">${icon.doc}<div><b>Supply agreement</b><span>Renewed today</span></div></div>
      </div>
    </div>
  </section>`);
  camera.appendChild(root);
  const calm = html(`<div class="calm-toast card soft"><span class="ct-ico">${icon.check}</span><span>3 new messages handled</span><span class="ct-dim">· nothing needs you</span></div>`);
  overlay.appendChild(calm);

  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const world = q(".mo-world");
  const editor = q(".editor");
  const cursor = new Cursor(root);
  const M = T.morning;

  // focus block geometry (stage coords) for the zoom + morph
  const focus = qa(".blk")[1];
  const fb = box(focus, root);
  gsap.set(world, { transformOrigin: `${fb.cx}px ${fb.cy}px` });

  tl.set(root, { autoAlpha: 1 }, M - 1.2);
  // revealed through the opening slit
  tl.fromTo(root, { clipPath: `inset(${CY}px 0px ${1080 - CY}px 0px)` }, { clipPath: "inset(0px 0px 0px 0px)", duration: 1.0, ease: "cineInOut" }, M - 1.15);
  tl.fromTo(world, { scale: 1.08, filter: "blur(6px)" }, { scale: 1, filter: "blur(0px)", duration: 1.8, ease: "cine" }, M - 1.15);
  tl.to("#vignette", { opacity: 1, duration: 0.6 }, M - 1.2);

  // greeting
  const hello = q(".mo-hello");
  const hc = chars(hello);
  tl.fromTo(
    hc,
    { opacity: 0, filter: "blur(16px)", y: 30, rotationX: -70, transformOrigin: "50% 100% -30px" },
    { opacity: 1, filter: "blur(0px)", y: 0, rotationX: 0, duration: 1.5, ease: "cine", stagger: 0.035 },
    M - 0.55,
  );
  tl.fromTo(hello, { letterSpacing: "0.02em" }, { letterSpacing: "-0.035em", duration: 2.0, ease: "cine" }, M - 0.55);
  const sw = words(q(".mo-sub"));
  tl.fromTo(sw, { opacity: 0, filter: "blur(10px)", y: 12 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: 1.1, stagger: 0.05, ease: "cine" }, M + 0.2);
  tl.fromTo(".mo-handled", { backgroundPosition: "100% 0" }, { backgroundPosition: "-100% 0", duration: 1.6, ease: "sine.inOut" }, M + 1.0);
  tl.fromTo(".mo-date", { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 1 }, M + 0.1);

  // stats rise from depth, numbers count
  const stats = qa(".stat");
  tl.fromTo(stats, { z: -260, y: 50, rotationX: 22, opacity: 0, filter: "blur(10px)" }, { z: 0, y: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", duration: 1.3, ease: "cine", stagger: 0.12 }, M + 0.6);
  cue("tick", M + 0.7, undefined, 0.35);
  cue("tick", M + 0.82, undefined, 0.35);
  cue("tick", M + 0.94, undefined, 0.35);
  const n1 = q(".s1 .n");
  const n2 = q(".s2 .n");
  const n3 = q(".s3 .n");
  const o = { a: 0, b: 0, c: 0 };
  tl.to(o, { a: 47, duration: 1.6, ease: "cine", onUpdate: () => (n1.textContent = String(Math.round(o.a))) }, M + 1.0);
  tl.to(o, {
    b: 220,
    duration: 1.6,
    ease: "cine",
    onUpdate: () => {
      const m = Math.round(o.b);
      n2.textContent = `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
    },
  }, M + 1.12);
  tl.to(o, { c: 12, duration: 1.6, ease: "cine", onUpdate: () => (n3.textContent = String(Math.round(o.c))) }, M + 1.24);
  tl.fromTo(".spark-line", { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.6, ease: "cineInOut" }, M + 1.0);
  tl.fromTo(".spark-fill", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.6, ease: "cineInOut" }, M + 1.0);
  tl.fromTo(".bars i", { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: "spring", stagger: 0.06 }, M + 1.15);
  tl.fromTo(".ring-fg", { drawSVG: "0%" }, { drawSVG: "80%", duration: 1.6, ease: "cineInOut" }, M + 1.25);
  tl.fromTo(".st-delta", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6, ease: "spring", stagger: 0.1 }, M + 2.0);

  // the day, protected
  const today = q(".today");
  tl.fromTo(today, { z: -240, y: 60, rotationX: 18, opacity: 0, filter: "blur(10px)" }, { z: 0, y: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", duration: 1.3, ease: "cine" }, M + 1.4);
  tl.fromTo(".td-axis span, .td-track i", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.02 }, M + 1.8);
  tl.fromTo(qa(".blk"), { opacity: 0, scaleX: 0.3, filter: "blur(6px)", transformOrigin: "0% 50%" }, { opacity: 1, scaleX: 1, filter: "blur(0px)", duration: 0.9, ease: "cine", stagger: 0.09 }, M + 2.0);
  tl.fromTo(".td-now", { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.7, ease: "spring" }, M + 2.4);
  tl.fromTo(focus, { boxShadow: "0 0 0 1px rgba(150,185,255,0.4), 0 0 0px rgba(90,140,255,0)" }, { boxShadow: "0 0 0 1px rgba(170,200,255,0.8), 0 0 36px rgba(90,140,255,0.7)", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: 1 }, M + 2.8);

  // the user steps into their focus block
  const c0 = M + 3.4;
  cursor.enter(tl, c0, { x: 1500, y: 1030 }, { x: fb.cx + 40, y: fb.cy }, 1.0);
  cursor.wrap(tl, c0 + 0.85, fb.w, fb.h, 12, focus);
  tl.to(focus, { scale: 1.04, duration: 0.5, ease: "spring" }, c0 + 0.85);
  cue("click", c0 + 1.3);
  cursor.press(tl, c0 + 1.3);
  cursor.unwrap(tl, c0 + 1.45);
  tl.to(cursor.el, { opacity: 0, duration: 0.3 }, c0 + 1.5);

  // ── T: zoom into the block — it opens into the document ──────────────
  const z0 = c0 + 1.45;
  cue("whoosh", z0, 1.4, 0.7);
  cue("soft", z0 + 1.2, undefined, 0.5);
  tl.to(world, { scale: 2.4, duration: 1.4, ease: "power3.in" }, z0);
  tl.to(world, { opacity: 0, filter: "blur(16px)", duration: 0.9, ease: "power2.in" }, z0 + 0.45);
  gsap.set(editor, { left: fb.x, top: fb.y, width: fb.w, height: fb.h, borderRadius: 10, visibility: "hidden" });
  tl.set(editor, { visibility: "visible" }, z0 + 0.1);
  tl.to(editor, { left: ED.x, top: ED.y, width: ED.w, height: ED.h, borderRadius: 28, duration: 1.35, ease: "glide" }, z0 + 0.1);
  tl.fromTo(".ed-skin", { opacity: 1 }, { opacity: 0, duration: 0.55, ease: "sine.inOut" }, z0 + 0.3);
  tl.fromTo(editor, { boxShadow: "0 0 0 1px rgba(170,200,255,0.6), 0 0 60px rgba(90,140,255,0.8)" }, { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.075), inset 0 0 0 1px rgba(140,170,255,0.11), 0 40px 90px -30px rgba(0,0,0,0.85), 0 0 110px -50px rgba(70,120,255,0.5)", duration: 1.4, ease: "sine.out" }, z0 + 0.3);
  tl.to(atmos, { halo: 0.45, core: 0.15, duration: 2 }, z0);

  // the document writes itself — with you
  const d0 = z0 + 1.2;
  tl.fromTo(".ed-bar > *", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, d0 - 0.2);
  tl.fromTo(".ed-prog circle", { drawSVG: "0%" }, { drawSVG: "78%", duration: 1.4, ease: "cine" }, d0);
  tl.fromTo(".ed-kicker", { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.2em", duration: 1.0 }, d0);
  tl.add(titleIn(q(".ed-title"), { stagger: 0.1, dur: 1.2, track: ["0.06em", "-0.025em"], glow: false }), d0 + 0.05);
  tl.fromTo(".ed-p1", { opacity: 0, y: 14, filter: "blur(6px)", clipPath: "inset(0 0 100% 0)" }, { opacity: 1, y: 0, filter: "blur(0px)", clipPath: "inset(0 0 -20% 0)", duration: 1.1, ease: "cine" }, d0 + 0.4);

  const typed = q(".ed-typed");
  const caret = q(".ed-caret:not(.ed-caret2)");
  const t0 = d0 + 1.3;
  tl.fromTo(caret, { opacity: 0 }, { opacity: 1, duration: 0.1 }, t0 - 0.2);
  "Laun".split("").forEach((_, i) => tl.set(typed, { textContent: "Laun".slice(0, i + 1) }, t0 + i * 0.09));
  const ghost = q(".ed-ghost");
  const gw = words(ghost);
  tl.fromTo(gw, { opacity: 0, filter: "blur(6px)", x: -4 }, { opacity: 1, filter: "blur(0px)", x: 0, duration: 0.5, stagger: 0.035, ease: "cine" }, t0 + 0.55);
  tl.fromTo(".ed-tab", { opacity: 0, scale: 0.8, x: -6 }, { opacity: 1, scale: 1, x: 0, duration: 0.5, ease: "spring" }, t0 + 0.9);
  const acc = t0 + 1.7;
  cue("click", acc, undefined, 0.8);
  cue("sweep", acc + 0.05, 1.0, 0.35);
  tl.to(".ed-tab", { y: 2, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(150,180,255,0.5), 0 0 0 rgba(0,0,0,0.5), 0 0 18px rgba(90,140,255,0.6)", duration: 0.1, ease: "press" }, acc);
  tl.to(".ed-tab", { y: 0, opacity: 0, scale: 0.85, duration: 0.4, ease: "cine" }, acc + 0.15);
  tl.to(ghost, { color: "#eef3ff", duration: 0.5, ease: "sine.out" }, acc + 0.05);
  tl.fromTo(ghost, { backgroundPosition: "260% 0" }, { backgroundPosition: "-160% 0", duration: 1.0, ease: "cineInOut" }, acc + 0.05);
  tl.to(caret, { opacity: 0, width: 0, marginLeft: 0, marginRight: 0, duration: 0.12 }, acc + 0.05);
  tl.fromTo(".ed-caret2", { opacity: 0 }, { opacity: 1, duration: 0.1 }, acc + 0.4);
  tl.to(".ed-caret2", { opacity: 0, duration: 0.18, repeat: 7, yoyo: true, ease: "steps(1)" }, acc + 1.0);

  tl.fromTo(".ed-ms", { opacity: 0, y: 16, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "cine" }, d0 + 0.7);
  tl.fromTo(".ms-row", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.1, ease: "cine" }, d0 + 0.8);
  tl.fromTo(".ms-bar i", { scaleX: 0 }, { scaleX: 1, duration: 1.2, stagger: 0.12, ease: "cine" }, d0 + 1.0);

  // context — the day's threads, connected
  const ctx = q(".ed-ctx");
  tl.fromTo(ctx, { x: 60, opacity: 0, filter: "blur(8px)" }, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "cine" }, acc + 0.6);
  tl.fromTo(".ctx-item", { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: "cine" }, acc + 0.9);

  // the calm: things keep getting handled, quietly
  cue("chime", acc + 1.7, undefined, 0.45);
  tl.fromTo(calm, { y: 40, opacity: 0, filter: "blur(8px)", xPercent: -50 }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "cine" }, acc + 1.6);
  tl.fromTo(calm.querySelector(".ct-ico"), { scale: 0.4 }, { scale: 1, duration: 0.6, ease: "spring" }, acc + 1.8);
  tl.to(calm, { y: 30, opacity: 0, filter: "blur(6px)", duration: 0.7, ease: "exit" }, T.finale - 0.2);

  share.editor = editor;
  share.editorRect = ED;
  share.morningRoot = root;
}
