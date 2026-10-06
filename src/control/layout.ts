/**
 * One film, two formats. control.html is 16:9, control9.html is 9:16: every
 * screen keeps its own design and is placed (and scaled) per format here.
 */
export const V = typeof location !== "undefined" && location.pathname.includes("control9");
export const W = V ? 1080 : 1920;
export const H = V ? 1920 : 1080;

export interface Box {
  x: number;
  y: number;
  /** the screen's own (design) size */
  w: number;
  h: number;
  /** uniform scale applied in this format */
  s: number;
}
const centered = (w: number, h: number, s: number, cy = H / 2): Box => ({ x: (W - w * s) / 2, y: cy - (h * s) / 2, w, h, s });
const at = (x: number, y: number, w: number, h: number, s = 1): Box => ({ x, y, w, h, s });

export const L = V
  ? {
      inbox: centered(800, 860, 1.2),
      mail: centered(1100, 760, 0.92),
      reply: centered(1000, 660, 0.98, 900),
      cal: centered(1260, 740, 0.82, 900),
      tasks: centered(880, 700, 1.1, 700),
      agent: centered(560, 400, 1.55, 1400),
      morning: at(80, 430, 900, 420, 1.02),
      doc: centered(560, 330, 1.5, 1250),
      handled: { x: 350, y: 1590 },
      chips: [
        [300, 330],
        [780, 330],
        [300, 420],
        [780, 420],
      ],
    }
  : {
      inbox: at(560, 110, 800, 860),
      mail: at(410, 160, 1100, 760),
      reply: at(460, 190, 1000, 660),
      cal: at(330, 150, 1260, 740),
      tasks: at(240, 190, 880, 700),
      agent: at(1170, 300, 560, 400),
      morning: at(200, 360, 900, 420),
      doc: at(1180, 330, 560, 330),
      handled: { x: 1180, y: 730 },
      chips: [
        [420, 205],
        [780, 205],
        [1140, 205],
        [1500, 205],
      ],
    };

/** Row centres of the organized inbox, in stage px (where the 3D cards land). */
const ROW_LOCAL = [208, 326, 444, 562, 680];
export const ROWS_Y = ROW_LOCAL.map((y) => L.inbox.y + y * L.inbox.s);
/** On-screen width of an inbox row, in stage px. */
export const ROW_W = 760 * L.inbox.s;
/** A screen's rectangle on stage: [x, y, w, h]. */
export const rect = (b: Box): [number, number, number, number] => [b.x, b.y, b.w * b.s, b.h * b.s];
