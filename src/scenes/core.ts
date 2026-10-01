import { gsap } from "../core/gsap";
import { camera, html, atmos, share, onResize, W, H } from "../core/stage";
import { onFrame, cue } from "../core/clock";
import { titleIn, titleOut } from "../core/text";
import { burst, shockwave } from "../core/fx";
import { createOrb } from "../core/orb";
import { icon } from "../core/icons";
import { T } from "../timing";
import "./core.css";

const CX = 960;
const CY = 500;
const TILT = (-7 * Math.PI) / 180;
const RINGS = [
  { rx: 360, ry: 118 },
  { rx: 565, ry: 186 },
  { rx: 770, ry: 252 },
];

interface NodeDef {
  key: string;
  label: string;
  icon: string;
  ring: number;
  a0: number;
  w: number;
}
const NODES: NodeDef[] = [
  { key: "email", label: "Email", icon: icon.mail, ring: 1, a0: 3.5, w: 0.2 },
  { key: "calendar", label: "Calendar", icon: icon.calendar, ring: 2, a0: 5.2, w: 0.15 },
  { key: "finance", label: "Finance", icon: icon.finance, ring: 1, a0: 0.25, w: 0.2 },
  { key: "tasks", label: "Tasks", icon: icon.tasks, ring: 2, a0: 2.55, w: 0.15 },
  { key: "docs", label: "Docs", icon: icon.doc, ring: 0, a0: 1.75, w: 0.26 },
  { key: "logistics", label: "Logistics", icon: icon.truck, ring: 0, a0: 4.9, w: 0.26 },
];

/** Shared camera/orbit state, tweened by GSAP, read by the per-frame layout. */
const sys = { spin: 0, tilt: 1, radius: 1, lines: 0, pulses: 0, nodes: 1 };

function orbitPos(n: NodeDef, t: number) {
  const r = RINGS[n.ring];
  const a = n.a0 + n.w * (t - T.core) + sys.spin * (n.ring === 0 ? 1.6 : n.ring === 1 ? 1.2 : 1);
  const x0 = Math.cos(a) * r.rx * sys.radius;
  const y0 = Math.sin(a) * r.ry * sys.radius * sys.tilt;
  return {
    x: CX + x0 * Math.cos(TILT) - y0 * Math.sin(TILT),
    y: CY + x0 * Math.sin(TILT) + y0 * Math.cos(TILT),
    depth: Math.sin(a), // +1 = nearest the camera
  };
}

export function buildCore(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-core">
    <div class="core-sys">
      <svg class="core-orbits" viewBox="0 0 ${W} ${H}">
        <g transform="rotate(-7 ${CX} ${CY})">
          ${RINGS.map((r, i) => `<ellipse class="orbit o${i}" cx="${CX}" cy="${CY}" rx="${r.rx}" ry="${r.ry}"/>`).join("")}
        </g>
      </svg>
      <canvas class="core-lines"></canvas>
      <div class="orb-holder"></div>
      ${NODES.map(
        (n) => `<div class="node" data-key="${n.key}"><div class="node-disc">${n.icon}</div><div class="node-label mono">${n.label}</div></div>`,
      ).join("")}
    </div>
    <h2 class="core-title">One intelligence.</h2>
    <p class="core-sub">Connected to everything you do.</p>
  </section>`);
  camera.appendChild(root);
  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const sysEl = q(".core-sys");
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".node"));
  const orb = createOrb(900, document.documentElement.classList.contains("render") ? 720 : 540);
  q(".orb-holder").appendChild(orb.canvas);
  gsap.set(".orb-holder", { x: CX - 450, y: CY - 450 });
  gsap.set(sysEl, { transformOrigin: `${CX}px ${CY}px` });
  share.orb = orb;
  share.coreSys = sysEl;
  share.coreRoot = root;
  share.coreCenter = { x: CX, y: CY };

  const lines = q(".core-lines") as unknown as HTMLCanvasElement;
  const lctx = lines.getContext("2d")!;
  let k = 1;
  onResize((s) => {
    k = Math.min(1.5, Math.max(0.6, s * (window.devicePixelRatio || 1)));
    lines.width = Math.round(W * k);
    lines.height = Math.round(H * k);
  });

  const C0 = T.core;
  const land = C0 - 0.15; // cards arrive on their orbits

  // ── per-frame layout: orbits, depth sorting, connection lines, pulses ──
  let visible = false;
  onFrame((t) => {
    const on = t > C0 - 1.8 && t < T.light + 1.2;
    if (!on) {
      if (visible) {
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lines.width, lines.height);
        orb.render(-1);
      }
      visible = false;
      return;
    }
    visible = true;
    orb.render(t);
    lctx.setTransform(k, 0, 0, k, 0, 0);
    lctx.clearRect(0, 0, W, H);
    lctx.globalCompositeOperation = "lighter";
    NODES.forEach((n, i) => {
      const p = orbitPos(n, t);
      const el = nodes[i];
      const sc = 0.78 + 0.22 * ((p.depth + 1) / 2);
      const behind = p.depth < -0.05 && Math.abs(p.x - CX) < 260;
      el.style.transform = `translate3d(${p.x - 36}px, ${p.y - 36}px, 0) scale(${sc * (0.35 + 0.65 * sys.radius)})`;
      el.style.zIndex = behind ? "1" : "5";
      el.style.filter = behind ? "brightness(0.55) blur(1.2px)" : "none";

      // connection line node → core
      const la = sys.lines * (0.25 + 0.35 * ((p.depth + 1) / 2)) * (behind ? 0.4 : 1);
      if (la > 0.002) {
        const g = lctx.createLinearGradient(p.x, p.y, CX, CY);
        g.addColorStop(0, `rgba(150,185,255,${la})`);
        g.addColorStop(1, `rgba(150,185,255,0)`);
        lctx.strokeStyle = g;
        lctx.lineWidth = 1.2;
        lctx.beginPath();
        lctx.moveTo(p.x, p.y);
        lctx.lineTo(CX, CY);
        lctx.stroke();
      }
      // data pulses travelling into the core, faster as the story accelerates
      if (sys.pulses > 0.01) {
        const speed = 0.45 + sys.pulses * 0.9;
        for (let j = 0; j < 3; j++) {
          const f = (t * speed + i * 0.37 + j / 3) % 1;
          const x = p.x + (CX - p.x) * f;
          const y = p.y + (CY - p.y) * f;
          const a = Math.sin(f * Math.PI) * sys.pulses * (behind ? 0.3 : 0.9);
          const rr = 2.2 + (1 - f) * 1.5;
          const grd = lctx.createRadialGradient(x, y, 0, x, y, rr * 4);
          grd.addColorStop(0, `rgba(235,242,255,${a})`);
          grd.addColorStop(0.3, `rgba(130,170,255,${a * 0.5})`);
          grd.addColorStop(1, "rgba(80,120,255,0)");
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
  Object.entries(from).forEach(([key, card], i) => {
    const n = NODES.find((d) => d.key === key)!;
    const p = orbitPos({ ...n }, land);
    const at = m0 + i * 0.07;
    const content = Array.from(card.children);
    const energy = html(`<div class="morph-energy"></div>`);
    card.appendChild(energy);
    tl.to(content, { opacity: 0, filter: "blur(6px)", duration: 0.35, ease: "sine.in" }, at);
    tl.fromTo(energy, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "sine.inOut" }, at + 0.1);
    tl.to(
      card,
      {
        left: p.x - 36,
        top: p.y - 36,
        width: 72,
        height: 72,
        padding: 0,
        borderRadius: 36,
        duration: 1.35,
        ease: "cineInOut",
      },
      at,
    );
    tl.to(card, { boxShadow: "inset 0 0 0 1px rgba(170,200,255,0.6), 0 0 46px rgba(90,140,255,0.8)", duration: 1.2, ease: "sine.inOut" }, at);
    tl.fromTo(card, { filter: "blur(0px) brightness(1)" }, { filter: "blur(0px) brightness(1.55)", duration: 1.2, ease: "sine.inOut", immediateRender: false }, at);
    tl.to(card, { opacity: 0, duration: 0.25, ease: "none" }, land + 0.05);
  });
  tl.set(share.workRoot as HTMLElement, { autoAlpha: 0 }, land + 0.35);

  cue("riser", m0, 1.5, 0.7);
  // the core ignites as the cards arrive
  const ig = C0 - 0.75;
  sys.radius = 1;
  tl.fromTo(orb.state, { reveal: 0, energy: 2.2 }, { reveal: 1, energy: 1, duration: 1.6, ease: "cine" }, ig);
  tl.fromTo(".orb-holder", { scale: 0.2 }, { scale: 1, duration: 1.8, ease: "cine" }, ig);
  cue("hit", ig + 0.1, undefined, 1.0);
  shockwave(ig + 0.1, 1.6, CX, CY, 1000, 0.36, 3);
  burst(ig + 0.05, 1.5, CX, CY, 140, 700, 81, 0.4);
  tl.to(atmos, { core: 0.9, halo: 0.5, leak: 0.15, duration: 1.2, ease: "sine.out" }, ig);
  tl.to(atmos, { core: 0.6, duration: 3, ease: "sine.inOut" }, ig + 1.4);

  // nodes take over from the cards
  const emailNode = root.querySelector('.node[data-key="email"]') as HTMLElement;
  tl.fromTo(nodes.filter((n) => n !== emailNode), { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, land);
  tl.fromTo(emailNode, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "cine" }, land + 0.25);
  tl.fromTo(".node-label", { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 }, land + 0.4);
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
  tl.to(".node-label", { opacity: 0, duration: 0.4 }, v);
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
