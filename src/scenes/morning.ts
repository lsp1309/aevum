import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, overlay, html, share, H, UI_SCALE, placeUI, toStage, fmt } from "../core/stage";
import { chars, words } from "../core/text";
import { icon } from "../core/icons";
import { T } from "../timing";
import "./morning.css";

/** Timeline axis of the "Today" strip. */
const AX = { x: 60, w: fmt(1300, 1020), from: 8, to: 18 };
const hx = (h: number) => AX.x + ((h - AX.from) / (AX.to - AX.from)) * AX.w;

const BLOCKS = [
  { s: 9.5, e: 10.5, t: "Ops weekly", c: "muted" },
  { s: 10.5, e: 12.5, t: "Focus · Q4 launch plan", c: "focus" },
  { s: 14.5, e: 15.5, t: "Pricing call · Luka", c: "blue" },
  { s: 16, e: 17, t: "Northline kickoff", c: "violet" },
  { s: 17, e: 18, t: "Q4 review · Ziyad", c: "muted" },
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

      <div class="mo-today card">
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

  </section>`);
  camera.appendChild(root);
  placeUI(root, UI_SCALE.morning);
  const calm = html(`<div class="calm-toast card soft"><span class="ct-ico">${icon.check}</span><span>3 new messages handled</span><span class="ct-dim">· nothing needs you</span></div>`);
  overlay.appendChild(calm);

  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const world = q(".mo-world");
  const M = T.morning;

  const focus = qa(".blk")[1];
  gsap.set(world, { transformOrigin: "960px 600px" });

  tl.set(root, { autoAlpha: 1 }, M - 1.2);
  // revealed through the opening slit
  tl.fromTo(root, { clipPath: `inset(540px -3000px ${H - 540}px -3000px)` }, { clipPath: "inset(-3000px -3000px -3000px -3000px)", duration: 1.0, ease: "cineInOut" }, M - 1.15);
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
  const today = q(".mo-today");
  tl.fromTo(today, { z: -240, y: 60, rotationX: 18, opacity: 0, filter: "blur(10px)" }, { z: 0, y: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", duration: 1.3, ease: "cine" }, M + 1.4);
  tl.fromTo(".td-axis span, .td-track i", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.02 }, M + 1.8);
  tl.fromTo(qa(".blk"), { opacity: 0, scaleX: 0.3, filter: "blur(6px)", transformOrigin: "0% 50%" }, { opacity: 1, scaleX: 1, filter: "blur(0px)", duration: 0.9, ease: "cine", stagger: 0.09 }, M + 2.0);
  tl.fromTo(".td-now", { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.7, ease: "spring" }, M + 2.4);
  tl.fromTo(focus, { boxShadow: "0 0 0 1px rgba(150,185,255,0.4), 0 0 0px rgba(90,140,255,0)" }, { boxShadow: "0 0 0 1px rgba(170,200,255,0.8), 0 0 36px rgba(90,140,255,0.7)", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: 1 }, M + 2.8);

  // the calm: things keep getting handled, quietly
  const k0 = M + 2.9;
  cue("chime", k0 + 0.1, undefined, 0.45);
  tl.fromTo(calm, { y: 40, opacity: 0, filter: "blur(8px)", xPercent: -50 }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "cine" }, k0);
  tl.fromTo(calm.querySelector(".ct-ico"), { scale: 0.4 }, { scale: 1, duration: 0.6, ease: "spring" }, k0 + 0.2);
  tl.to(calm, { y: 30, opacity: 0, filter: "blur(6px)", duration: 0.6, ease: "exit" }, T.finale - 0.35);
  // a slow push while the calm settles in
  tl.to(world, { scale: 1.035, duration: T.finale - M, ease: "sine.inOut" }, M);

  share.morningWorld = world;
  const sm = UI_SCALE.morning;
  share.morningRect = fmt(
    { x: toStage(250, "x", sm), y: toStage(392, "y", sm), w: 1420 * sm, h: 492 * sm },
    { x: toStage(390, "x", sm), y: toStage(-40, "y", sm), w: 1140 * sm, h: 876 * sm },
  );
  share.morningRoot = root;
}
