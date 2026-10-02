import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/base.css";
import "./styles/ui.css";

import { gsap } from "./core/gsap";
import { master, renderFrame, invalidate, cues } from "./core/clock";
import { fit } from "./core/stage";
import { initBackground } from "./core/background";
import { initFx } from "./core/fx";
import { T, EDIT } from "./timing";
import { film, setAnchors, toFilm } from "./core/film";
import { buildNoise } from "./scenes/noise";
import { buildBrand } from "./scenes/brand";
import { buildInbox } from "./scenes/inbox";
import { buildWork } from "./scenes/work";
import { buildSystem } from "./scenes/system";
import { buildMorning } from "./scenes/morning";
import { buildFocus } from "./scenes/focus";
import { buildFinale } from "./scenes/finale";
import { buildKinetic, buildCaptions } from "./scenes/kinetic";
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

  setAnchors(EDIT);
  initBackground();
  initFx();

  buildNoise(master);
  buildBrand(master);
  buildInbox(master);
  buildWork(master);
  buildSystem(master);
  buildMorning(master);
  buildFocus(master);
  buildFinale(master);
  buildKinetic(master);
  buildCaptions(master);
  if (import.meta.env.DEV) {
    // guard: nothing may run past the film's end
    for (const c of master.getChildren(true, true, false)) {
      const end = (c as any).globalTime(c.totalDuration()) as number;
      if (end > T.end + 0.01) console.warn("[overrun]", end.toFixed(2), (c as gsap.core.Tween).targets?.().map((t: any) => t.className || t.id || "obj"), (c as gsap.core.Tween).vars && Object.keys((c as gsap.core.Tween).vars));
    }
  }
  master.set({}, {}, T.end); // pad to the exact running time

  gsap.ticker.add(() => renderFrame());

  film.duration = EDIT[EDIT.length - 1].film;
  const start = Number(params.get("t") || 0);
  film.seek(start);

  window.__film = {
    duration: film.duration,
    fps: 60,
    // sound cues, converted from authored time to film time
    cues: [...cues]
      .map((c) => ({ ...c, t: toFilm(c.t), dur: c.dur ? toFilm(c.t + c.dur) - toFilm(c.t) : undefined }))
      .sort((a, b) => a.t - b.t),
    chapters: T,
    seek(t: number) {
      film.seek(t);
    },
  };

  document.documentElement.classList.add("ready");
  if (!renderMode) {
    initControls();
    if (!params.has("paused")) gsap.delayedCall(0.5, () => film.play());
  }
}

boot();
