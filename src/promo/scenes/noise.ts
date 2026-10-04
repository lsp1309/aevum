import { gsap } from "../../core/gsap";
import { onFrame, rng, clamp, lerp, smooth, cue } from "../../core/clock";
import { W, H, CX, CY, $, html, world, back, sizeCanvas } from "../stage";
import { S, VO } from "../timing";
import { paint, hBeam, flare, streak } from "../light";
import { sky } from "../sky";
import { ROWS, NOISE, NAME_BITS, NAME, type Bit, type Row } from "../data";

/**
 * ACT I — NOISE. A storm of notifications rushes at the camera in a tall 3D
 * tunnel, faster and faster, while a giant counter of unread items climbs.
 * ACT II — SIGNAL. Time stops. Six letters hidden in the noise light up,
 * leave their notifications and assemble the name. The name collapses into a
 * line of light, which splits and sweeps the frame: every fragment it touches
 * either dissolves into light or snaps into place as a row of one calm inbox.
 */

export const ROW = { x: 70, w: 940, h: 104, pitch: 122, top: 237 };
export const rowY = (i: number) => ROW.top + i * ROW.pitch;

const FOC = 1000;
const DEPTH = 5200;
const M = 18; // sprite margin (badges overflow)
const SANS = '"Manrope Variable", sans-serif';
const BRAND = '"Inter Tight Variable", sans-serif'; // the name only
const MONO = '"JetBrains Mono Variable", monospace';
const YC = 900; // the line of the name
const K = 1.55; // sprite size at unit depth

// ── camera of the storm ─────────────────────────────────────────────────────
const DT = 1 / 600;
const travelTab: number[] = [0];
for (let i = 1, acc = 0; i <= Math.ceil(S.freeze / DT) + 2; i++) {
  const t = i * DT;
  const v = t >= S.freeze ? 0 : 140 + 2400 * Math.pow(Math.min(1, t / 5.3), 2.6);
  acc += v * DT;
  travelTab.push(acc);
}
const travel = (t: number) => {
  const tt = clamp(t, 0, S.freeze);
  const i = Math.min(travelTab.length - 2, Math.floor(tt / DT));
  return lerp(travelTab[i], travelTab[i + 1], tt / DT - i);
};
const speed = (t: number) => (t >= S.freeze || t < 0 ? 0 : 140 + 2400 * Math.pow(Math.min(1, t / 5.3), 2.6));
const roll = (t: number) => {
  const u = Math.min(t, S.freeze);
  return -0.1 * smooth(clamp(u / 5.5)) + 0.014 * Math.sin(1.3 * u);
};
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ── sprites ────────────────────────────────────────────────────────────────
interface Frag {
  bit: Bit;
  x: number;
  y: number;
  z0: number;
  ta: number;
  w: number;
  h: number;
  img: HTMLCanvasElement;
  soft: HTMLCanvasElement; // the same, out of focus (depth of field, motion smear)
  row?: number;
  rowImg?: HTMLCanvasElement;
  letter?: number;
  lx?: number; // first-letter offset from the sprite centre (title baseline)
  ly?: number;
  pass?: number; // time the scan line reaches it
  fx?: number; // screen position at the freeze
  fy?: number;
  fs?: number;
}

/** A blurred copy of a sprite (cheap depth of field, drawn instead of the sharp one). */
function defocus(src: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d")!;
  g.filter = "blur(4px)";
  g.drawImage(src, 0, 0);
  return c;
}

function ctx2(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w + 2 * M);
  c.height = Math.ceil(h + 2 * M);
  const g = c.getContext("2d")!;
  g.translate(M, M);
  return { c, g };
}
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
const meas = document.createElement("canvas").getContext("2d")!;
const tw = (font: string, s: string) => {
  meas.font = font;
  return meas.measureText(s).width;
};

function icon(g: CanvasRenderingContext2D, b: Bit, cx: number, cy: number) {
  const alert = b.kind === "alert";
  g.beginPath();
  g.arc(cx, cy, 20, 0, Math.PI * 2);
  g.fillStyle = alert ? "rgba(70,130,255,0.22)" : "rgba(200,220,255,0.07)";
  g.fill();
  g.strokeStyle = alert ? "rgba(120,170,255,0.6)" : "rgba(170,200,255,0.16)";
  g.lineWidth = 1.5;
  g.stroke();
  g.strokeStyle = g.fillStyle = alert ? "#9cc4ff" : "rgba(225,235,252,0.82)";
  g.lineWidth = 2;
  g.textAlign = "center";
  g.textBaseline = "middle";
  switch (b.kind) {
    case "mail":
      g.font = `650 15px ${SANS}`;
      g.fillText(b.initials ?? "@", cx, cy + 1);
      break;
    case "chat":
      g.font = `500 19px ${MONO}`;
      g.fillText("#", cx, cy + 1);
      break;
    case "invite":
      g.strokeRect(cx - 8, cy - 7, 16, 15);
      g.beginPath();
      g.moveTo(cx - 8, cy - 2);
      g.lineTo(cx + 8, cy - 2);
      g.stroke();
      break;
    case "file":
      g.beginPath();
      g.moveTo(cx - 7, cy - 9);
      g.lineTo(cx + 3, cy - 9);
      g.lineTo(cx + 7, cy - 5);
      g.lineTo(cx + 7, cy + 9);
      g.lineTo(cx - 7, cy + 9);
      g.closePath();
      g.stroke();
      break;
    case "alert":
      g.font = `700 20px ${SANS}`;
      g.fillText("!", cx, cy + 1);
      break;
    case "reminder":
      g.beginPath();
      g.arc(cx, cy, 8.5, 0, Math.PI * 2);
      g.moveTo(cx, cy - 5);
      g.lineTo(cx, cy);
      g.lineTo(cx + 4, cy + 2);
      g.stroke();
      break;
  }
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
}

function badge(g: CanvasRenderingContext2D, x: number, y: number, s: string) {
  g.beginPath();
  g.arc(x, y, 15, 0, Math.PI * 2);
  g.fillStyle = "#2f6bff";
  g.fill();
  g.fillStyle = "#fff";
  g.font = `700 16px ${SANS}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(s, x, y + 1);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
}

const TITLE = `600 28px ${SANS}`;
const BODY = `400 23px ${SANS}`;
const META = `400 17px ${MONO}`;

/** A notification of the storm (cold, graphite). `skipFirst`: the first letter is drawn live. */
function bitSprite(b: Bit, skipFirst = false) {
  if (b.kind === "micro") {
    const w = tw(`500 21px ${MONO}`, b.title) + 44;
    const h = 56;
    const { c, g } = ctx2(w, h);
    rr(g, 0, 0, w, h, 28);
    g.fillStyle = "rgba(13,20,40,0.92)";
    g.fill();
    g.strokeStyle = "rgba(225,235,252,0.16)";
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = "rgba(225,235,252,0.78)";
    g.font = `500 21px ${MONO}`;
    g.fillText(b.title, 22, 35);
    return { c, w, h };
  }
  const metaW = b.meta ? tw(META, b.meta) + 20 : 0;
  const w = clamp(78 + Math.max(tw(TITLE, b.title) + metaW, tw(BODY, b.body ?? "")) + 26, 300, 660);
  const h = 96;
  const { c, g } = ctx2(w, h);
  rr(g, 0, 0, w, h, 22);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "rgba(22,31,58,0.94)");
  gr.addColorStop(1, "rgba(9,14,30,0.94)");
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = "rgba(225,235,252,0.15)";
  g.lineWidth = 1.5;
  g.stroke();
  icon(g, b, 40, h / 2);
  g.font = TITLE;
  g.fillStyle = "#f2f6fd";
  const first = skipFirst ? tw(TITLE, b.title[0]) : 0;
  g.fillText(skipFirst ? b.title.slice(1) : b.title, 78 + first, 41);
  if (b.meta) {
    g.font = META;
    g.fillStyle = "rgba(225,235,252,0.42)";
    g.fillText(b.meta, 78 + tw(TITLE, b.title) + 16, 40);
  }
  if (b.body) {
    g.font = BODY;
    g.fillStyle = "rgba(225,235,252,0.55)";
    let s = b.body;
    while (tw(BODY, s) > w - 100 && s.length > 4) s = s.slice(0, -2);
    g.fillText(s === b.body ? s : `${s.trimEnd()}…`, 78, 73);
  }
  if (b.badge) badge(g, w - 4, 4, b.badge);
  return { c, w, h };
}

/** A row of the calm inbox — the same surface the DOM rows use. */
export function rowSprite(r: Row) {
  const { w, h } = ROW;
  const { c, g } = ctx2(w, h);
  rr(g, 0, 0, w, h, 22);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "rgba(22,32,60,0.86)");
  gr.addColorStop(1, "rgba(9,14,30,0.9)");
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = "rgba(150,190,255,0.13)";
  g.lineWidth = 1.5;
  g.stroke();
  const ag = g.createLinearGradient(24, 26, 76, 78);
  const warm = r.from.startsWith("Luka");
  ag.addColorStop(0, warm ? "#e6f0ff" : "#2a3a5e");
  ag.addColorStop(1, warm ? "#7fb0ff" : "#141e38");
  g.beginPath();
  g.arc(50, h / 2, 26, 0, Math.PI * 2);
  g.fillStyle = ag;
  g.fill();
  g.fillStyle = warm ? "#061334" : "rgba(226,236,252,0.8)";
  g.font = `700 20px ${SANS}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(r.initials, 50, h / 2 + 1);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#f2f6fd";
  g.font = `650 26px ${SANS}`;
  g.fillText(r.from, 98, 46);
  g.fillStyle = "rgba(225,235,252,0.52)";
  g.font = `450 22px ${SANS}`;
  g.fillText(r.subject, 98, 79);
  g.fillStyle = "rgba(225,235,252,0.3)";
  g.font = `400 18px ${MONO}`;
  g.textAlign = "right";
  g.fillText(r.time, w - 28, 46);
  return c;
}

// ── composition of the freeze frame (sprite centres, depth) ─────────────────
const NAME_AT = [
  [430, 470, 420],
  [700, 690, 520],
  [380, 930, 380],
  [720, 1170, 470],
  [400, 1400, 400],
  [690, 1620, 500],
] as const;

export function buildNoise(tl: gsap.core.Timeline) {
  const R = rng(1309);
  const fz = S.freeze;
  const Tf = travel(fz);
  const rf = roll(fz);
  const frags: Frag[] = [];
  /** place a fragment so that it sits at (sx, sy, z) when time stops */
  const placeAt = (f: Frag, sx: number, sy: number, z: number) => {
    const s = FOC / (FOC + z);
    const dx = (sx - CX) / s;
    const dy = (sy - CY) / s;
    f.x = dx * Math.cos(-rf) - dy * Math.sin(-rf);
    f.y = dx * Math.sin(-rf) + dy * Math.cos(-rf);
    f.z0 = mod(z + Tf, DEPTH);
  };
  const make = (bit: Bit, skip = false): Frag => {
    const sp = bitSprite(bit, skip);
    return { bit, x: 0, y: 0, z0: 0, ta: 0, w: sp.w, h: sp.h, img: sp.c, soft: defocus(sp.c) };
  };
  // the storm
  for (let rep = 0; rep < 3; rep++)
    for (const b of NOISE) {
      const f = make(b);
      f.x = (R() * 2 - 1) * 1150;
      f.y = (R() * 2 - 1) * 2050;
      f.z0 = R() * DEPTH;
      f.ta = 0.2 + 3.4 * Math.pow(R(), 0.85) + rep * 0.35;
      frags.push(f);
    }
  // the twelve that become the inbox
  ROWS.forEach((r, i) => {
    const f = make({ kind: r.from.startsWith("#") ? "chat" : r.from === "Calendar" ? "invite" : r.from === "Drive" ? "file" : "mail", title: r.from, body: r.subject, meta: r.time, initials: r.initials });
    placeAt(f, (i % 2 ? 750 : 330) + (R() * 2 - 1) * 70, 250 + i * 128 + (R() * 2 - 1) * 26, 950 + R() * 1400);
    f.ta = 0.3 + R() * 2.2;
    f.row = i;
    f.rowImg = rowSprite(r);
    frags.push(f);
  });
  // the six that hold the name
  meas.font = TITLE;
  NAME_BITS.forEach((b, i) => {
    const f = make(b, true);
    const [sx, sy, z] = NAME_AT[i];
    placeAt(f, sx, sy, z);
    f.ta = 0.6 + i * 0.35;
    f.letter = i;
    f.lx = -f.w / 2 + 78;
    f.ly = -f.h / 2 + 41;
    frags.push(f);
  });

  // ── storm canvas ──────────────────────────────────────────────────────────
  const canvas = $<HTMLCanvasElement>("#storm");
  sizeCanvas(canvas, 1);
  const g = canvas.getContext("2d")!;
  const st = { dim: 0, on: 1 };

  const proj = (f: Frag, t: number, dz = 0) => {
    const z = mod(f.z0 - travel(t), DEPTH) + dz;
    const s = FOC / (FOC + z);
    const r = roll(t);
    const px = f.x * s;
    const py = f.y * s;
    return { z, s, sz: s * K, r, sx: CX + px * Math.cos(r) - py * Math.sin(r), sy: CY + px * Math.sin(r) + py * Math.cos(r) };
  };
  for (const f of frags) {
    const p = proj(f, fz);
    f.fx = p.sx;
    f.fy = p.sy;
    f.fs = p.sz;
  }

  // the scan: two lines leave the name's line, one up, one down
  const SCAN = 0.8;
  const reach = (t: number) => {
    const p = clamp((t - S.scan) / SCAN);
    return 1 - (1 - p) * (1 - p);
  };
  const lineUp = (t: number) => YC - (YC + 80) * reach(t);
  const lineDown = (t: number) => YC + (H - YC + 80) * reach(t);
  for (const f of frags) {
    const up = f.fy! < YC;
    const d = Math.abs(f.fy! - YC) / (up ? YC + 80 : H - YC + 80);
    f.pass = S.scan + SCAN * (1 - Math.sqrt(Math.max(0, 1 - Math.min(1, d))));
  }

  const backOut = (x: number) => {
    const c = 1.06; // a whisper of overshoot as each row settles
    return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  };

  const draw = (img: HTMLCanvasElement, cx: number, cy: number, sx: number, sy: number, r: number, a: number) => {
    if (a <= 0.003) return;
    const c = Math.cos(r);
    const s = Math.sin(r);
    g.setTransform(sx * c, sx * s, -sy * s, sy * c, cx, cy);
    g.globalAlpha = Math.min(1, a);
    g.drawImage(img, -img.width / 2, -img.height / 2);
  };

  onFrame((t) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(0,0,0,0.004)"; // see light.ts: a fully clear canvas may not be re-presented
    g.fillRect(0, 0, 1, 1);
    if (!st.on || t > S.rows + 0.4) return;
    const tt = Math.min(t, fz);
    const v = speed(t);
    // camera: tremor building with the pressure, a punch when time stops
    const shake = clamp((t - 3.6) / 1.9) * (t < fz ? 1 : 0);
    const ox = shake * 5 * Math.sin(t * 37.1) * Math.sin(t * 13.3);
    const oy = shake * 5 * Math.sin(t * 29.7 + 1);
    const punch = t >= fz ? 1 + 0.045 * Math.exp(-(t - fz) * 7) : 1;
    const list = frags
      .map((f) => ({ f, p: proj(f, tt) }))
      .filter((o) => o.p.z > 40)
      .sort((a, b) => b.p.z - a.p.z);
    for (const { f, p } of list) {
      const appear = smooth(clamp((tt - f.ta) / 0.5));
      if (appear <= 0) continue;
      // glitchy arrival: a few flickers while it lands
      const age = tt - f.ta;
      const flick = age < 0.35 && t < fz ? (Math.sin(f.ta * 991 + Math.floor(t * 30) * 7.3) > -0.2 ? 1 : 0.25) : 1;
      const near = smooth(clamp((p.z - 25) / 260));
      const far = 1 - smooth(clamp((p.z - 2900) / 2300));
      let a = appear * near * far * flick;
      const named = f.letter !== undefined;
      if (t >= fz) a *= named ? 1 - 0.25 * st.dim : 1 - 0.7 * st.dim;
      let cx = (p.sx - CX) * punch + CX + ox;
      let cy = (p.sy - CY) * punch + CY + oy;
      let sx = p.sz * punch;
      let sy = sx;
      let r = p.r;
      if (t >= f.pass!) {
        const k = clamp((t - f.pass!) / 0.5);
        if (f.row !== undefined) {
          // snap into the inbox
          const e = backOut(k);
          const ty = rowY(f.row) + ROW.h / 2;
          cx = lerp(cx, CX, e);
          cy = lerp(cy, ty, e);
          r = lerp(r, 0, Math.min(1, e));
          const ww = lerp(f.w * sx, ROW.w, e);
          const hh = lerp(f.h * sx, ROW.h, e);
          const a0 = 1 - smooth(clamp(k * 1.8));
          const a1 = smooth(clamp(k * 1.6 - 0.15));
          const fade = 1 - smooth(clamp((t - S.rows) / 0.12));
          draw(f.img, cx, cy, ww / f.w, hh / f.h, r, a * a0 * fade + (1 - a0) * 0);
          draw(f.rowImg!, cx, cy, ww / ROW.w, hh / ROW.h, r, Math.max(a, 0.9) * a1 * fade);
          continue;
        }
        // everything else burns off in the light
        const kk = clamp((t - f.pass!) / 0.32);
        a *= 1 - smooth(kk);
        sx *= 1 - 0.45 * kk;
        sy *= 1 - 0.85 * kk;
      }
      // motion smear at speed: ghosts further back along the path
      if (v > 600 && p.z < 3000) {
        const q = clamp((v - 600) / 1800);
        for (let k = 3; k >= 1; k--) {
          const pg = proj(f, tt, v * 0.011 * k);
          draw(f.soft, (pg.sx - CX) * punch + CX + ox, (pg.sy - CY) * punch + CY + oy, pg.sz, pg.sz, pg.r, a * 0.24 * q * (1 - k / 4.5));
        }
      }
      // depth of field: far away and very close, the lens lets go
      const dof = t < fz ? Math.max(smooth(clamp((p.z - 2300) / 1500)), smooth(clamp((320 - p.z) / 260))) : 0;
      if (dof > 0.02) draw(f.soft, cx, cy, sx, sy, r, a * dof);
      if (dof < 0.98) draw(f.img, cx, cy, sx, sy, r, a * (1 - dof));
      // the first letter of the six, live (it leaves its notification at S.fly)
      if (named && t < S.fly) {
        const glow = smooth(clamp((t - S.glow) / 0.25));
        const c = Math.cos(r);
        const s = Math.sin(r);
        g.setTransform(sx * c, sx * s, -sy * s, sy * c, cx, cy);
        g.globalAlpha = a;
        g.font = `600 28px ${BRAND}`;
        g.fillStyle = `rgb(${Math.round(242 - 90 * glow)},${Math.round(246 - 46 * glow)},255)`;
        g.fillText(NAME_BITS[f.letter!].title[0], f.lx!, f.ly!);
        if (glow > 0) {
          g.globalCompositeOperation = "lighter";
          g.shadowColor = "rgba(70,140,255,0.95)";
          g.shadowBlur = 18 * glow;
          g.globalAlpha = 0.8 * glow;
          g.fillText(NAME_BITS[f.letter!].title[0], f.lx!, f.ly!);
          g.shadowBlur = 0;
          g.globalCompositeOperation = "source-over";
        }
      }
    }
  });

  tl.to(st, { dim: 1, duration: 0.5, ease: "power2.out" }, S.glow);
  tl.to(canvas, { filter: "blur(3px)", duration: 0.5, ease: "power2.out" }, S.fly);
  tl.to(canvas, { filter: "blur(0px)", duration: 0.25, ease: "power2.out" }, S.scan - 0.1);
  tl.to(st, { dim: 0, duration: 0.3 }, S.scan);

  // ── the counter (behind the storm) ────────────────────────────────────────
  const counter = html(`<div class="counter-wrap abs" style="width:1080px;height:1920px">
    <div class="counter" style="top:${CY - 330}px;font-size:500px">
      <div class="odo">${[2, 1, 0].map((k) => `<div class="dg" data-k="${k}"><div class="col">${"01234567890".split("").map((d) => `<span>${d}</span>`).join("")}</div></div>`).join("")}</div>
    </div>
    <div class="counter-label" style="top:${CY + 190}px">UNREAD</div>
  </div>`);
  back.appendChild(counter);
  const cells = Array.from(counter.querySelectorAll<HTMLElement>(".dg"));
  const cols = cells.map((c) => c.firstElementChild as HTMLElement);
  const label = counter.querySelector<HTMLElement>(".counter-label")!;
  const numEl = counter.querySelector<HTMLElement>(".counter")!;
  const DOWN = 1.05;
  const count = (t: number) => {
    if (t < 0.45) return 0;
    if (t < 5.3) {
      const u = (t - 0.45) / 4.85;
      return (312 * (Math.exp(3.2 * u) - 1)) / (Math.exp(3.2) - 1);
    }
    if (t < S.sort) return 312;
    const p = clamp((t - S.sort) / DOWN);
    return 2 + 310 * Math.pow(1 - p, 3.2);
  };
  onFrame((t) => {
    const c = count(t);
    const c2 = count(t + 1 / 120);
    const vel = Math.abs(c2 - c) * 120;
    cells.forEach((cell, j) => {
      const k = Number(cell.dataset.k);
      const p10 = Math.pow(10, k);
      let pos: number;
      if (k === 0) pos = c;
      else {
        const base = Math.floor(c / p10);
        pos = base + clamp((c % p10) - (p10 - 1));
      }
      const d = mod(pos, 10);
      cols[j].style.transform = `translate3d(0, ${(-d).toFixed(4)}em, 0)`;
      const vis = k === 0 ? 1 : smooth(clamp(c - (p10 - 1) + 0.0001));
      cell.style.width = `${(0.6 * vis).toFixed(4)}em`;
      cell.style.opacity = vis.toFixed(3);
      const blur = Math.min(10, (vel / p10) * 0.35);
      cols[j].style.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : "";
    });
  });
  gsap.set(counter, { transformOrigin: `540px ${CY}px` });
  tl.fromTo(counter, { opacity: 0, scale: 1.12, filter: "blur(24px)" }, { opacity: 0.94, scale: 1, filter: "blur(0px)", duration: 1.4, ease: "power2.out" }, 0.25);
  tl.to(counter, { scale: 1.07, duration: 4.0, ease: "none" }, 1.65);
  tl.to(counter, { opacity: 0.16, filter: "blur(10px)", scale: 1.1, duration: 0.6, ease: "power2.out" }, S.freeze + 0.05);
  tl.to(counter, { opacity: 0, duration: 0.25 }, S.ignite - 0.1);
  // ACT II·b: back, higher in the frame — it rolls down to the two that matter
  tl.fromTo(counter, { y: -300, scale: 0.92, filter: "blur(12px)" }, { y: -330, opacity: 1, scale: 0.88, filter: "blur(0px)", duration: 0.7, ease: "power3.out", immediateRender: false }, S.sort - 0.35);
  tl.to(label, { scrambleText: { text: "NEED YOU", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", speed: 0.6 }, color: "#9cc4ff", duration: 0.7, ease: "none" }, S.sort + 0.35);
  tl.to(numEl, { color: "#f6faff", textShadow: "0 0 80px rgba(70,130,255,0.6)", duration: 0.6 }, S.sort + 0.8);
  tl.to(counter, { scale: 1.7, y: -520, opacity: 0, filter: "blur(18px)", duration: 0.55, ease: "power3.in" }, S.dive - 0.1);
  cue("tick", 0.45, undefined, 0.5);

  // ── the name: six letters leave the noise ─────────────────────────────────
  const FS = 150;
  meas.font = `600 ${FS}px ${BRAND}`;
  const mA = meas.measureText("A");
  const baseOff = (FS - (mA.fontBoundingBoxAscent + mA.fontBoundingBoxDescent)) / 2 + mA.fontBoundingBoxAscent;
  const capH = mA.actualBoundingBoxAscent;
  const track = 0.16 * FS;
  const widths = NAME.split("").map((c) => meas.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (NAME.length - 1);
  const targets: Array<{ x: number; y: number }> = [];
  let xx = CX - total / 2;
  const baseY = YC + capH / 2;
  for (let i = 0; i < NAME.length; i++) {
    targets.push({ x: xx, y: baseY - baseOff });
    xx += widths[i] + track;
  }
  const wordL = CX - total / 2;
  const wordR = CX + total / 2;

  const named = frags.filter((f) => f.letter !== undefined).sort((a, b) => a.letter! - b.letter!);
  const letters = NAME.split("").map((ch) => {
    const el = html(`<span class="name-letter" style="font-size:${FS}px">${ch}</span>`);
    world.appendChild(el);
    return el;
  });
  const LS = named.map((f) => {
    const s = f.fs!;
    const k = (28 * s) / FS;
    const c = Math.cos(rf);
    const sn = Math.sin(rf);
    // title baseline point of the first letter on screen
    const bx = f.fx! + (f.lx! * c - f.ly! * sn) * s;
    const by = f.fy! + (f.lx! * sn + f.ly! * c) * s;
    // top-left of the DOM box (rotated) so that its baseline lands there
    return { x0: bx + sn * baseOff * k, y0: by - c * baseOff * k, k0: k, r0: rf, p: 0, glow: 1 };
  });
  const wm = { tight: 0, crush: 0, alpha: 1 };
  gsap.set(letters, { autoAlpha: 0 });
  tl.set(letters, { autoAlpha: 1 }, S.fly);
  tl.set(letters, { autoAlpha: 0 }, S.ignite + 0.02);
  const order = [0, 5, 1, 4, 2, 3]; // outside in
  order.forEach((i, j) => {
    tl.to(LS[i], { p: 1, duration: 0.95, ease: "power3.inOut" }, S.fly + 0.02 + j * 0.06);
    cue("chime", S.fly + 0.5 + j * 0.06, undefined, 0.35);
  });
  tl.to(LS, { glow: 0.25, duration: 0.6, ease: "power2.out" }, S.fly + 1.0);
  tl.to(wm, { tight: 1, duration: 0.55, ease: "power2.inOut" }, S.fly + 1.05);
  tl.to(wm, { crush: 1, duration: 0.2, ease: "power3.in" }, S.ignite - 0.2);
  onFrame((t) => {
    if (t < S.fly || t > S.ignite + 0.05) return;
    LS.forEach((L, i) => {
      const el = letters[i];
      const T = targets[i];
      const p = L.p;
      const arc = Math.sin(Math.PI * p);
      const side = L.x0 < CX ? -1 : 1;
      // quadratic arc: out to the side, then into place
      const cxp = (L.x0 + T.x) / 2 + side * 210;
      const cyp = (L.y0 + T.y) / 2 - 60;
      let x = (1 - p) * (1 - p) * L.x0 + 2 * (1 - p) * p * cxp + p * p * T.x;
      let y = (1 - p) * (1 - p) * L.y0 + 2 * (1 - p) * p * cyp + p * p * T.y;
      x += (CX - (T.x + widths[i] / 2)) * 0.05 * wm.tight;
      let sx = lerp(L.k0, 1, p) * (1 + 0.55 * arc);
      let sy = sx;
      const r = lerp(L.r0, 0, p) + 0.35 * arc * (i % 2 ? 1 : -1);
      // collapse into a line: the name becomes light
      const c = wm.crush;
      if (c > 0) {
        sy *= 1 - 0.96 * c;
        sx *= 1 + 0.25 * c;
        y += (baseOff - capH / 2) * 0.96 * c;
        x += (CX - (x + widths[i] / 2)) * 0.12 * c;
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(4)}rad) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      const blur = 7 * arc * arc;
      const gl = L.glow + c;
      el.style.filter = blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : "";
      const gk = Math.min(1, gl);
      el.style.color = `rgb(${Math.round(242 - 80 * gk)},${Math.round(246 - 40 * gk)},255)`;
      el.style.textShadow = `0 0 ${(18 + 46 * gl).toFixed(1)}px rgba(60,130,255,${(0.9 * gl).toFixed(3)})`;
    });
  });

  // ── light: the glint, the ignition, the scan ──────────────────────────────
  paint((g, t) => {
    // a glint runs along the assembled name
    const gp = (t - (S.fly + 1.15)) / 0.35;
    if (gp > 0 && gp < 1) streak(g, lerp(wordL - 60, wordR + 60, gp), YC, 260, 26, 0.8 * Math.sin(Math.PI * gp));
    // ignition: the crushed name becomes a line across the frame
    if (t > S.ignite - 0.2 && t < S.scan + 0.05) {
      const q = smooth(clamp((t - (S.ignite - 0.06)) / 0.16));
      const a = smooth(clamp((t - (S.ignite - 0.2)) / 0.16));
      hBeam(g, lerp(wordL, -40, q), lerp(wordR, W + 40, q), YC, 3, 70, a);
    }
    if (t >= S.ignite) {
      const k = t - S.ignite;
      flare(g, CX, YC, 700, Math.exp(-k * 3.2) * 0.95);
      streak(g, CX, YC, 1300, 60, Math.exp(-k * 2.6) * 0.9);
    }
    if (t >= S.scan && t < S.scan + SCAN + 0.4) {
      const a = 1 - smooth(clamp((t - (S.scan + SCAN - 0.15)) / 0.4));
      const yu = lineUp(t);
      const yd = lineDown(t);
      hBeam(g, -40, W + 40, yu, 2.5, 55, a, "110,165,255");
      hBeam(g, -40, W + 40, yd, 2.5, 55, a, "110,165,255");
      streak(g, CX, yu, 900, 30, 0.35 * a);
      streak(g, CX, yd, 900, 30, 0.35 * a);
    }
    // sparks where the light burns the noise
    for (const f of frags) {
      if (f.row !== undefined || f.letter !== undefined) continue;
      const k = t - f.pass!;
      if (k < 0 || k > 0.4) continue;
      const vis = f.fs! > 0.17 && f.fx! > -100 && f.fx! < W + 100;
      if (vis) flare(g, f.fx!, f.fy!, 120 * f.fs! + 30, 0.55 * Math.exp(-k * 9), "100,160,255");
    }
  });

  // ── atmosphere ────────────────────────────────────────────────────────────
  gsap.set(sky, { c1: "105,128,175", l1x: 0.5, l1y: 0.46, l1r: 0.55, l1i: 0, c2: "30,70,230", l2x: 0.5, l2y: 1.08, l2r: 0.5, l2i: 0, fog: 0.8 });
  tl.to(sky, { l1i: 0.45, l2i: 0.2, duration: 5.0, ease: "power1.in" }, 0.3);
  tl.to(sky, { drift: 2.4, duration: 5.3, ease: "power2.in" }, 0.2);
  tl.to(sky, { l1i: 0.06, l2i: 0, duration: 0.25, ease: "power3.out" }, S.freeze);
  tl.to(sky, { c1: "80,145,255", l1y: YC / H, l1r: 0.34, l1i: 0.55, duration: 1.2, ease: "power2.inOut" }, S.fly + 0.1);
  tl.to(sky, { l1i: 1.1, l1r: 0.42, duration: 0.08, ease: "power2.out" }, S.ignite - 0.02);
  tl.to(sky, { l1i: 0.16, l1r: 0.5, c1: "50,110,255", duration: 0.9, ease: "power3.out" }, S.ignite + 0.08);
  tl.to(sky, { top: "3,6,14", bot: "6,13,34", c2: "40,95,255", l2i: 0.22, l2y: 1.12, duration: 1.4, ease: "power2.inOut" }, S.scan);

  // sound of the storm
  for (let k = 0; k < 26; k++) {
    const tt = 0.5 + 4.9 * Math.pow(k / 26, 0.7);
    cue("tick", tt, undefined, 0.25 + 0.5 * (k / 26));
  }
  cue("riser", 2.0, 3.5, 0.9);
  cue("hit", S.freeze, undefined, 0.5);
  cue("soft", S.glow, undefined, 0.6);
  cue("whoosh", S.fly, 1.0, 0.6);
  cue("hit", S.ignite, undefined, 1.0);
  cue("sweep", S.scan, 0.9, 1.0);
  frags
    .filter((f) => f.row !== undefined)
    .sort((a, b) => a.pass! - b.pass!)
    .forEach((f, i) => i % 2 === 0 && cue("click", f.pass! + 0.2, undefined, 0.7));
  void VO;
}
