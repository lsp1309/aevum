import { onFrame } from "../core/clock";
import { $, sizeCanvas } from "./stage";

/**
 * The light layer (screen-blended over the world): the thread, scan lines,
 * trails, pulses and flares. Painters register in order; the canvas is
 * cleared and repainted every frame from time alone.
 */
const canvas = $<HTMLCanvasElement>("#light");
sizeCanvas(canvas, 1);
export const lctx = canvas.getContext("2d")!;
type Painter = (g: CanvasRenderingContext2D, t: number) => void;
const painters: Painter[] = [];
export function paint(fn: Painter) {
  painters.push(fn);
}

export function initLight() {
  onFrame((t) => {
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, canvas.width, canvas.height);
    // never leave the canvas fully clear: Chromium may then keep presenting
    // the previous frame. One near-transparent pixel in the corner.
    lctx.fillStyle = "rgba(0,0,0,0.004)";
    lctx.fillRect(0, 0, 1, 1);
    lctx.globalCompositeOperation = "lighter";
    for (const p of painters) {
      lctx.save();
      p(lctx, t);
      lctx.restore();
    }
  });
}

/** "r,g,b" → rgba() */
export const rgba = (c: string, a: number) => `rgba(${c},${Math.max(0, Math.min(1, a)).toFixed(4)})`;

/** A horizontal beam of light across [x0,x1] at y: hot core + soft bloom. */
export function hBeam(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, core: number, glow: number, a: number, c = "150,195,255") {
  if (a <= 0.002 || x1 <= x0) return;
  const R = glow;
  const gr = g.createLinearGradient(0, y - R, 0, y + R);
  gr.addColorStop(0, rgba(c, 0));
  gr.addColorStop(0.5 - core / (2 * R), rgba(c, 0.18 * a));
  gr.addColorStop(0.5, rgba("244,249,255", a));
  gr.addColorStop(0.5 + core / (2 * R), rgba(c, 0.18 * a));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(x0, y - R, x1 - x0, 2 * R);
}

/** A soft round flare. */
export function flare(g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, c = "140,190,255") {
  if (a <= 0.002 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba("246,250,255", a));
  gr.addColorStop(0.12, rgba(c, 0.55 * a));
  gr.addColorStop(0.4, rgba(c, 0.14 * a));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
}

/** An anamorphic streak (horizontal lens flare). */
export function streak(g: CanvasRenderingContext2D, x: number, y: number, len: number, h: number, a: number, c = "130,180,255") {
  if (a <= 0.002) return;
  g.save();
  g.translate(x, y);
  g.scale(len / 100, h / 100);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 100);
  gr.addColorStop(0, rgba("244,249,255", a));
  gr.addColorStop(0.3, rgba(c, 0.4 * a));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(-100, -100, 200, 200);
  g.restore();
}

/** A glowing polyline / curve (stroked several times, wide → narrow). */
export function glowPath(g: CanvasRenderingContext2D, path: Path2D, w: number, a: number, c = "130,180,255") {
  if (a <= 0.002) return;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const [k, al] of [
    [7, 0.05],
    [3.2, 0.12],
    [1.6, 0.35],
    [0.6, 1],
  ] as const) {
    g.strokeStyle = k < 1 ? rgba("242,248,255", a * al) : rgba(c, a * al);
    g.lineWidth = w * k;
    g.stroke(path);
  }
}
