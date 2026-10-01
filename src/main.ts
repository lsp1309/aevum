import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/base.css";
import "./styles/ui.css";

import { gsap } from "./core/gsap";
import { master, renderFrame, invalidate, cues } from "./core/clock";
import { fit } from "./core/stage";
import { initBackground } from "./core/background";
import { initFx } from "./core/fx";
import { T } from "./timing";
import { buildIntro } from "./scenes/intro";
import { buildNoise } from "./scenes/noise";
import { buildBrand } from "./scenes/brand";
import { buildInbox } from "./scenes/inbox";
import { buildWork } from "./scenes/work";
import { buildCore } from "./scenes/core";
import { buildFounders } from "./scenes/founders";
import { buildMorning } from "./scenes/morning";
import { buildFinale } from "./scenes/finale";
import { initControls } from "./controls";

declare global {
  interface Window {
    __film?: { seek(t: number): void; duration: number; fps: number; cues: typeof cues; chapters: typeof T };
  }
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const renderMode = params.has("render");
  if (renderMode) document.documentElement.classList.add("render");

  fit();
  window.addEventListener("resize", () => {
    fit();
    invalidate();
    renderFrame(true);
  });

  // Never split or measure text before the real fonts are in: no layout shift.
  await Promise.all([
    document.fonts.load('500 200px "Geist Variable"'),
    document.fonts.load('400 16px "Geist Variable"'),
    document.fonts.load('600 16px "Geist Variable"'),
    document.fonts.load('400 14px "Geist Mono Variable"'),
  ]);
  await document.fonts.ready;

  initBackground();
  initFx();

  buildIntro(master);
  buildNoise(master);
  buildBrand(master);
  buildInbox(master);
  buildWork(master);
  buildCore(master);
  buildFounders(master);
  buildMorning(master);
  buildFinale(master);
  master.set({}, {}, T.end); // pad to the exact running time

  gsap.ticker.add(() => renderFrame());

  const start = Number(params.get("t") || 0);
  master.seek(start, false);
  renderFrame(true);

  window.__film = {
    duration: master.duration(),
    fps: 30,
    cues: [...cues].sort((a, b) => a.t - b.t),
    chapters: T,
    seek(t: number) {
      master.seek(t, false);
      renderFrame(true);
    },
  };

  document.documentElement.classList.add("ready");
  if (!renderMode) {
    initControls();
    if (!params.has("paused")) gsap.delayedCall(0.5, () => master.play());
  }
}

boot();
