import { gsap } from "../../core/gsap";
import { onFrame, rng, clamp, smooth, cue } from "../../core/clock";
import { html, world, $, CX, CY } from "../../promo/stage";
import { T, VO } from "../timing";
import { Wall } from "../flap";
import { FACES, F, NOISE, ACCENT, LETTER } from "../faces";
import { paint, flare } from "../../promo/light";

/**
 * ACT I — PIECES. Darkness, one tile clacking. The camera pulls back: a whole
 * wall of split-flap tiles flips through scraps of work — envelopes, "RE:",
 * "9+", "URGENT"… The wall lies down and the camera races along it; the
 * flipping speeds up; the wall itself spells EVERYTHING, then NOTHING.
 * Then every tile drops blank at once.
 * ACT II — TOGETHER. From one tile, a cobalt wave turns the wall Klein blue,
 * and white tiles spell the name — AST / RYA — like a mosaic. Then the
 * mosaic bursts towards the camera, tile by tile, onto the app behind it.
 */
const COLS = 13;
const ROWS = 36;
const SIZE = 77;
const GAP = 6;
const P = SIZE + GAP;
const C0 = 6; // centre column
const R0 = 22; // the row the film opens on
const RL = 12; // first row of the name

// a 3×5 pixel alphabet for the name
const GLYPH: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  S: ["###", "#..", "###", "..#", "###"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
};

export const cam = { fx: 0, fy: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };

export function buildFragments(tl: gsap.core.Timeline) {
  const R = rng(2026);
  const wall = new Wall({ cols: COLS, rows: ROWS, size: SIZE, gap: GAP, faces: FACES, base: F.blank, cls: "w-frag" });
  const root = html(`<section class="scene" id="s-frag"><div class="rig"></div></section>`);
  const rig = root.querySelector<HTMLElement>(".rig")!;
  rig.appendChild(wall.el);
  world.appendChild(root);
  const centre = (c: number, r: number) => ({ x: c * P + SIZE / 2, y: r * P + SIZE / 2 });

  // ── camera path ────────────────────────────────────────────────────────
  const start = centre(C0, R0);
  Object.assign(cam, { fx: start.x, fy: start.y, z: 0, rx: 0, ry: 0, rz: -6, s: 4.4 });
  const yTilt0 = start.y;
  const yTilt1 = centre(C0, 3).y;
  const easeTravel = gsap.parseEase("power2.in");
  const travelY = (t: number) => yTilt0 + (yTilt1 - yTilt0) * easeTravel(clamp((t - T.tilt) / (T.reset - 0.3 - T.tilt)));
  // pull back: from one tile to the whole wall
  tl.to(cam, { s: 1.04, rz: 3, duration: T.tilt - T.pull + 0.2, ease: "expo.inOut" }, T.pull);
  // the wall lies down; the camera races along it
  tl.to(cam, { rx: 56, s: 1.32, z: -80, rz: -11, duration: 1.4, ease: "power3.inOut" }, T.tilt);
  const travel = { p: 0 };
  tl.to(travel, { p: 1, duration: T.reset - 0.3 - T.tilt, ease: "none" }, T.tilt);
  onFrame((t) => {
    if (t >= T.tilt && t <= T.reset) cam.fy = travelY(t);
  });
  // swing back to face the wall, on the name's rows
  const nameC = centre(C0, RL + 5);
  tl.to(cam, { fx: nameC.x, fy: nameC.y, rx: 0, rz: 0, s: 1.0, z: 0, duration: 0.55, ease: "power3.inOut", immediateRender: false }, T.reset - 0.3);
  tl.to(cam, { s: 1.07, rz: -1.5, duration: T.burst - T.wave, ease: "sine.inOut" }, T.wave);
  tl.to(cam, { z: 420, duration: 0.9, ease: "power2.in" }, T.burst);
  onFrame(() => {
    rig.style.transform = `translate3d(${CX}px, ${CY}px, ${cam.z.toFixed(2)}px) rotateX(${cam.rx.toFixed(3)}deg) rotateY(${cam.ry.toFixed(3)}deg) rotateZ(${cam.rz.toFixed(3)}deg) scale(${cam.s.toFixed(4)}) translate3d(${(-cam.fx).toFixed(2)}px, ${(-cam.fy).toFixed(2)}px, 0)`;
  });
  // motion blur while the camera swings
  tl.fromTo(rig, { filter: "blur(0px)" }, { filter: "blur(3px)", duration: 0.25, ease: "power2.in", yoyo: true, repeat: 1, immediateRender: false }, T.reset - 0.3);

  // ── the noise ──────────────────────────────────────────────────────────
  // reserved windows (rows spelling words) — no noise there meanwhile
  const words: Array<{ text: string; t0: number; t1: number; r: number; c: number }> = [];
  const rowAt = (t: number) => Math.round((travelY(t) - SIZE / 2) / P);
  words.push({ text: "EVERYTHING", t0: VO.nothing.start + 0.05, t1: VO.nothing.start + 1.05, r: rowAt(VO.nothing.start + 0.5) - 1, c: 1 });
  words.push({ text: "NOTHING", t0: VO.nothing.phrases[1] + 0.05, t1: T.reset - 0.25, r: rowAt(VO.nothing.phrases[1] + 0.5) - 1, c: 3 });
  const reserved = (i: number, t: number) => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    return words.some((w) => r === w.r && c >= w.c && c < w.c + w.text.length && t > w.t0 - 0.2 && t < w.t1 + 0.05);
  };
  const STOP = T.reset - 0.12;
  wall.tiles.forEach((tile, i) => {
    const d = Math.hypot(tile.c - C0, (tile.r - R0) * 1.1);
    // the first tile opens the film on its own
    let t = i === wall.idx(C0, R0) ? 0.12 : 0.55 + d * 0.11 + R() * 0.5;
    while (t < STOP) {
      const heat = smooth(clamp((t - 0.6) / 4.6));
      if (!reserved(i, t)) {
        const f = R() < 0.06 + 0.06 * heat ? ACCENT[Math.floor(R() * ACCENT.length)] : NOISE[Math.floor(R() * NOISE.length)];
        wall.flip(i, t, f, 0.11 + 0.05 * (1 - heat));
      }
      t += (0.95 - 0.74 * heat) * (0.55 + R() * 0.9);
    }
  });
  // the first tile: three clacks in the dark
  const first = wall.idx(C0, R0);
  wall.tiles[first].segs.length = 0;
  [
    [0.12, F["i-mail"]],
    [0.62, F["n-9+"]],
    [1.02, F["w-URGENT"]],
  ].forEach(([t, f]) => wall.flip(first, t, f, 0.13));
  // words spelled by the wall
  for (const w of words)
    [...w.text].forEach((ch, k) => {
      const i = wall.idx(w.c + k, w.r);
      wall.flip(i, w.t0 + k * 0.035, LETTER[ch], 0.12);
      wall.flip(i, w.t1 + k * 0.02, NOISE[(k * 5 + w.r) % NOISE.length], 0.12);
    });
  // reset: every tile drops blank at once
  wall.tiles.forEach((_, i) => wall.flip(i, T.reset + R() * 0.07, F.blank, 0.1));

  // ── the cobalt wave, the name ──────────────────────────────────────────
  const oc = C0;
  const or = RL + 5;
  const nameTiles = new Set<number>();
  const rowsOf = ["AST", "RYA"];
  rowsOf.forEach((word, line) =>
    [...word].forEach((ch, li) =>
      GLYPH[ch].forEach((row, gy) =>
        [...row].forEach((px, gx) => {
          if (px === "#") nameTiles.add(wall.idx(1 + li * 4 + gx, RL + line * 6 + gy));
        }),
      ),
    ),
  );
  wall.tiles.forEach((tile, i) => {
    const d = Math.hypot(tile.c - oc, tile.r - or);
    if (Math.abs(tile.r - or) > 16) return;
    wall.flip(i, T.wave + d * 0.034, F.cobalt, 0.12);
    if (nameTiles.has(i)) {
      const line = tile.r >= RL + 6 ? 1 : 0;
      const letter = Math.floor((tile.c - 1) / 4);
      wall.flip(i, T.letters + (line * 3 + letter) * 0.11 + (tile.r - RL - line * 6) * 0.03, F.white, 0.13);
    }
  });
  wall.seal();

  // ── burst: the mosaic flies apart toward the camera ────────────────────
  const nc = centre(oc, or);
  const rnd = wall.tiles.map(() => [R() * 2 - 1, R() * 2 - 1, R()]);
  wall.xf = (i, t) => {
    if (t < T.burst) return "";
    const tile = wall.tiles[i];
    const dx = tile.x + SIZE / 2 - nc.x;
    const dy = tile.y + SIZE / 2 - nc.y;
    const d = Math.hypot(dx, dy);
    const k = smooth(clamp((t - T.burst - d * 0.00045 - rnd[i][2] * 0.08) / 0.75));
    if (k <= 0) return "";
    const kk = k * k;
    tile.el.style.opacity = (1 - smooth(clamp((k - 0.55) / 0.45))).toFixed(3);
    return `translate3d(${(dx * 1.6 * kk).toFixed(1)}px, ${(dy * 1.6 * kk).toFixed(1)}px, ${(1100 * kk + 200 * rnd[i][2] * k).toFixed(1)}px) rotateX(${(rnd[i][0] * 160 * k).toFixed(1)}deg) rotateY(${(rnd[i][1] * 160 * k).toFixed(1)}deg)`;
  };
  tl.set(wall.el, { transformStyle: "preserve-3d" }, T.burst - 0.01);
  tl.set(root, { visibility: "visible" }, 0);
  tl.set(root, { visibility: "hidden" }, T.bento + 0.25);
  tl.call(() => void 0, [], T.bento + 0.3);
  wall.to = T.bento + 0.3;

  // ── light & studio ─────────────────────────────────────────────────────
  const base = $(".st-base");
  const key = $(".st-key");
  const fill = $(".st-fill");
  gsap.set(key, { opacity: 0 });
  tl.to(key, { opacity: 1, duration: 2.0, ease: "power2.out" }, T.pull);
  tl.to(fill, { opacity: 0.5, duration: 2.5, ease: "power1.in" }, T.tilt);
  tl.to([key, fill], { opacity: 0, duration: 0.15 }, T.reset);
  tl.to(base, { backgroundColor: "#1e3cff", duration: 0.5, ease: "power2.out" }, T.wave + 0.25);
  tl.to(base, { backgroundColor: "#d9dee8", duration: 0.35, ease: "power2.inOut" }, T.burst + 0.1);
  // the porcelain studio: a cool backdrop falling off to a deeper floor
  tl.set($(".st-floor"), { background: "linear-gradient(180deg, rgba(160,170,190,0) 35%, rgba(120,132,158,0.55) 100%)" }, T.burst + 0.1);
  paint((g, t) => {
    // a cold glint on the first tile, a flash at the reset
    if (t < 1.4) flare(g, CX, CY, 520, 0.18 * Math.sin(Math.PI * clamp(t / 1.4)), "120,140,255");
    const k = t - T.wave;
    if (k > 0 && k < 0.8) flare(g, CX, CY, 900, 0.5 * Math.exp(-k * 5), "60,90,255");
  });

  // ── sound cues ─────────────────────────────────────────────────────────
  // clatter density follows the number of tiles flipping
  for (let t = 0; t < T.reset; t += 1 / 20) {
    let n = 0;
    for (const tile of wall.tiles) for (const s of tile.segs) if (s.t >= t && s.t < t + 1 / 20) n++;
    if (n > 0) cue("tick", Math.round(t * 1000) / 1000, undefined, Math.min(1, 0.15 + n / 25));
  }
  cue("click", 0.12, undefined, 1.0);
  cue("click", 0.62, undefined, 1.0);
  cue("click", 1.02, undefined, 1.0);
  cue("riser", T.tilt, T.reset - T.tilt, 1.0);
  cue("hit", T.reset, undefined, 0.8);
  cue("sweep", T.wave, 0.7, 1.0);
  cue("chime", T.letters, undefined, 0.6);
  cue("chime", T.letters + 0.33, undefined, 0.6);
  cue("whoosh", T.burst - 0.1, 1.0, 1.0);
  cue("hit", T.burst + 0.35, undefined, 0.6);
}
