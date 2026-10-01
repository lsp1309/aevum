import { gsap } from "../core/gsap";
import { camera, html, atmos, share, onResize, W, H, UI_SCALE, toLocal, fmt } from "../core/stage";
import { onFrame, cue } from "../core/clock";
import { titleIn, titleOut } from "../core/text";
import { burst, shockwave, orbitDust } from "../core/fx";
import { createOrb } from "../core/orb";
import { icon } from "../core/icons";
import { T } from "../timing";
import "./core.css";

const CX = W / 2;
const CY = fmt(490, 830);
const NODE = 92; // on-screen node diameter
/** Three orbits, each inclined differently in 3D (screen roll + squash). */
const RINGS = fmt(
  [
    { rx: 330, ry: 112, roll: (-16 * Math.PI) / 180 },
    { rx: 545, ry: 172, roll: (9 * Math.PI) / 180 },
    { rx: 760, ry: 228, roll: (-5 * Math.PI) / 180 },
  ],
  [
    { rx: 265, ry: 120, roll: (-18 * Math.PI) / 180 },
    { rx: 375, ry: 205, roll: (14 * Math.PI) / 180 },
    { rx: 455, ry: 300, roll: (-8 * Math.PI) / 180 },
  ],
);
const ORB_SCALE = fmt(1, 0.78);

interface NodeDef {
  key: string;
  label: string;
  icon: string;
  color: string; // r,g,b
  ring: number;
  a0: number;
  w: number;
}
const NODES: NodeDef[] = [
  { key: "email", label: "Mail", icon: icon.mail, color: "52,217,255", ring: 1, a0: 2.3, w: 0.21 },
  { key: "calendar", label: "Calendar", icon: icon.calendar, color: "160,123,255", ring: 2, a0: 5.7, w: 0.15 },
  { key: "chat", label: "Slack", icon: icon.hash, color: "255,95,196", ring: 1, a0: 0.75, w: 0.21 },
  { key: "finance", label: "Finance", icon: icon.finance, color: "255,157,66", ring: 1, a0: 4.25, w: 0.21 },
  { key: "tasks", label: "Tasks", icon: icon.tasks, color: "79,134,255", ring: 2, a0: 1.75, w: 0.15 },
  { key: "docs", label: "Docs", icon: icon.doc, color: "255,213,77", ring: 0, a0: 0.35, w: 0.28 },
  { key: "logistics", label: "Logistics", icon: icon.truck, color: "63,232,178", ring: 0, a0: 3.5, w: 0.28 },
];

/** Shared camera/orbit state, tweened by GSAP, read by the per-frame layout. */
const sys = { spin: 0, tilt: 1, radius: 1, lines: 0, pulses: 0, trails: 0, labels: 0 };

function orbitAt(n: NodeDef, t: number, back = 0) {
  const r = RINGS[n.ring];
  const a = n.a0 + n.w * (t - T.core) + sys.spin * (n.ring === 0 ? 1.6 : n.ring === 1 ? 1.2 : 1) - back;
  const x0 = Math.cos(a) * r.rx * sys.radius;
  const y0 = Math.sin(a) * r.ry * sys.radius * sys.tilt;
  return {
    x: CX + x0 * Math.cos(r.roll) - y0 * Math.sin(r.roll),
    y: CY + x0 * Math.sin(r.roll) + y0 * Math.cos(r.roll),
    depth: Math.sin(a), // +1 = nearest the camera
  };
}

export function buildCore(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-core">
    <div class="core-sys">
      <svg class="core-orbits" viewBox="0 0 ${W} ${H}">
        ${RINGS.map(
          (r, i) => `<ellipse class="orbit o${i}" cx="${CX}" cy="${CY}" rx="${r.rx}" ry="${r.ry}" transform="rotate(${(r.roll * 180) / Math.PI} ${CX} ${CY})"/>`,
        ).join("")}
      </svg>
      <canvas class="core-lines"></canvas>
      <div class="orb-holder"></div>
      <canvas class="core-front"></canvas>
      ${NODES.map(
        (n) =>
          `<div class="node" data-key="${n.key}" style="--c:${n.color}"><div class="node-disc">${n.icon}</div><div class="node-label">${n.label}</div></div>`,
      ).join("")}
    </div>
    <h2 class="core-title">One intelligence.</h2>
    <p class="core-sub">Connected to everything you do.</p>
  </section>`);
  camera.appendChild(root);
  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const sysEl = q(".core-sys");
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".node"));
  const labels = nodes.map((el) => el.querySelector(".node-label") as HTMLElement);
  const orb = createOrb(900, document.documentElement.classList.contains("render") ? 720 : 540);
  q(".orb-holder").appendChild(orb.canvas);
  gsap.set(".orb-holder", { x: CX - 450, y: CY - 450 });
  gsap.set(sysEl, { transformOrigin: `${CX}px ${CY}px` });
  share.orb = orb;
  share.coreSys = sysEl;
  share.coreRoot = root;
  share.coreCenter = { x: CX, y: CY };

  const lines = q(".core-lines") as unknown as HTMLCanvasElement;
  const front = q(".core-front") as unknown as HTMLCanvasElement;
  const lctx = lines.getContext("2d")!;
  const fctx = front.getContext("2d")!;
  let k = 1;
  onResize((s) => {
    k = Math.min(1.5, Math.max(0.6, s * (window.devicePixelRatio || 1)));
    for (const c of [lines, front]) {
      c.width = Math.round(W * k);
      c.height = Math.round(H * k);
    }
  });

  const C0 = T.core;
  const land = C0 - 0.15; // cards arrive on their orbits

  // ── per-frame layout: orbits, depth, trails, links, pulses ─────────────
  let visible = false;
  const clear = (c: CanvasRenderingContext2D) => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W * k, H * k);
  };
  onFrame((t) => {
    const on = t > C0 - 1.8 && t < T.light + 1.2;
    if (!on) {
      if (visible) {
        clear(lctx);
        clear(fctx);
        orb.render(-1);
      }
      visible = false;
      return;
    }
    visible = true;
    orb.render(t);
    for (const c of [lctx, fctx]) {
      clear(c);
      c.setTransform(k, 0, 0, k, 0, 0);
      c.globalCompositeOperation = "lighter";
      c.lineCap = "round";
    }
    NODES.forEach((n, i) => {
      const p = orbitAt(n, t);
      const el = nodes[i];
      const d01 = (p.depth + 1) / 2; // 0 far … 1 near
      const sc = (0.74 + 0.4 * d01) * (0.3 + 0.7 * sys.radius);
      el.style.transform = `translate3d(${p.x - NODE / 2}px, ${p.y - NODE / 2}px, 0) scale(${sc})`;
      el.style.zIndex = p.depth < 0 ? "1" : "6";
      el.style.filter = p.depth < 0 ? `blur(${(1 - d01) * 1.3}px) brightness(${0.75 + 0.25 * d01})` : "none";
      labels[i].style.opacity = String(sys.labels * Math.min(1, Math.max(0, d01 * 1.5 - 0.2)));

      // luminous trail behind the node, split across the back/front layers
      if (sys.trails > 0.01) {
        let prev = p;
        for (let j = 1; j <= 22; j++) {
          const q2 = orbitAt(n, t, j * 0.03);
          const f = 1 - j / 23;
          const ctx = (prev.depth + q2.depth) / 2 < 0 ? lctx : fctx;
          ctx.strokeStyle = `rgba(${n.color},${0.85 * f * f * sys.trails})`;
          ctx.lineWidth = 11 * f * sc + 0.6;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(q2.x, q2.y);
          ctx.stroke();
          prev = q2;
        }
      }

      // link node → core: gradient from the node's colour into the globe's blue, breathing
      const breathe = 0.65 + 0.35 * Math.sin(t * 2.2 + i * 1.3);
      const la = sys.lines * (0.25 + 0.45 * d01) * breathe;
      if (la > 0.002) {
        const g = lctx.createLinearGradient(p.x, p.y, CX, CY);
        g.addColorStop(0, `rgba(${n.color},${la})`);
        g.addColorStop(0.7, `rgba(140,175,255,${la * 0.45})`);
        g.addColorStop(1, `rgba(140,175,255,0)`);
        lctx.strokeStyle = g;
        lctx.lineWidth = 1.6;
        lctx.beginPath();
        lctx.moveTo(p.x, p.y);
        lctx.lineTo(CX, CY);
        lctx.stroke();
      }
      // data pulses travelling into the core, faster as the story accelerates
      if (sys.pulses > 0.01) {
        const speed = 0.4 + sys.pulses * 0.8;
        for (let j = 0; j < 3; j++) {
          const f = (t * speed + i * 0.37 + j / 3) % 1;
          const x = p.x + (CX - p.x) * f;
          const y = p.y + (CY - p.y) * f;
          const a = Math.sin(f * Math.PI) * sys.pulses * (0.4 + 0.6 * d01);
          const rr = 2.4 + (1 - f) * 1.8;
          const grd = lctx.createRadialGradient(x, y, 0, x, y, rr * 4);
          grd.addColorStop(0, `rgba(255,255,255,${a})`);
          grd.addColorStop(0.3, `rgba(${n.color},${a * 0.7})`);
          grd.addColorStop(1, `rgba(${n.color},0)`);
          lctx.fillStyle = grd;
          lctx.fillRect(x - rr * 4, y - rr * 4, rr * 8, rr * 8);
        }
      }
    });
  });

  tl.set(root, { autoAlpha: 1 }, C0 - 1.8);

  // ── T: every working card collapses into a node on its orbit ──────────
  const from = share.nodesFrom as Record<string, HTMLElement>;
  const m0 = C0 - 1.55;
  tl.add(titleOut(share.workTitle as HTMLElement, { stagger: 0.04, dur: 0.6 }), m0 - 0.05);
  const sw = UI_SCALE.work; // cards live in the (scaled) work scene
  Object.entries(from).forEach(([key, card], i) => {
    const n = NODES.find((d) => d.key === key)!;
    const p = orbitAt(n, land);
    const size = (NODE * (0.74 + 0.4 * ((p.depth + 1) / 2))) / sw;
    const at = m0 + i * 0.07;
    const content = Array.from(card.children);
    const energy = html(`<div class="morph-energy" style="--c:${n.color}"></div>`);
    card.appendChild(energy);
    tl.to(content, { opacity: 0, filter: "blur(6px)", duration: 0.35, ease: "sine.in" }, at);
    tl.fromTo(energy, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "sine.inOut" }, at + 0.1);
    tl.to(
      card,
      {
        left: toLocal(p.x, "x", sw) - size / 2,
        top: toLocal(p.y, "y", sw) - size / 2,
        width: size,
        height: size,
        padding: 0,
        borderRadius: size / 2,
        duration: 1.35,
        ease: "cineInOut",
      },
      at,
    );
    tl.to(card, { boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 46px rgba(${n.color},0.9)`, duration: 1.2, ease: "sine.inOut" }, at);
    tl.to(card, { opacity: 0, duration: 0.25, ease: "none" }, land + 0.05);
  });
  tl.set(share.workRoot as HTMLElement, { autoAlpha: 0 }, land + 0.35);

  cue("riser", m0, 1.5, 0.7);
  // the core ignites as the cards arrive
  const ig = C0 - 0.75;
  sys.radius = 1;
  tl.fromTo(orb.state, { reveal: 0, energy: 2.2 }, { reveal: 1, energy: 1, duration: 1.6, ease: "cine" }, ig);
  tl.fromTo(".orb-holder", { scale: 0.2 }, { scale: ORB_SCALE, duration: 1.8, ease: "cine" }, ig);
  cue("hit", ig + 0.1, undefined, 1.0);
  shockwave(ig + 0.1, 1.6, CX, CY, 1000, 0.36, 3);
  burst(ig + 0.05, 1.5, CX, CY, 140, 700, 81, 0.4);
  tl.to(atmos, { core: 0.9, halo: 0.5, leak: 0.15, duration: 1.2, ease: "sine.out" }, ig);
  tl.to(atmos, { core: 0.6, duration: 3, ease: "sine.inOut" }, ig + 1.4);

  // nodes take over from the cards
  const fresh = nodes.filter((el) => !(el.dataset.key! in from));
  tl.fromTo(nodes.filter((el) => el.dataset.key! in from), { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, land);
  tl.fromTo(fresh, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "cine", stagger: 0.2 }, land + 0.25);
  tl.fromTo(sys, { labels: 0 }, { labels: 1, duration: 0.9, ease: "sine.inOut" }, land + 0.4);
  tl.fromTo(sys, { trails: 0 }, { trails: 1, duration: 1.2, ease: "sine.inOut" }, land);
  orbitDust(land - 0.2, T.light - land + 0.4, CX, CY, 300, 300, 260, 83);
  orbitDust(land, T.light - land + 0.2, CX, CY, fmt(640, 430), fmt(210, 320), 160, 84);
  tl.fromTo(root.querySelectorAll(".orbit"), { drawSVG: "50% 50%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 1, duration: 1.6, ease: "cineInOut", stagger: 0.14 }, land - 0.3);
  tl.fromTo(sys, { lines: 0, pulses: 0 }, { lines: 1, pulses: 0.4, duration: 1.4, ease: "sine.inOut" }, land + 0.3);
  tl.to(sys, { pulses: 1, duration: 5, ease: "sine.in" }, land + 2);

  // camera: drift back then slowly orbit/rise
  tl.fromTo(sysEl, { scale: 1.08 }, { scale: 1, duration: 2.4, ease: "cine" }, m0 + 0.2);
  tl.to(sysEl, { scale: 1.06, duration: T.light - 2.6 - (m0 + 2.6), ease: "sine.inOut" }, m0 + 2.6);
  tl.fromTo(sys, { tilt: 0.8, spin: 0 }, { tilt: 1.25, spin: 0.9, duration: T.light - C0, ease: "sine.inOut" }, C0 - 0.4);

  // headline
  tl.add(titleIn(q(".core-title"), { stagger: 0.12, dur: 1.5, track: ["0.1em", "-0.03em"] }), C0 + 0.9);
  tl.add(titleIn(q(".core-sub"), { stagger: 0.05, dur: 1.2, blur: 10, glow: false }), C0 + 1.6);

  // ── T: everything converges into the core; we push into the light ─────
  const v = T.light - 2.7;
  tl.add(titleOut(q(".core-title"), { stagger: 0.06, dur: 0.7 }), v);
  tl.add(titleOut(q(".core-sub"), { stagger: 0.03, dur: 0.6 }), v + 0.05);
  tl.to(".orbit", { opacity: 0, duration: 1.0, stagger: 0.1 }, v + 0.2);
  tl.to(sys, { labels: 0, duration: 0.4 }, v);
  tl.to(sys, { trails: 0, duration: 1.2, ease: "sine.in" }, v + 0.5);
  tl.to(sys, { radius: 0.06, spin: "+=2.2", duration: 1.7, ease: "suck" }, v + 0.2);
  tl.to(nodes, { opacity: 0, duration: 0.35, ease: "sine.in" }, v + 1.55);
  tl.to(sys, { lines: 2, pulses: 0, duration: 1.4, ease: "sine.in" }, v + 0.2);
  tl.to(sys, { lines: 0, duration: 0.4 }, v + 1.6);
  tl.to(orb.state, { energy: 2.4, duration: 1.6, ease: "sine.in" }, v + 0.3);
  tl.to(atmos, { pull: 0.5, duration: 1.6, ease: "suck" }, v + 0.2);
  tl.to(atmos, { pull: 0, core: 1, duration: 1.0 }, v + 1.9);
  cue("riser", v + 0.2, 2.8, 1.0);
  tl.to(sysEl, { scale: 7.5, duration: 1.45, ease: "expo.in" }, v + 1.55);
  tl.to(orb.state, { flare: 1.6, duration: 1.2, ease: "power2.in" }, v + 1.75);
  tl.set(root, { autoAlpha: 0 }, T.light + 0.4);
}
