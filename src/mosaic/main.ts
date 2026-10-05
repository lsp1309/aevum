import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/inter-tight";
import "./mosaic.css";

import { gsap } from "../core/gsap";
import { master, renderFrame, invalidate, cues, onFrame, rng } from "../core/clock";
import { film, setAnchors } from "../core/film";
import { fit, $ } from "../promo/stage";
import { T as S } from "./timing";
import { initLight } from "../promo/light";
import { buildFragments } from "./scenes/fragments";
import { buildBento } from "./scenes/bento";
import { buildSkyline } from "./scenes/skyline";
import { buildPicture } from "./scenes/picture";

/** Film grain: a fixed noise tile, re-positioned every 1/24 s (seeded). */
function initGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(128 + (r() + r() + r() - 1.5) * 120);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const el = $("#grain");
  el.style.backgroundImage = `url(${c.toDataURL()})`;
  const rr = rng(3);
  const offs = Array.from({ length: 720 }, () => [Math.floor(rr() * 256), Math.floor(rr() * 256)]);
  onFrame((t) => {
    const o = offs[Math.max(0, Math.floor(t * 24)) % offs.length];
    el.style.backgroundPosition = `${o[0]}px ${o[1]}px`;
  });
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const renderMode = params.has("render");
  fit();
  window.addEventListener("resize", () => {
    fit();
    invalidate();
    renderFrame(true);
  });
  await Promise.all([
    document.fonts.load('750 77px "Archivo Variable"'),
    document.fonts.load('400 24px "Archivo Variable"'),
    document.fonts.load('600 160px "Inter Tight Variable"'),
  ]);
  await document.fonts.ready;

  setAnchors([
    { raw: 0, film: 0 },
    { raw: S.end, film: S.end },
  ]);
  const tl = master;
  buildFragments(tl);
  buildBento(tl);
  buildSkyline(tl);
  buildPicture(tl);
  initLight();
  initGrain();
  master.set({}, {}, S.end);
  gsap.ticker.add(() => renderFrame());

  film.duration = S.end;
  film.seek(Number(params.get("t") || 0));
  (window as unknown as { __film: unknown }).__film = {
    duration: film.duration,
    fps: 60,
    cues: [...cues].sort((a, b) => a.t - b.t),
    chapters: S,
    seek(t: number) {
      film.seek(t);
    },
  };
  if (!renderMode) {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") film.paused ? film.play() : film.pause();
      if (e.code === "ArrowRight") film.seek(film.time + 1);
      if (e.code === "ArrowLeft") film.seek(film.time - 1);
    });
    if (!params.has("paused")) gsap.delayedCall(0.4, () => film.play());
  }
}

boot();
