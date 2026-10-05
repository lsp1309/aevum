import { gsap } from "../../core/gsap";
import { onFrame, rng, clamp, smooth, cue } from "../../core/clock";
import { html, world, front, $, CX, CY, W, H, sizeCanvas } from "../../promo/stage";
import { T, VO } from "../timing";
import { Wall, FlapText } from "../flap";
import { FACES, F, BRAND } from "../faces";
import { inBand, markSvg } from "../mark";

/**
 * ACT V — THE PICTURE. Straight down onto the dark ground: it is a wall of
 * tiles again. A wave flips them — cobalt, and white where the Astrya ring
 * passes: the mark, as a coarse mosaic. Then the mosaic grows finer and finer
 * (26, 52, 104 pieces across) until it is one piece: the vector mark. The
 * name arrives on six white flaps, the promise settles letter by letter.
 */
const K = 3.3; // screen px per mark unit for the big mark

export function buildPicture(tl: gsap.core.Timeline) {
  const R = rng(77);
  const COLS = 13;
  const ROWS = 23;
  const SIZE = 77;
  const GAP = 6;
  const wall = new Wall({ cols: COLS, rows: ROWS, size: SIZE, gap: GAP, faces: FACES, base: F.blank });
  const ox = (W - wall.w) / 2;
  const oy = (H - wall.h) / 2;
  const root = html(`<section class="scene" id="s-picture"><div class="abs" style="left:${ox}px;top:${oy}px"></div></section>`);
  root.firstElementChild!.appendChild(wall.el);
  world.appendChild(root);

  // which tiles carry the ring (sample the tile, keep it if enough is band)
  const cover = (x0: number, y0: number, s: number, n = 5) => {
    let hit = 0;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const x = (x0 + ((a + 0.5) / n) * s - CX) / K;
        const y = (y0 + ((b + 0.5) / n) * s - CY) / K;
        if (inBand(x, y)) hit++;
      }
    return hit / (n * n);
  };
  const P0 = T.picture;
  wall.tiles.forEach((t, i) => {
    const x = ox + t.x;
    const y = oy + t.y;
    const d = Math.hypot(t.c - 6, (t.r - 11) * 0.9);
    const white = cover(x, y, SIZE) > 0.12;
    wall.flip(i, P0 + 0.05 + d * 0.035 + R() * 0.04, white ? F.white : F.cobalt, 0.13);
  });
  wall.seal();
  tl.set(root, { visibility: "visible" }, P0 - 0.12);
  tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.15 }, P0 - 0.12);
  wall.from = P0 - 0.2;
  wall.to = T.mark + 0.2;
  tl.set(root, { visibility: "hidden" }, T.resolve + 0.25);
  cue("sweep", P0 + 0.05, 0.6, 0.9);
  for (let k = 0; k < 12; k++) cue("tick", P0 + 0.05 + k * 0.05, undefined, 0.8);

  // finer and finer mosaics, on a canvas
  const cv = document.createElement("canvas");
  cv.className = "abs";
  sizeCanvas(cv, 1);
  const pic = html(`<section class="scene" id="s-pic2"></section>`);
  pic.appendChild(cv);
  world.appendChild(pic);
  const g = cv.getContext("2d")!;
  const LEVELS = [26, 52, 104].map((n) => {
    const s = wall.w / n;
    const rows = Math.ceil(wall.h / s);
    const cells: Array<[number, number, number]> = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < n; c++) {
        const x = ox + c * s;
        const y = oy + r * s;
        if (cover(x, y, s, 4) > 0.3) cells.push([x, y, Math.hypot(x + s / 2 - CX, y + s / 2 - CY)]);
      }
    return { n, s, cells };
  });
  const L0 = [T.resolve, T.resolve + 0.38, T.resolve + 0.76];
  tl.set(pic, { visibility: "visible" }, T.resolve - 0.02);
  onFrame((t) => {
    if (t < T.resolve - 0.05 || t > T.mark + 0.5) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#1e3cff";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffffff";
    LEVELS.forEach((lv, k) => {
      const t0 = L0[k];
      const t1 = k < 2 ? L0[k + 1] + 0.18 : T.mark + 0.3;
      if (t < t0 || t > t1) return;
      const out = 1 - smooth(clamp((t - (t1 - 0.18)) / 0.18));
      for (const [x, y, d] of lv.cells) {
        const a = smooth(clamp((t - t0 - d * 0.00035) / 0.14)) * out;
        if (a <= 0) continue;
        const gap = lv.s * 0.12;
        const sz = (lv.s - gap) * (0.4 + 0.6 * a);
        g.globalAlpha = a;
        g.fillRect(x + (lv.s - sz) / 2, y + (lv.s - sz) / 2, sz, sz);
      }
    });
    g.globalAlpha = 1;
  });
  L0.forEach((t) => cue("click", t, undefined, 0.9));

  // one piece: the vector mark, then it makes room for the name
  const studio = $(".st-base");
  tl.set(studio, { backgroundColor: "#1e3cff" }, T.resolve);
  tl.set($(".st-fill"), { opacity: 0 }, T.resolve);
  const end = html(`<section class="scene" id="s-end">
    <div class="abs mk" style="left:${CX - 200 * K}px;top:${CY - 200 * K}px">${markSvg("#ffffff", 400 * K)}</div>
    <div class="abs wm" style="left:0;top:0"></div>
    <div class="tagline" style="top:1230px">Intelligence that works with you.</div>
    <div class="cta" style="top:1400px">Discover Astrya<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
  </section>`);
  front.appendChild(end);
  const mk = end.querySelector<HTMLElement>(".mk")!;
  tl.set(end, { visibility: "visible" }, T.mark - 0.05);
  tl.fromTo(mk, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, T.mark - 0.05);
  tl.set(pic, { visibility: "hidden" }, T.mark + 0.35);
  gsap.set(mk, { transformOrigin: "50% 50%" });
  tl.to(mk, { scale: 0.56, y: -300, duration: 0.85, ease: "power3.inOut" }, T.mark + 0.35);
  cue("hit", T.mark, undefined, 0.8);

  // the name on six white flaps
  const nw = new Wall({ cols: 6, rows: 1, size: 132, gap: 10, faces: FACES, base: F.cobalt });
  const wm = end.querySelector<HTMLElement>(".wm")!;
  wm.style.left = `${(W - nw.w) / 2}px`;
  wm.style.top = "1010px";
  wm.appendChild(nw.el);
  const POOL = "ASTRYAXKMEVNOQ";
  "ASTRYA".split("").forEach((ch, i) => {
    let t = T.word - 0.05 + i * 0.07;
    for (let k = 0; k < 3 + (i % 3); k++) {
      nw.flip(i, t, BRAND[POOL[(i * 5 + k * 3) % POOL.length]], 0.1);
      t += 0.1;
    }
    nw.flip(i, t, BRAND[ch], 0.12);
    cue("tick", t, undefined, 1.0);
  });
  nw.seal();
  gsap.set(nw.el, { opacity: 0 });
  tl.to(nw.el, { opacity: 1, duration: 0.15 }, T.word - 0.12);
  const tag = new FlapText(end.querySelector<HTMLElement>(".tagline")!, T.tag - 0.05, { stagger: 0.022, spin: 0.24, seed: 11 });
  const cta = end.querySelector<HTMLElement>(".cta")!;
  gsap.set(cta, { xPercent: -50, opacity: 0, scale: 0.9 });
  tl.to(cta, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.4)" }, T.cta);
  cue("click", T.cta + 0.05, undefined, 1.0);
  cue("chime", tag.done, undefined, 0.6);
  void VO;
}
