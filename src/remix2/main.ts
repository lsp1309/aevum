import "@fontsource-variable/manrope";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/jetbrains-mono";
import "../remix/remix.css";
import "./remix2.css";

import { gsap } from "../core/gsap";
import { master, renderFrame, invalidate, cues, onFrame, rng } from "../core/clock";
import { film, setAnchors } from "../core/film";
import { fit, $ } from "../remix/stage";
import { initRibbons } from "../remix/ribbons";
import { buildFilm, S } from "./scenes";

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
  const offs = Array.from({ length: 400 }, () => [Math.floor(rr() * 256), Math.floor(rr() * 256)]);
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
    document.fonts.load('600 104px "Manrope Variable"'),
    document.fonts.load('600 118px "Inter Tight Variable"'),
    document.fonts.load('400 30px "JetBrains Mono Variable"'),
  ]);
  await document.fonts.ready;
  setAnchors([
    { raw: 0, film: 0 },
    { raw: S.end, film: S.end },
  ]);
  initRibbons();
  buildFilm(master);
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
    });
    if (!params.has("paused")) gsap.delayedCall(0.4, () => film.play());
  }
}
boot();
