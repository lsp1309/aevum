import { gsap } from "../core/gsap";
import { onFrame, cue, rng, clamp } from "../core/clock";
import { camera, html, atmos, share, onResize, W, H, fmt, UI_SCALE } from "../core/stage";
import { titleOut } from "../core/text";
import { shockwave, burst } from "../core/fx";
import { createGlobe } from "../core/globe";
import { icon, avatar } from "../core/icons";
import { PEOPLE } from "../data";
import { T } from "../timing";
import "./system.css";

/**
 * ONE INTELLIGENCE — the ASTRYA core and the tools around it.
 *
 * Composition, motion and timing follow the original sequence: the core
 * appears behind the agents' cards; work items (email, calendar, task, client)
 * stream into it along dotted arcs and settle into a disc of light; it flashes
 * and its orbits ripple outward; the camera pushes in ("ASTRYA CORE"); a
 * message is absorbed and a meeting need surfaces; we pull back as six tools
 * light up on fine links — each a glass sphere inside its own rotating
 * holographic figure — the meeting lands on Calendar; then the system recedes.
 *
 * Everything is drawn from one camera (zoom + pan) in "world" pixels relative
 * to the core, as a pure function of time.
 */

// ── layout (world px at zoom 1, relative to the core) ────────────────────
const C0 = fmt({ x: 960, y: 532 }, { x: 540, y: 880 }); // core at camera rest
const R0 = fmt(234, 196); // core radius
const NR = fmt(39, 34); // node sphere radius
const FLAT = 0.235; // orbit / disc flattening (camera elevation)
const ORBITS = [1.32, 1.72, 2.2, 2.78, 3.55];
const ORBIT_A = [0.5, 0.42, 0.34, 0.24, 0.15];

type Part = { kind: "ring" | "ico" | "grid"; size: number; tilt: [number, number, number]; spin: [number, number, number] };
interface NodeDef {
  key: string;
  label: string;
  c: [number, number, number];
  p: [number, number];
  parts: Part[];
  bend: number; // link curvature (signed)
}
const NODES: NodeDef[] = [
  { key: "finance", label: "Finance", c: [70, 228, 170], p: fmt([-604, -14], [-372, -12]), bend: -0.2, parts: [1.5, 2.0, 2.55].map((size) => ({ kind: "ring" as const, size, tilt: [1.12, 0, 0.28] as [number, number, number], spin: [0.32, 0, 0.06] as [number, number, number] })) },
  { key: "followup", label: "Follow-up", c: [255, 160, 104], p: fmt([-233, -292], [-206, -338]), bend: 0.22, parts: [{ kind: "ring", size: 1.95, tilt: [1.2, 0, 0.45], spin: [0, 0.55, 0] }] },
  { key: "documents", label: "Documents", c: [182, 166, 255], p: fmt([281, -292], [214, -346]), bend: -0.22, parts: [{ kind: "ico", size: 1.75, tilt: [0.4, 0.3, 0], spin: [0.22, 0.42, 0] }] },
  { key: "tasks", label: "Tasks", c: [208, 228, 255], p: fmt([624, 10], [374, 16]), bend: 0.2, parts: [{ kind: "grid", size: 2.7, tilt: [0.25, 0.4, 0.78], spin: [0, 0.5, 0] }] },
  { key: "email", label: "Email", c: [70, 208, 255], p: fmt([-416, 426], [-252, 432]), bend: 0.2, parts: [{ kind: "ring", size: 1.7, tilt: [0, 0.35, 0.18], spin: [0, 0.62, 0] }] },
  {
    key: "calendar",
    label: "Calendar",
    c: [152, 126, 255],
    p: fmt([352, 445], [246, 442]),
    bend: -0.2,
    parts: [
      { kind: "ring", size: 2.0, tilt: [1.22, 0, -0.32], spin: [0, 0, 0.45] },
      { kind: "ring", size: 2.6, tilt: [1.36, 0.2, 0.38], spin: [0.18, 0, -0.32] },
    ],
  },
];
const CAL = NODES.findIndex((n) => n.key === "calendar");
const MAIL = NODES.findIndex((n) => n.key === "email");

/** Work items that stream into the core (cubic paths, world px; end = core). */
const CHIPS = [
  { label: "Email", path: fmt([[-1010, -520], [-760, -60], [-440, 210]], [[-640, -760], [-520, -200], [-300, 260]]) },
  { label: "Calendar", path: fmt([[700, -620], [660, -300], [430, -130]], [[560, -900], [420, -480], [280, -200]]) },
  { label: "Task", path: fmt([[1060, 260], [700, 310], [390, 130]], [[640, 520], [420, 520], [260, 220]]) },
  { label: "Client", path: fmt([[-980, 340], [-660, 340], [-390, 190]], [[-620, 760], [-430, 600], [-250, 260]]) },
] as Array<{ label: string; path: Array<[number, number]> }>;

// ── 3D wireframes ────────────────────────────────────────────────────────
type V3 = [number, number, number];
function ringPoly(r: number, n = 72): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r, 0]);
}
function subdivide(a: V3, b: V3, n: number): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, a[2] + ((b[2] - a[2]) * i) / n]);
}
function icoPolys(r: number): V3[][] {
  const f = (1 + Math.sqrt(5)) / 2;
  const v: V3[] = [[-1, f, 0], [1, f, 0], [-1, -f, 0], [1, -f, 0], [0, -1, f], [0, 1, f], [0, -1, -f], [0, 1, -f], [f, 0, -1], [f, 0, 1], [-f, 0, -1], [-f, 0, 1]];
  const s = r / Math.hypot(1, f);
  const vs = v.map((p) => p.map((c) => c * s) as V3);
  const out: V3[][] = [];
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++) {
      const d = Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
      if (Math.abs(d - 2) < 0.01) out.push(subdivide(vs[i], vs[j], 6));
    }
  return out;
}
function gridPolys(size: number, n = 4): V3[][] {
  const h = size / 2;
  const out: V3[][] = [];
  for (let i = 0; i <= n; i++) {
    const c = -h + (size * i) / n;
    out.push(subdivide([c, -h, 0], [c, h, 0], 10));
    out.push(subdivide([-h, c, 0], [h, c, 0], 10));
  }
  return out;
}
function rotate(p: V3, ax: number, ay: number, az: number): V3 {
  let [x, y, z] = p;
  let c = Math.cos(ax);
  let s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay);
  s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az);
  s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}
const GEOM = NODES.map((n) => n.parts.map((p) => (p.kind === "ring" ? [ringPoly(p.size)] : p.kind === "ico" ? icoPolys(p.size) : gridPolys(p.size))));

/** Glass sphere sprite for a node (pre-rendered once, 3× supersampled). */
function nodeSprite(c: [number, number, number]) {
  const r = NR * 3;
  const cv = document.createElement("canvas");
  cv.width = cv.height = r * 2 + 8;
  const g = cv.getContext("2d")!;
  const o = r + 4;
  const rgb = (a: number, m = 1) => `rgba(${Math.round(c[0] * m)},${Math.round(c[1] * m)},${Math.round(c[2] * m)},${a})`;
  const lite = (k: number, a: number) => `rgba(${Math.round(c[0] + (255 - c[0]) * k)},${Math.round(c[1] + (255 - c[1]) * k)},${Math.round(c[2] + (255 - c[2]) * k)},${a})`;
  g.beginPath();
  g.arc(o, o, r, 0, Math.PI * 2);
  g.save();
  g.clip();
  // tinted glass: clearer centre, denser colour at the edge
  let gr = g.createRadialGradient(o, o + r * 0.08, 0, o, o, r);
  gr.addColorStop(0, lite(0.35, 0.55));
  gr.addColorStop(0.55, rgb(0.5, 0.75));
  gr.addColorStop(0.86, rgb(0.72, 0.7));
  gr.addColorStop(1, lite(0.45, 0.95));
  g.fillStyle = gr;
  g.fillRect(0, 0, cv.width, cv.height);
  // inner light
  gr = g.createRadialGradient(o + r * 0.04, o + r * 0.02, 0, o, o, r * 0.62);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.22, lite(0.7, 0.9));
  gr.addColorStop(0.6, rgb(0.3));
  gr.addColorStop(1, rgb(0));
  g.fillStyle = gr;
  g.fillRect(0, 0, cv.width, cv.height);
  // secondary glint inside (like the reference's double highlight)
  gr = g.createRadialGradient(o - r * 0.16, o - r * 0.2, 0, o - r * 0.16, o - r * 0.2, r * 0.22);
  gr.addColorStop(0, "rgba(255,255,255,0.95)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, cv.width, cv.height);
  // bottom bounce light
  gr = g.createRadialGradient(o, o + r * 0.95, 0, o, o + r * 0.95, r * 0.7);
  gr.addColorStop(0, lite(0.5, 0.45));
  gr.addColorStop(1, rgb(0));
  g.fillStyle = gr;
  g.fillRect(0, 0, cv.width, cv.height);
  // specular highlight, top-left
  g.save();
  g.translate(o - r * 0.36, o - r * 0.44);
  g.rotate(-0.6);
  g.scale(1, 0.62);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  gr.addColorStop(0, "rgba(255,255,255,0.9)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
  g.restore();
  // rim
  const rimG = g.createLinearGradient(o - r, o - r, o + r, o + r);
  rimG.addColorStop(0, "rgba(255,255,255,0.85)");
  rimG.addColorStop(0.5, lite(0.4, 0.6));
  rimG.addColorStop(1, lite(0.2, 0.75));
  g.strokeStyle = rimG;
  g.lineWidth = 3.2;
  g.beginPath();
  g.arc(o, o, r - 1.6, 0, Math.PI * 2);
  g.stroke();
  return cv;
}
function glowSprite(c: [number, number, number]) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(${c},0.55)`);
  gr.addColorStop(0.3, `rgba(${c},0.22)`);
  gr.addColorStop(0.65, `rgba(${c},0.06)`);
  gr.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return cv;
}

/** Cubic Bézier through 3 control points ending at the core (0,0). */
function chipAt(path: Array<[number, number]>, u: number): [number, number] {
  const [a, b, c] = path;
  const d: [number, number] = [0, 0];
  const v = 1 - u;
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
}

export function buildSystem(tl: gsap.core.Timeline) {
  const L = PEOPLE.luka;
  const root = html(`<section class="scene" id="s-system">
    <canvas class="sys-back"></canvas>
    <div class="sys-globe"></div>
    <canvas class="sys-front"></canvas>
    <div class="sys-ui">
      ${CHIPS.map((c) => `<div class="sys-chip"><div class="sc-pill"><i></i><b></b><b class="s"></b></div><span class="sc-label mono">${c.label}</span></div>`).join("")}
      <div class="sys-core-label mono">ASTRYA Core</div>
      <div class="sys-msg card"><div class="sm-head">${avatar(L.initials, L.hue)}<b>${L.name}</b><span>${L.org}</span><em>09:47</em></div><p>Happy to walk through pricing on a call.</p></div>
      <div class="sys-need chip ai">${icon.calendar}<span>Needs a meeting</span></div>
      ${NODES.map((n) => `<div class="sys-label" style="--c:${n.c}">${n.label}</div>`).join("")}
      <div class="sys-cal card"><b>Pricing call</b><span>Thu 14:30 · ${L.name}</span><em>${icon.check}Added to calendar</em></div>
    </div>
  </section>`);
  camera.appendChild(root);
  const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector(s) as E;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const back = q<HTMLCanvasElement>(".sys-back");
  const front = q<HTMLCanvasElement>(".sys-front");
  const bctx = back.getContext("2d")!;
  const fctx = front.getContext("2d")!;
  const globe = createGlobe();
  q(".sys-globe").appendChild(globe.canvas);
  let k = 1;
  onResize((s) => {
    k = Math.min(1.5, Math.max(0.6, s * (window.devicePixelRatio || 1)));
    for (const c of [back, front]) {
      c.width = Math.round(W * k);
      c.height = Math.round(H * k);
    }
  });

  const chips = qa(".sys-chip");
  const labels = qa(".sys-label");
  const coreLabel = q(".sys-core-label");
  const msg = q(".sys-msg");
  const need = q(".sys-need");
  const calCard = q(".sys-cal");
  const sprites = NODES.map((n) => nodeSprite(n.c));
  const glows = NODES.map((n) => glowSprite(n.c));

  // ── animated state (tweened by GSAP, read per frame) ─────────────────────
  const cv = { z: 0.9, x: 0, y: 0 }; // camera
  const st = { axis: 0, dust: 0, rot: -0.1, sparks: 0 };
  const orb = ORBITS.map(() => ({ p: 0 }));
  const nd = NODES.map(() => ({ a: 0, link: 0, gim: 0, hi: 0, lab: 0 }));
  const ch = CHIPS.map(() => ({ u: 0 }));
  const cal = { pulse: 0, sel: 0 };
  const mail = { u: 0, a: 0 };
  const needW = { f: 0 }; // 0 = beside the core, 1 = on the Calendar node

  const sx = (wx: number) => C0.x + cv.x + wx * cv.z;
  const sy = (wy: number) => C0.y + cv.y + wy * cv.z;
  /** constellation turns slowly about the core (screen CCW), elliptical */
  const nodeW = (i: number): [number, number] => {
    const [x, y] = NODES[i].p;
    const e = 0.74;
    const c = Math.cos(st.rot);
    const s = Math.sin(st.rot);
    return [x * c + (y / e) * s, (-x * s + (y / e) * c) * e];
  };

  // dust disc: particles in the orbital plane (Keplerian drift)
  const R = rng(311);
  const DUST = Array.from({ length: 760 }, () => {
    const r = 1.06 + 2.7 * Math.pow(R(), 1.7);
    return { r, a: R() * Math.PI * 2, w: 0.16 * Math.pow(1 / r, 1.5), j: (R() - 0.5) * 0.09 * Math.sqrt(r), s: 0.5 + R() * 1.3, b: 0.25 + R() * 0.75, f: R() * 6.28 };
  });
  const ORB_DOTS = ORBITS.map((_, oi) => Array.from({ length: 70 + oi * 22 }, (_, j) => ({ a: (j / (70 + oi * 22)) * Math.PI * 2 + R() * 0.05, b: R() })));
  const S0 = T.system;
  const at = (f: number) => S0 + (f - 33.5); // author in film seconds (1:1 here)

  // ── per-frame drawing ────────────────────────────────────────────────────
  let visible = false;
  const clear = (c: CanvasRenderingContext2D) => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W * k, H * k);
  };
  onFrame((t) => {
    const on = t > at(33.0) && t < at(47.6);
    if (!on) {
      if (visible) {
        clear(bctx);
        clear(fctx);
        globe.render(-1);
      }
      visible = false;
      return;
    }
    visible = true;
    const z = cv.z;
    const gx = sx(0);
    const gy = sy(0);
    const gr = R0 * z;
    globe.state.x = gx;
    globe.state.y = gy;
    globe.state.r = gr;
    globe.render(t);
    for (const c of [bctx, fctx]) {
      clear(c);
      c.setTransform(k, 0, 0, k, 0, 0);
      c.lineCap = "round";
    }

    // orbits: back halves behind the core, front halves over it
    orb.forEach((o, oi) => {
      if (o.p <= 0.001) return;
      const e = gsap.parseEase("cine")(o.p);
      const rx = gr * (1 + (ORBITS[oi] - 1) * e);
      const ry = rx * FLAT;
      const a = ORBIT_A[oi] * Math.min(1, o.p * 2.5);
      const fresh = 1 + 1.6 * (1 - e); // brighter while rippling out
      for (const [ctx, a0, a1, m] of [
        [bctx, Math.PI, Math.PI * 2, 1],
        [fctx, 0, Math.PI, 0.75],
      ] as Array<[CanvasRenderingContext2D, number, number, number]>) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(175,200,255,${Math.min(1, a * fresh * m)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(gx, gy, rx, ry, 0, a0, a1);
        ctx.stroke();
        // dotted texture drifting along the orbit
        ctx.fillStyle = `rgba(215,230,255,${Math.min(1, a * 1.5 * fresh * m)})`;
        const spin = t * (0.05 + 0.035 / (oi + 1));
        for (const d of ORB_DOTS[oi]) {
          const th = d.a + spin;
          const sn = Math.sin(th);
          if ((a0 === 0) !== sn > 0) continue;
          if (d.b < 0.45) continue;
          const px = gx + Math.cos(th) * rx;
          const py = gy + sn * ry;
          const sz = 0.7 + d.b * 0.9;
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
        // two beads with short tails, moving faster
        for (let b = 0; b < 2; b++) {
          const th0 = t * (0.32 - oi * 0.04) + b * Math.PI + oi * 1.3;
          for (let j = 0; j < 10; j++) {
            const th = th0 - j * 0.018;
            const sn = Math.sin(th);
            if ((a0 === 0) !== sn > 0) continue;
            const px = gx + Math.cos(th) * rx;
            const py = gy + sn * ry;
            const f = 1 - j / 10;
            ctx.fillStyle = `rgba(225,238,255,${Math.min(1, a * 2.2 * f * f * m)})`;
            const sz = 1 + 1.6 * f;
            ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
          }
        }
      }
    });

    // dust disc in the orbital plane
    if (st.dust > 0.001) {
      for (const ctx of [bctx, fctx]) ctx.globalCompositeOperation = "lighter";
      for (const d of DUST) {
        const th = d.a + d.w * (t - S0);
        const sn = Math.sin(th);
        const ctx = sn < 0 ? bctx : fctx;
        const px = gx + Math.cos(th) * d.r * gr;
        const py = gy + (sn * FLAT * 0.85 + d.j) * d.r * gr * 0.62;
        const tw = 0.6 + 0.4 * Math.sin(t * 2.1 + d.f);
        const al = st.dust * d.b * tw * (sn < 0 ? 0.6 : 0.85) * clamp(1.6 - d.r * 0.38);
        if (al < 0.02) continue;
        ctx.fillStyle = `rgba(190,215,255,${al})`;
        const sz = d.s * Math.min(1.4, z);
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    }

    const f = fctx;
    f.globalCompositeOperation = "lighter";
    // axis lines through the core
    if (st.axis > 0.001) {
      const Lv = gr * 2.05 * st.axis;
      const tilt = 0.035;
      const vg = f.createLinearGradient(gx, gy - Lv, gx, gy + Lv);
      vg.addColorStop(0, "rgba(150,190,255,0)");
      vg.addColorStop(0.2, "rgba(150,195,255,0.42)");
      vg.addColorStop(0.5, "rgba(200,222,255,0.45)");
      vg.addColorStop(0.8, "rgba(150,195,255,0.42)");
      vg.addColorStop(1, "rgba(150,190,255,0)");
      f.strokeStyle = vg;
      f.lineWidth = 1.1;
      f.beginPath();
      f.moveTo(gx + Lv * tilt, gy - Lv);
      f.lineTo(gx - Lv * tilt, gy + Lv);
      f.stroke();
      const Lh = gr * 1.32 * st.axis;
      const hg = f.createLinearGradient(gx - Lh, gy, gx + Lh, gy);
      hg.addColorStop(0, "rgba(150,190,255,0)");
      hg.addColorStop(0.25, "rgba(190,215,255,0.5)");
      hg.addColorStop(0.75, "rgba(190,215,255,0.5)");
      hg.addColorStop(1, "rgba(150,190,255,0)");
      f.strokeStyle = hg;
      f.beginPath();
      f.moveTo(gx - Lh, gy);
      f.lineTo(gx + Lh, gy);
      f.stroke();
    }

    // work items streaming in along dotted arcs
    ch.forEach((c, i) => {
      const el = chips[i];
      if (c.u <= 0.0001 || c.u >= 0.9999) {
        el.style.opacity = "0";
        return;
      }
      const path = CHIPS[i].path;
      for (let j = 1; j <= 34; j++) {
        const u = c.u - j * 0.016;
        if (u <= 0) break;
        const [wx, wy] = chipAt(path, u);
        const px = sx(wx);
        const py = sy(wy);
        if (Math.hypot(px - gx, py - gy) < gr) continue;
        const fa = 1 - j / 34;
        f.fillStyle = `rgba(170,205,255,${0.75 * fa * fa})`;
        const sz = 0.8 + 1.4 * fa;
        f.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
      const [wx, wy] = chipAt(path, c.u);
      const px = sx(wx);
      const py = sy(wy);
      const dist = Math.hypot(px - gx, py - gy);
      const sc = (1 - 0.5 * c.u * c.u) * z;
      el.style.opacity = String(clamp((dist - gr * 0.92) / (gr * 0.35)) * clamp(c.u * 12));
      el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${sc})`;
    });

    // links, then nodes (sphere + holographic figure), labels
    const np = NODES.map((_, i) => {
      const [wx, wy] = nodeW(i);
      return [sx(wx), sy(wy)] as [number, number];
    });
    NODES.forEach((n, i) => {
      const s = nd[i];
      if (s.link <= 0.001) return;
      const [nx, ny] = np[i];
      const ang = Math.atan2(ny - gy, nx - gx) + n.bend * 0.9;
      const ax = gx + Math.cos(ang) * gr * 0.97;
      const ay = gy + Math.sin(ang) * gr * 0.97;
      const dx = nx - ax;
      const dy = ny - ay;
      const len = Math.hypot(dx, dy);
      const cx = (ax + nx) / 2 - (dy / len) * len * n.bend;
      const cy = (ay + ny) / 2 + (dx / len) * len * n.bend;
      const lg = f.createLinearGradient(ax, ay, nx, ny);
      lg.addColorStop(0, "rgba(170,200,255,0.1)");
      lg.addColorStop(0.5, "rgba(190,212,255,0.34)");
      lg.addColorStop(1, `rgba(${n.c},0.5)`);
      f.strokeStyle = lg;
      f.lineWidth = 1;
      f.beginPath();
      const steps = 40;
      const until = Math.round(steps * s.link);
      for (let j = 0; j <= until; j++) {
        const u = j / steps;
        const v = 1 - u;
        const px = v * v * ax + 2 * v * u * cx + u * u * nx;
        const py = v * v * ay + 2 * v * u * cy + u * u * ny;
        if (j === 0) f.moveTo(px, py);
        else f.lineTo(px, py);
      }
      f.stroke();
      // sparkles travelling out along the link
      const spark = (u: number, a: number) => {
        const v = 1 - u;
        const px = v * v * ax + 2 * v * u * cx + u * u * nx;
        const py = v * v * ay + 2 * v * u * cy + u * u * ny;
        star(f, px, py, a, n.c, 1 + 0.4 * z);
      };
      if (st.sparks > 0.01) {
        const per = 2.6;
        const ph = ((t - S0) / per + i * 0.37) % 1;
        if (ph < 0.6) spark(ph / 0.6, st.sparks * Math.sin((ph / 0.6) * Math.PI));
      }
      if (i === MAIL && mail.a > 0.01) spark(mail.u, mail.a);
    });

    NODES.forEach((n, i) => {
      const s = nd[i];
      const [nx, ny] = np[i];
      const lab = labels[i];
      if (s.a <= 0.001) {
        lab.style.opacity = "0";
        return;
      }
      const r = NR * z * (0.45 + 0.55 * gsap.parseEase("cine")(s.a)) * (1 + 0.18 * s.hi);
      // glow
      f.globalCompositeOperation = "lighter";
      f.globalAlpha = s.a * (0.75 + 0.9 * s.hi);
      const gs = r * 5.2;
      f.drawImage(glows[i], nx - gs / 2, ny - gs / 2, gs, gs);
      f.globalAlpha = 1;
      // holographic figure: far half, sphere, near half
      const segs = s.gim > 0.001 ? figure(i, t, s.gim) : null;
      if (segs) strokeSegs(f, segs.back, nx, ny, r, n.c, s.a * s.gim * 0.4, false);
      f.globalCompositeOperation = "source-over";
      f.globalAlpha = s.a;
      f.drawImage(sprites[i], nx - r - (4 * r) / (NR * 3), ny - r - (4 * r) / (NR * 3), r * 2 + (8 * r) / (NR * 3), r * 2 + (8 * r) / (NR * 3));
      f.globalAlpha = 1;
      if (s.hi > 0.01) {
        f.globalCompositeOperation = "lighter";
        f.globalAlpha = s.hi * 0.7;
        f.drawImage(glows[i], nx - r * 1.6, ny - r * 1.6, r * 3.2, r * 3.2);
        f.globalAlpha = 1;
      }
      if (segs) strokeSegs(f, segs.front, nx, ny, r, n.c, s.a * s.gim, true);
      lab.style.opacity = String(s.lab * s.a);
      lab.style.transform = `translate3d(${nx}px, ${ny + r + 16 * z + (s.gim > 0 ? NR * z * 0.55 * s.gim : 0)}px, 0) translate(-50%, 0) scale(${0.72 + 0.28 * z})`;
    });

    // Calendar: the meeting lands — pulse rings and selection rings
    {
      const [nx, ny] = np[CAL];
      const r = NR * z;
      f.globalCompositeOperation = "lighter";
      if (cal.pulse > 0 && cal.pulse < 1) {
        for (let j = 0; j < 3; j++) {
          const p = clamp(cal.pulse * 1.5 - j * 0.25);
          if (p <= 0 || p >= 1) continue;
          f.strokeStyle = `rgba(185,170,255,${0.6 * (1 - p)})`;
          f.lineWidth = 1.4;
          f.beginPath();
          f.arc(nx, ny, r * (1.1 + 3.4 * gsap.parseEase("cine")(p)), 0, Math.PI * 2);
          f.stroke();
        }
      }
      if (cal.sel > 0.001) {
        for (const [m, a] of [
          [2.45, 0.42],
          [3.45, 0.24],
        ]) {
          f.strokeStyle = `rgba(200,195,255,${a * cal.sel})`;
          f.lineWidth = 1;
          f.beginPath();
          f.arc(nx, ny, r * m * (0.9 + 0.1 * cal.sel), 0, Math.PI * 2);
          f.stroke();
        }
      }
      const c0 = fmt([nx + r * 2.6 + 18, ny - 58], [W / 2 - 200, sy(0) + R0 * z + 42]);
      calCard.style.left = `${c0[0]}px`;
      calCard.style.top = `${c0[1]}px`;
    }

    // DOM pieces that ride with the camera
    coreLabel.style.transform = `translate3d(${gx}px, ${gy + gr + fmt(52, 46) * Math.min(1.3, z)}px, 0) translate(-50%, 0)`;
    {
      const e = gsap.parseEase("cineInOut")(needW.f);
      const [cx2, cy2] = nodeW(CAL);
      const wx = R0 * 0.7 + (cx2 - R0 * 0.7) * e;
      const wy = -R0 * 0.55 + (cy2 + R0 * 0.55) * e;
      need.style.transform = `translate3d(${sx(wx)}px, ${sy(wy)}px, 0) translate(-50%, -50%) scale(${(1 - 0.75 * e) * Math.min(1.2, z)})`;
    }
  });

  /** Project a node's figure into back/front segment lists (node-radius units). */
  function figure(i: number, t: number, g: number) {
    const backS: number[] = [];
    const frontS: number[] = [];
    const tt = t - S0;
    NODES[i].parts.forEach((p, pi) => {
      const ax = p.tilt[0] + p.spin[0] * tt;
      const ay = p.tilt[1] + p.spin[1] * tt;
      const az = p.tilt[2] + p.spin[2] * tt;
      const polys = GEOM[i][pi];
      const sc = 0.62 + 0.38 * g;
      const total = polys.length;
      polys.forEach((poly, li) => {
        // draw-on: polylines appear in sequence (rings: a sweep along the ring)
        const frac = clamp(g * total * 1.25 - li * (total > 1 ? 0.9 : 0));
        const n = Math.floor((poly.length - 1) * frac);
        let prev: V3 | null = null;
        for (let j = 0; j <= n; j++) {
          const q = rotate(poly[j], ax, ay, az);
          const pr = 7 / (7 - q[2] * 0.6); // gentle perspective
          const cur: V3 = [q[0] * pr * sc, q[1] * pr * sc, q[2]];
          if (prev) {
            const mz = (prev[2] + cur[2]) / 2;
            const mx = (prev[0] + cur[0]) / 2;
            const my = (prev[1] + cur[1]) / 2;
            if (mz < 0 && mx * mx + my * my < 1) {
              prev = cur;
              continue; // hidden behind the sphere
            }
            (mz < 0 ? backS : frontS).push(prev[0], prev[1], cur[0], cur[1]);
          }
          prev = cur;
        }
      });
    });
    return { back: backS, front: frontS };
  }
  function strokeSegs(ctx: CanvasRenderingContext2D, s: number[], x: number, y: number, r: number, c: number[], a: number, glow: boolean) {
    if (!s.length || a <= 0.001) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    for (let j = 0; j < s.length; j += 4) {
      ctx.moveTo(x + s[j] * r, y + s[j + 1] * r);
      ctx.lineTo(x + s[j + 2] * r, y + s[j + 3] * r);
    }
    if (glow) {
      ctx.strokeStyle = `rgba(${c},${0.16 * a})`;
      ctx.lineWidth = 3.4;
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${Math.round(c[0] * 0.25 + 190)},${Math.round(c[1] * 0.25 + 190)},${Math.round(c[2] * 0.2 + 204)},${0.85 * a})`;
    ctx.lineWidth = 1.05;
    ctx.stroke();
  }
  function star(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, c: number[], s: number) {
    if (a <= 0.01) return;
    ctx.globalCompositeOperation = "lighter";
    const L = 11 * s;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ]) {
      const g = ctx.createLinearGradient(x - dx * L, y - dy * L, x + dx * L, y + dy * L);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, `rgba(255,255,255,${0.9 * a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - dx * L, y - dy * L);
      ctx.lineTo(x + dx * L, y + dy * L);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(x, y, 0, x, y, 7 * s);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.35, `rgba(${c},${0.55 * a})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 7 * s, y - 7 * s, 14 * s, 14 * s);
  }

  // ── TIMELINE (film seconds via at()) ─────────────────────────────────────
  tl.set(root, { autoAlpha: 1 }, at(33.0));

  // the agents' cards dissolve forward; the core appears behind them
  tl.add(titleOut(share.workTitle as HTMLElement, { stagger: 0.03, dur: 0.5 }), at(33.0));
  const work = share.workRoot as HTMLElement;
  tl.to(work, { scale: UI_SCALE.work * 1.07, filter: "blur(12px)", opacity: 0, duration: 1.25, ease: "sine.inOut" }, at(33.2));
  tl.set(work, { autoAlpha: 0 }, at(34.5));
  cue("whoosh", at(33.2), 1.3, 0.45);
  tl.fromTo(globe.state, { reveal: 0, energy: 0.6 }, { reveal: 1, energy: 1, duration: 1.5, ease: "sine.inOut" }, at(33.25));
  tl.fromTo(cv, { z: 0.9 }, { z: 1, duration: 2.2, ease: "cine" }, at(33.25));
  tl.to(atmos, { core: 0.55, halo: 0.32, stars: 0.6, leak: 0.05, duration: 1.6, ease: "sine.inOut" }, at(33.3));
  tl.fromTo(st, { axis: 0 }, { axis: 1, duration: 1.2, ease: "cineInOut" }, at(34.0));
  tl.fromTo(st, { dust: 0 }, { dust: 0.45, duration: 2.2, ease: "sine.inOut" }, at(34.2));

  // work items stream in
  cue("riser", at(34.0), 2.4, 0.75);
  [34.0, 34.45, 34.9, 35.2].forEach((s, i) => {
    const d = [1.4, 1.4, 1.2, 1.15][i];
    tl.fromTo(ch[i], { u: 0 }, { u: 1, duration: d, ease: "power1.in" }, at(s));
    cue("whoosh", at(s), d, 0.22);
    const hitT = at(s + d * 0.93);
    tl.to(globe.state, { flash: 0.22, duration: 0.08, ease: "sine.out" }, hitT);
    tl.to(globe.state, { flash: 0, duration: 0.45, ease: "sine.out" }, hitT + 0.08);
    cue("tick", hitT, undefined, 0.4);
  });

  // flash — the orbits ripple out
  const FL = at(36.4);
  tl.to(globe.state, { flash: 1, duration: 0.12, ease: "sine.out" }, FL);
  tl.to(globe.state, { flash: 0, duration: 1.3, ease: "cine" }, FL + 0.12);
  tl.to(st, { dust: 1, duration: 1.4, ease: "cine" }, FL);
  tl.to(atmos, { core: 0.9, duration: 0.3, ease: "sine.out" }, FL);
  tl.to(atmos, { core: 0.58, duration: 2.2, ease: "sine.inOut" }, FL + 0.4);
  cue("hit", FL, undefined, 1.0);
  cue("chime", FL + 0.2, undefined, 0.35);
  shockwave(FL + 0.02, 1.5, C0.x, C0.y, fmt(1050, 760), FLAT * 1.4, 2.4);
  burst(FL, 1.3, C0.x, C0.y, 110, fmt(620, 430), 211, 0.25);
  orb.forEach((o, i) => tl.fromTo(o, { p: 0 }, { p: 1, duration: 1.9, ease: "none" }, FL + 0.05 + i * 0.17));
  cue("sweep", FL + 0.1, 1.6, 0.4);

  // push in — ASTRYA Core
  tl.to(cv, { z: 1.1, duration: 2.0, ease: "sine.inOut" }, FL);
  tl.to(cv, { z: fmt(1.4, 1.36), duration: 1.9, ease: "cine" }, at(38.4));
  cue("whoosh", at(38.4), 1.8, 0.35);
  tl.fromTo(coreLabel, { opacity: 0, letterSpacing: "0.6em", filter: "blur(6px)" }, { opacity: 1, letterSpacing: "0.3em", filter: "blur(0px)", duration: 1.2, ease: "cine" }, at(38.9));
  cue("tick", at(38.95), undefined, 0.35);
  tl.to(coreLabel, { opacity: 0, filter: "blur(4px)", duration: 0.5, ease: "sine.in" }, at(40.9));

  // a message arrives and is absorbed; a need surfaces
  const mPos = fmt({ x: 300, y: 400 }, { x: 110, y: 520 });
  gsap.set(msg, { x: mPos.x, y: mPos.y });
  tl.fromTo(msg, { opacity: 0, x: mPos.x - 220, filter: "blur(10px)", scale: 0.96 }, { opacity: 1, x: mPos.x, filter: "blur(0px)", scale: 1, duration: 0.8, ease: "cine" }, at(39.7));
  cue("whoosh", at(39.7), 0.7, 0.35);
  tl.to(msg, { x: C0.x - fmt(210, 200), y: C0.y - 60, scale: 0.14, opacity: 0, filter: "blur(8px)", duration: 0.7, ease: "power2.in" }, at(40.5));
  tl.to(globe.state, { flash: 0.35, duration: 0.1 }, at(41.15));
  tl.to(globe.state, { flash: 0, duration: 0.6, ease: "sine.out" }, at(41.25));
  cue("soft", at(41.15), undefined, 0.45);
  tl.fromTo(need, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "cine" }, at(41.2));
  cue("click", at(41.25), undefined, 0.5);

  // pull back — the tools light up
  const PB = at(41.4);
  tl.to(cv, { z: fmt(1.06, 1.02), x: fmt(-70, 0), y: fmt(-84, -70), duration: 1.8, ease: "cine" }, PB);
  cue("whoosh", PB, 1.6, 0.45);
  tl.fromTo(st, { rot: -0.1 }, { rot: 0.13, duration: 6.0, ease: "sine.inOut" }, PB);
  nd.forEach((s, i) => {
    tl.fromTo(s, { a: 0 }, { a: 1, duration: 0.9, ease: "none" }, PB + 0.15 + i * 0.11);
    tl.fromTo(s, { link: 0 }, { link: 1, duration: 0.8, ease: "cineInOut" }, PB + 0.22 + i * 0.11);
    cue("tick", PB + 0.3 + i * 0.11, undefined, 0.22);
  });

  // the need lands on Calendar
  tl.to(needW, { f: 1, duration: 0.75, ease: "none" }, at(42.4));
  tl.to(need, { opacity: 0, duration: 0.25, ease: "sine.in" }, at(42.95));
  const CA = at(43.1);
  tl.fromTo(cal, { pulse: 0 }, { pulse: 1, duration: 1.4, ease: "none" }, CA);
  tl.to(nd[CAL], { hi: 1, duration: 0.25, ease: "sine.out" }, CA);
  tl.to(nd[CAL], { hi: 0.35, duration: 1.4, ease: "sine.inOut" }, CA + 0.3);
  tl.to(nd[CAL], { lab: 1, duration: 0.5 }, CA + 0.1);
  tl.fromTo(cal, { sel: 0 }, { sel: 1, duration: 0.6, ease: "cine" }, CA + 0.05);
  tl.to(cal, { sel: 0, duration: 0.6, ease: "sine.in" }, at(45.1));
  cue("chime", CA, undefined, 0.6);
  tl.fromTo(calCard, { opacity: 0, x: fmt(-24, 0), y: fmt(0, 14), filter: "blur(8px)" }, { opacity: 1, x: 0, y: 0, filter: "blur(0px)", duration: 0.7, ease: "cine" }, CA + 0.2);
  tl.fromTo(calCard.querySelector("em"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5, ease: "cine" }, CA + 0.7);
  cue("tick", CA + 0.75, undefined, 0.4);
  tl.to(calCard, { opacity: 0, filter: "blur(6px)", duration: 0.5, ease: "sine.in" }, at(45.0));
  tl.to(nd[CAL], { hi: 0, duration: 0.8 }, at(45.0));

  // a reply goes out: a spark runs to Email
  tl.fromTo(mail, { u: 0, a: 0 }, { u: 1, duration: 0.6, ease: "power1.inOut" }, at(44.25));
  tl.to(mail, { a: 1, duration: 0.15 }, at(44.25));
  tl.to(mail, { a: 0, duration: 0.15 }, at(44.75));
  tl.to(nd[MAIL], { hi: 1, duration: 0.2 }, at(44.82));
  tl.to(nd[MAIL], { hi: 0, duration: 1.0, ease: "sine.inOut" }, at(45.05));
  cue("chime", at(44.85), undefined, 0.35);

  // every tool takes its holographic form
  nd.forEach((s, i) => {
    tl.fromTo(s, { gim: 0 }, { gim: 1, duration: 1.1, ease: "cineInOut" }, at(44.45) + i * 0.09);
    if (i !== CAL) tl.to(s, { lab: 1, duration: 0.6, ease: "sine.out" }, at(44.7) + i * 0.06);
  });
  cue("sweep", at(44.45), 1.2, 0.35);
  tl.fromTo(st, { sparks: 0 }, { sparks: 1, duration: 0.8 }, at(45.1));

  // the system settles, then recedes
  tl.to(cv, { z: 1, x: 0, y: fmt(-10, -20), duration: 2.2, ease: "sine.inOut" }, at(43.2));
  tl.to(cv, { z: fmt(0.64, 0.62), y: fmt(0, -10), duration: 2.1, ease: "power2.in" }, at(45.4));
  cue("whoosh", at(45.9), 1.6, 0.4);
  tl.to(atmos, { core: 0.18, halo: 0.25, duration: 1.6, ease: "sine.in" }, at(45.8));
  tl.to(root, { opacity: 0, filter: "blur(7px)", duration: 0.8, ease: "sine.in" }, at(46.45));
  tl.set(root, { autoAlpha: 0 }, at(47.3));
}
