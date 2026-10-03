import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/base.css";
import "./styles/ui.css";

import { gsap } from "./core/gsap";
import { master, renderFrame, invalidate, cues } from "./core/clock";
import { fit } from "./core/stage";
import { initBackground } from "./core/background";
import { initFx } from "./core/fx";
import { T, CUT, SHORT_REELS } from "./timing";
import { SHORT } from "./core/stage";
import { initTransitions } from "./core/transitions";
import { film, setAnchors, setReels, toFilm } from "./core/film";
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

  if (SHORT) setReels(SHORT_REELS);
  else setAnchors(CUT);
  initBackground();
  initFx();

  buildNoise(master);
  buildBrand(master);
  buildInbox(master);
  buildWork(master);
  buildSystem(master);
  if (!SHORT) {
    // the 30-second cut goes straight from the core to the halo
    buildMorning(master);
    buildFocus(master);
  }
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

  film.duration = SHORT ? 30 : CUT[CUT.length - 1].film;
  if (SHORT) initTransitions();
  const start = Number(params.get("t") || 0);
  film.seek(start);

  window.__film = {
    duration: film.duration,
    fps: 60,
    // sound cues, converted from authored time to film time
    cues: [...cues]
      .map((c) => {
        const t = toFilm(c.t);
        const e = c.dur ? toFilm(c.t + c.dur) : NaN;
        // a sound whose end was cut out of the edit keeps its authored length
        return { ...c, t, dur: c.dur ? (Number.isFinite(e) ? e - t : c.dur) : undefined };
      })
      .filter((c) => Number.isFinite(c.t)) // cues inside cut-out stretches are dropped
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
