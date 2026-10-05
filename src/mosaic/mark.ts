import { RING_A, RING_B, RING_W, RING_TILT } from "../core/icons";

/** The Astrya ring, as a filled band (ellipse annulus), in its own units (−200…200). */
const ell = (a: number, b: number) => `M${-a} 0a${a} ${b} 0 1 0 ${2 * a} 0a${a} ${b} 0 1 0 ${-2 * a} 0`;
const IN_A = RING_A - RING_W;
const IN_B = (IN_A * RING_B) / RING_A;
export const BAND = `${ell(RING_A, RING_B)}${ell(IN_A, IN_B)}`;
export const TILT = RING_TILT;

export function markSvg(fill: string, size: number, cls = "") {
  return `<svg class="${cls}" viewBox="-200 -200 400 400" width="${size}" height="${size}" fill="none"><g transform="rotate(${TILT})"><path d="${BAND}" fill="${fill}" fill-rule="evenodd"/></g></svg>`;
}

/** Is the point (x, y) (mark units, before tilt is applied to the ring) inside the band? */
export function inBand(x: number, y: number) {
  const th = (-TILT * Math.PI) / 180;
  const u = x * Math.cos(th) - y * Math.sin(th);
  const v = x * Math.sin(th) + y * Math.cos(th);
  const o = (u * u) / (RING_A * RING_A) + (v * v) / (RING_B * RING_B);
  const i = (u * u) / (IN_A * IN_A) + (v * v) / (IN_B * IN_B);
  return o <= 1 && i >= 1;
}
