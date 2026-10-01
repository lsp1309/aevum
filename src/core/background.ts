import { onFrame, rng } from "./clock";
import { $, H, W, CX, CY, atmos, cam, onResize } from "./stage";

/** Pre-rendered soft sprite: one drawImage per particle instead of gradients. */
export function sprite(size: number, rgb: string, hardness = 0.25) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(hardness, `rgba(${rgb},0.55)`);
  grd.addColorStop(0.55, `rgba(${rgb},0.12)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  a: number;
  tw: number;
  ph: number;
  vx: number;
  vy: number;
  tint: number;
}

const FW = W * 1.6; // star field is wider than the frame so pans never reveal an edge
const FH = H * 1.6;

export function initBackground() {
  const canvas = $<HTMLCanvasElement>("#bg");
  const ctx = canvas.getContext("2d")!;
  let k = 1;
  onResize((s) => {
    k = Math.min(1.5, Math.max(0.6, s * (window.devicePixelRatio || 1)));
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
  });

  const rand = rng(7);
  const stars: Star[] = [];
  for (let i = 0; i < 520; i++) {
    const z = Math.pow(rand(), 1.8) * 0.9 + 0.1;
    stars.push({
      x: rand() * FW,
      y: rand() * FH,
      z,
      r: 0.35 + z * 1.5 + (rand() < 0.04 ? 1.4 : 0),
      a: 0.18 + rand() * 0.6,
      tw: 0.25 + rand() * 1.4,
      ph: rand() * Math.PI * 2,
      vx: (rand() - 0.5) * 4 * z,
      vy: -(1.5 + rand() * 4) * z,
      tint: rand(),
    });
  }
  const bokeh = Array.from({ length: 14 }, () => ({
    x: rand() * FW,
    y: rand() * FH,
    r: 26 + rand() * 70,
    a: 0.025 + rand() * 0.05,
    ph: rand() * 6.28,
  }));
  const sWhite = sprite(32, "235,242,255", 0.18);
  const sBlue = sprite(32, "140,175,255", 0.18);
  const sBokeh = sprite(128, "90,130,255", 0.05);

  const halos = {
    a: $("#atmos .halo-a"),
    b: $("#atmos .halo-b"),
    c: $("#atmos .halo-c"),
    leak: $("#atmos .leak"),
  };
  const grain = $("#grain");

  onFrame((t) => {
    // ambient halos breathe on slow incommensurate sines: alive, never noticeable
    halos.a.style.opacity = String(atmos.halo * (0.75 + 0.25 * Math.sin(t * 0.21)));
    halos.a.style.transform = `translate3d(${Math.sin(t * 0.07) * 60 - cam.x * 0.04}px, ${Math.cos(t * 0.05) * 40 - cam.y * 0.04}px,0)`;
    halos.b.style.opacity = String(atmos.halo * (0.7 + 0.3 * Math.sin(t * 0.17 + 2)));
    halos.b.style.transform = `translate3d(${Math.cos(t * 0.06) * 70 - cam.x * 0.06}px, ${Math.sin(t * 0.08) * 50 - cam.y * 0.06}px,0)`;
    halos.c.style.opacity = String(atmos.core);
    halos.c.style.transform = `translate3d(-50%,-50%,0) scale(${1 + 0.04 * Math.sin(t * 0.9)})`;
    halos.leak.style.opacity = String(atmos.leak * (0.8 + 0.2 * Math.sin(t * 0.4)));
    halos.leak.style.transform = `translate3d(${Math.sin(t * 0.05) * 120}px,0,0) rotate(-24deg)`;

    // film grain: stepped at 24 fps like real stock
    const f = Math.floor(t * 24);
    grain.style.opacity = String(atmos.grain);
    grain.style.backgroundPosition = `${(f * 137) % 512}px ${(f * 263) % 512}px`;

    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (atmos.stars <= 0.001) return;
    ctx.globalCompositeOperation = "lighter";

    const ox = (FW - W) / 2;
    const oy = (FH - H) / 2;
    for (const b of bokeh) {
      let x = (((b.x - cam.x * 0.08 + t * 3) % FW) + FW) % FW - ox;
      let y = (((b.y - cam.y * 0.08 - t * 2) % FH) + FH) % FH - oy;
      x = CX + (x - CX) * atmos.zoom;
      y = CY + (y - CY) * atmos.zoom;
      ctx.globalAlpha = b.a * atmos.stars * (0.7 + 0.3 * Math.sin(t * 0.3 + b.ph));
      ctx.drawImage(sBokeh, x - b.r, y - b.r, b.r * 2, b.r * 2);
    }

    const zoom = atmos.zoom;
    const warp = atmos.warp;
    const pull = atmos.pull;
    for (const s of stars) {
      let x = (((s.x + s.vx * t - cam.x * s.z * 0.45) % FW) + FW) % FW - ox;
      let y = (((s.y + s.vy * t - cam.y * s.z * 0.45) % FH) + FH) % FH - oy;
      // depth-weighted dolly: near particles travel further than far ones
      const zf = Math.pow(zoom, 0.4 + s.z * 1.6);
      let dx = (x - CX) * zf;
      let dy = (y - CY) * zf;
      if (pull > 0) {
        const p = Math.min(1, pull * (0.6 + s.z * 0.6));
        const ang = p * 0.9 * (1.2 - s.z);
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        const nx = (dx * c - dy * sn) * (1 - p * 0.85);
        const ny = (dx * sn + dy * c) * (1 - p * 0.85);
        dx = nx;
        dy = ny;
      }
      x = CX + dx;
      y = CY + dy;
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      const twinkle = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      const a = s.a * twinkle * atmos.stars;
      const img = s.tint > 0.55 ? sBlue : sWhite;
      if (warp > 0.01) {
        const len = warp * (0.15 + s.z * 0.55);
        ctx.globalAlpha = a * Math.min(1, 0.4 + warp);
        ctx.strokeStyle = s.tint > 0.55 ? "rgb(150,185,255)" : "rgb(235,242,255)";
        ctx.lineWidth = s.r * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx * len, y - dy * len);
        ctx.stroke();
      }
      ctx.globalAlpha = a;
      const r = s.r * 3.2;
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  });
}
