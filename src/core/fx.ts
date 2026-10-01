import { onFrame, rng, clamp } from "./clock";
import { sprite } from "./background";
import { $, H, W, onResize } from "./stage";

type Draw = (ctx: CanvasRenderingContext2D, p: number, t: number) => void;
interface Effect {
  start: number;
  dur: number;
  draw: Draw;
}
const effects: Effect[] = [];

let spriteW: HTMLCanvasElement;
let spriteB: HTMLCanvasElement;
let spriteC: HTMLCanvasElement;

export function initFx() {
  const canvas = $<HTMLCanvasElement>("#fx");
  const ctx = canvas.getContext("2d")!;
  let k = 1;
  onResize((s) => {
    k = Math.min(1.5, Math.max(0.6, s * (window.devicePixelRatio || 1)));
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
  });
  spriteW = sprite(48, "240,246,255", 0.12);
  spriteB = sprite(48, "120,160,255", 0.12);
  spriteC = sprite(48, "160,215,255", 0.12);

  let wasEmpty = false;
  onFrame((t) => {
    const active = effects.filter((e) => t >= e.start && t <= e.start + e.dur);
    if (!active.length) {
      if (!wasEmpty) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.visibility = "hidden";
      }
      wasEmpty = true;
      return;
    }
    if (wasEmpty) canvas.style.visibility = "visible";
    wasEmpty = false;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const e of active) {
      ctx.save();
      e.draw(ctx, (t - e.start) / e.dur, t);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
}

export function addFx(start: number, dur: number, draw: Draw) {
  effects.push({ start, dur, draw });
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeIn = (x: number) => x * x * x;
const pick = (v: number) => (v < 0.45 ? spriteW : v < 0.8 ? spriteB : spriteC);

export interface Pt {
  x: number;
  y: number;
}

/** Rasterise text with the real webfont and return glyph sample points (stage coords). */
export function sampleText(text: string, font: string, spacingPx: number, cx: number, cy: number, step = 6) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = 400;
  const g = c.getContext("2d")!;
  g.font = font;
  (g as unknown as { letterSpacing: string }).letterSpacing = `${spacingPx}px`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff";
  g.fillText(text, W / 2 + spacingPx / 2, 200);
  const data = g.getImageData(0, 0, W, 400).data;
  const pts: Pt[] = [];
  for (let y = 0; y < 400; y += step) {
    for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 140) pts.push({ x: x - W / 2 + cx, y: y - 200 + cy });
    }
  }
  return pts;
}

/** Dust drifting in from the dark and condensing onto target points. */
export function converge(start: number, dur: number, targets: Pt[], seed = 1, spread = 700) {
  const rand = rng(seed);
  const ps = targets.map((p) => {
    const a = rand() * Math.PI * 2;
    const d = spread * (0.35 + rand() * 0.65);
    return {
      tx: p.x,
      ty: p.y,
      sx: p.x + Math.cos(a) * d,
      sy: p.y + Math.sin(a) * d * 0.6,
      delay: rand() * 0.35,
      size: 1.2 + rand() * 2.2,
      tint: rand(),
      curl: (rand() - 0.5) * 1.6,
    };
  });
  addFx(start, dur, (ctx, p) => {
    for (const q of ps) {
      const lp = clamp((p - q.delay) / 0.6);
      if (lp <= 0) continue;
      const e = easeExpo(lp);
      const ang = (1 - e) * q.curl;
      const dx = (q.sx - q.tx) * (1 - e);
      const dy = (q.sy - q.ty) * (1 - e);
      const x = q.tx + dx * Math.cos(ang) - dy * Math.sin(ang);
      const y = q.ty + dx * Math.sin(ang) + dy * Math.cos(ang);
      const fadeIn = clamp(lp * 3);
      const fadeOut = 1 - clamp((p - 0.72) / 0.28);
      ctx.globalAlpha = 0.8 * fadeIn * fadeOut;
      const s = q.size * (1 + (1 - e) * 1.5) * 2.2;
      ctx.drawImage(pick(q.tint), x - s, y - s, s * 2, s * 2);
    }
  });
}

/** Particles spiralling into a single point. */
export function implode(start: number, dur: number, cx: number, cy: number, n = 220, radius = 900, seed = 2) {
  const rand = rng(seed);
  const ps = Array.from({ length: n }, () => ({
    a: rand() * Math.PI * 2,
    r: radius * (0.25 + rand() * 0.75),
    delay: rand() * 0.45,
    size: 1 + rand() * 2.4,
    tint: rand(),
    spin: 0.8 + rand() * 1.6,
  }));
  addFx(start, dur, (ctx, p) => {
    for (const q of ps) {
      const lp = clamp((p - q.delay) / 0.55);
      if (lp <= 0 || lp >= 1) continue;
      const e = easeIn(lp);
      const r = q.r * (1 - e);
      const a = q.a + e * q.spin;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.62;
      ctx.globalAlpha = Math.sin(lp * Math.PI) * 0.85;
      const s = q.size * 2.4;
      // short tangent streak sells the velocity
      ctx.strokeStyle = "rgba(170,200,255,0.28)";
      ctx.lineWidth = q.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const pa = q.a + (e - 0.06) * q.spin;
      const pr = q.r * (1 - Math.max(0, e - 0.08));
      ctx.lineTo(cx + Math.cos(pa) * pr, cy + Math.sin(pa) * pr * 0.62);
      ctx.stroke();
      ctx.drawImage(pick(q.tint), x - s, y - s, s * 2, s * 2);
    }
  });
}

/** Radial sparks with drag. */
export function burst(start: number, dur: number, cx: number, cy: number, n = 120, speed = 520, seed = 3, flatten = 0.7) {
  const rand = rng(seed);
  const ps = Array.from({ length: n }, () => ({
    a: rand() * Math.PI * 2,
    v: speed * (0.25 + rand() * 0.75),
    size: 0.8 + rand() * 2,
    tint: rand(),
    life: 0.5 + rand() * 0.5,
  }));
  addFx(start, dur, (ctx, p) => {
    for (const q of ps) {
      const lp = clamp(p / q.life);
      if (lp >= 1) continue;
      const d = q.v * easeOut(lp);
      const x = cx + Math.cos(q.a) * d;
      const y = cy + Math.sin(q.a) * d * flatten;
      ctx.globalAlpha = (1 - lp) * 0.9;
      const s = q.size * 2.2 * (1 - lp * 0.5);
      ctx.drawImage(pick(q.tint), x - s, y - s, s * 2, s * 2);
    }
  });
}

/** Expanding ring of light. */
export function shockwave(start: number, dur: number, cx: number, cy: number, maxR = 600, flatten = 1, width = 2) {
  addFx(start, dur, (ctx, p) => {
    const e = easeOut(p);
    const r = 8 + maxR * e;
    const a = Math.pow(1 - p, 1.6);
    ctx.globalAlpha = a * 0.5;
    ctx.strokeStyle = "rgb(150,190,255)";
    ctx.lineWidth = width * (1 - p) + 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * flatten, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = a * 0.12;
    ctx.lineWidth = width * 10 * (1 - p) + 2;
    ctx.stroke();
  });
}

/** Embers released from a rectangle, rising and spreading — UI turning to light. */
export function dissolve(start: number, dur: number, rect: { x: number; y: number; w: number; h: number }, n = 260, seed = 4) {
  const rand = rng(seed);
  const ps = Array.from({ length: n }, () => {
    const edge = rand() < 0.6;
    const u = rand();
    const v = rand();
    return {
      x: rect.x + (edge ? (rand() < 0.5 ? 0 : 1) * rect.w + (rand() - 0.5) * 30 : u * rect.w),
      y: rect.y + (edge ? v * rect.h : v * rect.h),
      vx: (rand() - 0.5) * 220,
      vy: -40 - rand() * 220,
      delay: rand() * 0.4,
      size: 0.8 + rand() * 2.2,
      tint: rand(),
    };
  });
  addFx(start, dur, (ctx, p) => {
    for (const q of ps) {
      const lp = clamp((p - q.delay) / 0.6);
      if (lp <= 0 || lp >= 1) continue;
      const e = easeOut(lp);
      ctx.globalAlpha = Math.sin(lp * Math.PI) * 0.8;
      const s = q.size * 2.2;
      ctx.drawImage(pick(q.tint), q.x + q.vx * e - s, q.y + q.vy * e - s, s * 2, s * 2);
    }
  });
}

/** Sparkles shed by a moving point (path provided as a function of progress). */
export function trail(start: number, dur: number, path: (p: number) => Pt, n = 90, seed = 5) {
  const rand = rng(seed);
  const ps = Array.from({ length: n }, (_, i) => ({
    at: i / n,
    ox: (rand() - 0.5) * 18,
    oy: (rand() - 0.5) * 18,
    vx: (rand() - 0.5) * 60,
    vy: (rand() - 0.5) * 60 - 20,
    size: 0.8 + rand() * 1.8,
    tint: rand(),
    life: 0.18 + rand() * 0.2,
  }));
  addFx(start, dur, (ctx, p) => {
    for (const q of ps) {
      const age = (p - q.at) / q.life;
      if (age < 0 || age > 1) continue;
      const o = path(q.at);
      ctx.globalAlpha = (1 - age) * 0.85;
      const s = q.size * 2.2 * (1 - age * 0.6);
      ctx.drawImage(pick(q.tint), o.x + q.ox + q.vx * age - s, o.y + q.oy + q.vy * age - s, s * 2, s * 2);
    }
    if (p < 1) {
      const o = path(p);
      ctx.globalAlpha = 1;
      ctx.drawImage(spriteW, o.x - 10, o.y - 10, 20, 20);
    }
  });
}

/** A single drifting mote of light with a fading tail. */
export function mote(start: number, dur: number, path: (p: number) => Pt, alpha: (p: number) => number) {
  addFx(start, dur, (ctx, p) => {
    const a = alpha(p);
    if (a <= 0) return;
    for (let i = 14; i >= 0; i--) {
      const q = Math.max(0, p - i * 0.012);
      const o = path(q);
      ctx.globalAlpha = a * (1 - i / 15) * 0.45;
      const s = 6 - i * 0.3;
      ctx.drawImage(spriteB, o.x - s, o.y - s, s * 2, s * 2);
    }
    const o = path(p);
    ctx.globalAlpha = a;
    ctx.drawImage(spriteW, o.x - 9, o.y - 9, 18, 18);
    ctx.globalAlpha = a * 0.35;
    ctx.drawImage(spriteB, o.x - 40, o.y - 40, 80, 80);
  });
}

/** Slow dust orbiting a point on a flattened ellipse — used around name lockups. */
export function orbitDust(start: number, dur: number, cx: number, cy: number, rx: number, ry: number, n = 140, seed = 6) {
  const rand = rng(seed);
  const ps = Array.from({ length: n }, () => ({
    a: rand() * Math.PI * 2,
    rr: 0.55 + rand() * 0.75,
    sp: (0.04 + rand() * 0.08) * (rand() < 0.5 ? 1 : 1),
    size: 0.5 + rand() * 1.5,
    tint: rand(),
    wob: rand() * 6.28,
  }));
  addFx(start, dur, (ctx, p, t) => {
    const env = clamp(p / 0.15) * (1 - clamp((p - 0.85) / 0.15));
    for (const q of ps) {
      const a = q.a + t * q.sp;
      const x = cx + Math.cos(a) * rx * q.rr;
      const y = cy + Math.sin(a) * ry * q.rr + Math.sin(t * 0.6 + q.wob) * 6;
      const depth = 0.5 + 0.5 * Math.sin(a);
      ctx.globalAlpha = env * (0.25 + depth * 0.55);
      const s = q.size * (1.6 + depth * 1.4);
      ctx.drawImage(pick(q.tint), x - s, y - s, s * 2, s * 2);
    }
  });
}
