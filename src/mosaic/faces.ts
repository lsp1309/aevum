import type { Face } from "./flap";

/** Face library shared by the walls. */
const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICON = {
  mail: svg(`<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="m4 7 8 6 8-6"/>`),
  cal: svg(`<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>`),
  doc: svg(`<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6"/>`),
  bell: svg(`<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>`),
  chat: svg(`<path d="M4.5 6.5h15v9h-8l-4 3.5v-3.5h-3z"/>`),
  card: svg(`<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M7 14.5h4"/>`),
  truck: svg(`<path d="M3.5 7h10v9h-10zM13.5 10h4l3 3v3h-7z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>`),
  clip: svg(`<path d="m15.5 7.5-6.2 6.2a2 2 0 0 0 2.8 2.8l6.4-6.4a4 4 0 0 0-5.7-5.7L6.3 10.9a6 6 0 0 0 8.5 8.5l5-5"/>`),
  check: svg(`<path d="m6 12.5 4 4 8-9"/>`),
};

export const FACES: Face[] = [];
export const F: Record<string, number> = {};
const add = (key: string, c: string, h = "") => {
  F[key] = FACES.length;
  FACES.push({ c, h });
  return F[key];
};

add("blank", "blank");
add("cobalt", "c");
add("white", "w");
add("porc", "p");
// the noise: icons and scraps of every kind, white on lacquer
export const NOISE: number[] = [];
for (const [k, v] of Object.entries(ICON)) if (k !== "check") NOISE.push(add(`i-${k}`, "k", v));
for (const w of ["RE:", "FWD", "URGENT", "ASAP", "PDF", "Q4", "14:00", "09:30", "SIGN", "CALL", "DUE", "CHF", "INV", "#OPS", "OOO", "NEW", "TODO", "@"]) NOISE.push(add(`w-${w}`, "k", `<span class="w${w.length <= 3 ? " lg" : ""}">${w}</span>`));
for (const n of ["9+", "3", "12", "48", "!", "7"]) NOISE.push(add(`n-${n}`, "k", `<span class="w xl">${n}</span><i class="badge"></i>`));
// a few lit in cobalt: the odd urgent thing
export const ACCENT: number[] = [];
for (const w of ["!", "9+", "NOW"]) ACCENT.push(add(`c-${w}`, "c", `<span class="w ${w.length < 3 ? "xl" : "lg"}">${w}</span>`));
for (const k of ["mail", "bell"] as const) ACCENT.push(add(`ci-${k}`, "c", ICON[k]));
// letters for words spelled by the wall
export const LETTER: Record<string, number> = {};
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") LETTER[ch] = add(`L-${ch}`, "k", `<span class="w xl">${ch}</span>`);
export const LETTER_C: Record<string, number> = {};
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") LETTER_C[ch] = add(`LC-${ch}`, "c", `<span class="w xl">${ch}</span>`);
// the name, on white flaps, in its own typeface
export const BRAND: Record<string, number> = {};
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") BRAND[ch] = add(`B-${ch}`, "w brand", `<span>${ch}</span>`);
