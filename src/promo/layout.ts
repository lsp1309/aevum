/** Geometry shared by the scenes that hand elements to each other. */

/** The week (act III·b): a vertical day, 09:00 → 17:00. */
export const DAY = { top: 250, hour: 170, from: 9, x: 200, w: 800, label: 70 };
export const hourY = (h: number) => DAY.top + (h - DAY.from) * DAY.hour;
/** A block of the day, inset 4 px top and bottom. */
export const slot = (from: number, to: number) => ({ x: DAY.x, y: hourY(from) + 4, w: DAY.w, h: (to - from) * DAY.hour - 8 });

/** Where "Thursday at 14:30" lands: the pricing call with Luka. */
export const PRICING = slot(14.5, 15.5);

/** The agents (act III·c) open out of three hour lines. */
export const LANE_HOURS = [11, 13, 15];
export const LANE_H = 300;
