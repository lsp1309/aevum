import { onFrame, clamp } from "../core/clock";

/**
 * Split-flap tiles, the visual language of the film. A Wall is a grid of
 * tiles; each tile owns a schedule of flips (time → face). Rendering is a
 * pure function of time: at any t, a tile is either at rest on a face or
 * mid-flip between two (the upper flap falling over its hinge, real 3D with
 * a local perspective, shaded as it turns).
 */
export interface Face {
  c: string; // class of the face (colour scheme)
  h: string; // inner html
}
interface Seg {
  t: number;
  f: number;
  d: number;
}
interface Tile {
  el: HTMLElement;
  fc: HTMLElement[]; // top, bottom, flap-front, flap-back face elements
  flap: HTMLElement;
  shade: HTMLElement;
  drop: HTMLElement;
  segs: Seg[];
  base: number;
  shown: number[]; // face currently in each of the four halves
  open: boolean;
  c: number;
  r: number;
  x: number;
  y: number;
}

export interface WallOpts {
  cols: number;
  rows: number;
  size: number;
  gap: number;
  faces: Face[];
  base?: number;
  cls?: string;
}

export class Wall {
  el: HTMLElement;
  tiles: Tile[] = [];
  faces: Face[];
  cols: number;
  rows: number;
  size: number;
  pitch: number;
  w: number;
  h: number;
  /** optional per-tile transform (bursts, lifts…) */
  xf: ((i: number, t: number) => string) | null = null;
  live = true;
  /** time window outside which the wall is not updated (it is hidden then) */
  from = -Infinity;
  to = Infinity;

  constructor(o: WallOpts) {
    this.faces = o.faces;
    this.cols = o.cols;
    this.rows = o.rows;
    this.size = o.size;
    this.pitch = o.size + o.gap;
    this.w = o.cols * this.pitch - o.gap;
    this.h = o.rows * this.pitch - o.gap;
    this.el = document.createElement("div");
    this.el.className = `wall ${o.cls ?? ""}`;
    this.el.style.width = `${this.w}px`;
    this.el.style.height = `${this.h}px`;
    this.el.style.setProperty("--ts", `${o.size}px`);
    const base = o.base ?? 0;
    const frag = document.createDocumentFragment();
    for (let r = 0; r < o.rows; r++)
      for (let c = 0; c < o.cols; c++) {
        const el = document.createElement("div");
        el.className = "tl";
        const x = c * this.pitch;
        const y = r * this.pitch;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.innerHTML = `<div class="h top"><div class="fc"></div></div><div class="h bot"><div class="fc"></div><i class="drop"></i></div><div class="flap"><div class="h fr"><div class="fc"></div></div><div class="h bk"><div class="fc"></div></div><i class="shade"></i></div>`;
        const fc = Array.from(el.querySelectorAll<HTMLElement>(".fc"));
        const t: Tile = {
          el,
          fc,
          flap: el.querySelector<HTMLElement>(".flap")!,
          shade: el.querySelector<HTMLElement>(".shade")!,
          drop: el.querySelector<HTMLElement>(".drop")!,
          segs: [],
          base,
          shown: [-1, -1, -1, -1],
          open: true,
          c,
          r,
          x,
          y,
        };
        t.flap.style.display = "none";
        t.open = false;
        frag.appendChild(el);
        this.tiles.push(t);
      }
    this.el.appendChild(frag);
    onFrame((tt) => this.update(tt));
  }

  idx(c: number, r: number) {
    return r * this.cols + c;
  }
  /** Schedule tile i to flip to face f at time t (flip lasts d seconds). */
  flip(i: number, t: number, f: number, d = 0.14) {
    this.tiles[i].segs.push({ t, f, d });
  }
  /** Sort the schedules (call once, after scheduling). */
  seal() {
    for (const tl of this.tiles) tl.segs.sort((a, b) => a.t - b.t);
  }
  /** Face showing at rest on tile i at time t. */
  faceAt(i: number, t: number) {
    const s = this.tiles[i].segs;
    let f = this.tiles[i].base;
    for (const g of s) if (g.t + g.d <= t) f = g.f;
    return f;
  }

  private set(tl: Tile, k: number, f: number) {
    if (tl.shown[k] === f) return;
    tl.shown[k] = f;
    const face = this.faces[f];
    tl.fc[k].className = `fc ${face.c}`;
    tl.fc[k].innerHTML = face.h;
  }

  update(t: number) {
    if (!this.live || t < this.from || t > this.to) return;
    for (let i = 0; i < this.tiles.length; i++) {
      const tl = this.tiles[i];
      const s = tl.segs;
      // last segment that has started
      let lo = 0;
      let hi = s.length - 1;
      let k = -1;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (s[m].t <= t) {
          k = m;
          lo = m + 1;
        } else hi = m - 1;
      }
      const prev = k > 0 ? s[k - 1].f : tl.base;
      if (k >= 0 && t < s[k].t + s[k].d && prev !== s[k].f) {
        const g = s[k];
        const p = clamp((t - g.t) / g.d);
        const e = p * p; // gravity: the flap accelerates as it falls
        this.set(tl, 0, g.f);
        this.set(tl, 1, prev);
        this.set(tl, 2, prev);
        this.set(tl, 3, g.f);
        if (!tl.open) {
          tl.flap.style.display = "";
          tl.open = true;
        }
        tl.flap.style.transform = `rotateX(${(-180 * e).toFixed(2)}deg)`;
        tl.shade.style.opacity = (Math.sin(Math.PI * e) * 0.55).toFixed(3);
        tl.drop.style.opacity = (e < 0.5 ? e * 1.1 : (1 - e) * 1.1).toFixed(3);
      } else {
        const f = k >= 0 ? s[k].f : tl.base;
        this.set(tl, 0, f);
        this.set(tl, 1, f);
        if (tl.open) {
          tl.flap.style.display = "none";
          tl.drop.style.opacity = "0";
          tl.open = false;
        }
      }
      if (this.xf) tl.el.style.transform = this.xf(i, t);
    }
  }
}

/**
 * Split-flap text: every character cycles through a few glyphs, each change
 * a tiny flap (a squash of the glyph), and settles on its letter at its own
 * time. Pure function of time.
 */
const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export class FlapText {
  chars: HTMLElement[] = [];
  text: string;
  at: number[] = [];
  constructor(
    public el: HTMLElement,
    start: number,
    opts: { stagger?: number; spin?: number; rate?: number; seed?: number; pool?: string } = {},
  ) {
    this.text = el.textContent ?? "";
    el.textContent = "";
    const stagger = opts.stagger ?? 0.03;
    const spin = opts.spin ?? 0.28;
    const rate = opts.rate ?? 22;
    const pool = opts.pool ?? POOL;
    const seed = opts.seed ?? 1;
    let n = 0;
    for (const word of this.text.split(/(\s+)/)) {
      if (!word) continue;
      if (/^\s+$/.test(word)) {
        el.appendChild(document.createTextNode(" "));
        continue;
      }
      const w = document.createElement("span");
      w.className = "wd";
      for (const ch of word) {
        const s = document.createElement("span");
        s.className = "fl";
        s.textContent = ch;
        w.appendChild(s);
        this.chars.push(s);
        this.at.push(start + n * stagger + spin);
        n++;
      }
      el.appendChild(w);
    }
    const t0 = start;
    const shown: string[] = this.chars.map(() => "");
    onFrame((t) => {
      this.chars.forEach((s, i) => {
        const real = this.text.replace(/\s+/g, "")[i];
        const settle = this.at[i];
        const begin = t0 + i * stagger;
        let ch = real;
        let sq = 1;
        let op = 1;
        if (t < begin) {
          op = 0;
        } else if (t < settle) {
          const k = Math.floor((t - begin) * rate);
          const isUpper = real === real.toUpperCase();
          const g = pool[(k * 7 + i * 13 + seed * 31) % pool.length];
          ch = /[a-z]/i.test(real) ? (isUpper ? g : g.toLowerCase()) : /[0-9]/.test(real) ? String((k + i) % 10) : real;
          const ph = ((t - begin) * rate) % 1;
          sq = 0.35 + 0.65 * Math.abs(Math.cos(Math.PI * ph));
        } else {
          const k = clamp((t - settle) / 0.09);
          sq = k < 1 ? 0.4 + 0.6 * k : 1;
        }
        if (shown[i] !== ch) {
          s.textContent = ch;
          shown[i] = ch;
        }
        s.style.opacity = String(op);
        s.style.transform = sq < 0.999 ? `scaleY(${sq.toFixed(3)})` : "";
      });
    });
  }
  /** time at which the last character settles */
  get done() {
    return this.at[this.at.length - 1] ?? 0;
  }
}
