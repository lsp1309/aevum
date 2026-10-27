import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "../styles/base.css";
import "../styles/ui.css";
import "./entreprises.css";

import { gsap } from "../core/gsap";
import { master, renderFrame, invalidate, cues } from "../core/clock";
import { film, setAnchors } from "../core/film";
import { fit, $ } from "../core/stage";
import { initBackground } from "../core/background";
import { initFx } from "../core/fx";
import { buildOpening, buildProblem, buildReveal } from "./story";
import { buildProduct } from "./product";
import { buildAutomation, buildCalm, buildFinale } from "./ending";
import { T } from "./timing";


const AUDIO = "/audio/astrya-entreprises.m4a";
/** The frame shown when motion is reduced: the signature, readable as a still. */
const POSTER = 59.5;

function initPlayer(mode: "auto" | "paused" | "reduced") {
  const audio = new Audio(AUDIO);
  audio.preload = "auto";
  let muted = false;
  const pp = $<HTMLButtonElement>("#pp");
  const snd = $<HTMLButtonElement>("#snd");
  const fs = $<HTMLButtonElement>("#fs");
  const bar = $("#bar");
  const fill = bar.querySelector("i") as HTMLElement;
  const tc = $("#tc");
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const syncAudio = () => {
    if (film.paused || muted) {
      audio.pause();
      return;
    }
    if (Math.abs(audio.currentTime - film.time) > 0.12) audio.currentTime = film.time;
    audio.play().catch(() => {
      /* autoplay with sound needs a gesture: the picture keeps running */
    });
  };
  const play = () => {
    film.play();
    syncAudio();
  };
  const pause = () => {
    film.pause();
    syncAudio();
  };
  const toggle = () => (film.paused ? play() : pause());
  const seek = (t: number) => {
    film.seek(t);
    audio.currentTime = film.time;
    syncAudio();
  };

  pp.addEventListener("click", toggle);
  snd.addEventListener("click", () => {
    muted = !muted;
    snd.textContent = muted ? "Son coupé" : "Son";
    syncAudio();
  });
  fs.addEventListener("click", () => (document.fullscreenElement ? document.exitFullscreen() : $("#app").requestFullscreen()));
  bar.addEventListener("click", (e) => {
    const r = bar.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * film.duration);
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      toggle();
    } else if (e.code === "ArrowRight") seek(film.time + 5);
    else if (e.code === "ArrowLeft") seek(film.time - 5);
    else if (e.code === "KeyR") seek(0), play();
    else if (e.code === "KeyM") snd.click();
    else if (e.code === "KeyF") fs.click();
  });
  document.addEventListener("visibilitychange", () => document.hidden && pause());

  gsap.ticker.add(() => {
    pp.textContent = film.paused ? "Lecture" : "Pause";
    fill.style.transform = `scaleX(${film.progress().toFixed(4)})`;
    tc.textContent = `${clock(film.time)} / ${clock(film.duration)}`;
    if (film.paused && !audio.paused) audio.pause();
  });

  if (mode === "reduced") {
    // No autoplay with reduced motion: the signature is shown as a still, played on request.
    film.seek(POSTER);
    document.documentElement.classList.add("reduced");
  } else if (mode === "auto") {
    gsap.delayedCall(0.5, play);
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
    document.fonts.load('300 50px "Geist Variable"'),
    document.fonts.load('400 16px "Geist Variable"'),
    document.fonts.load('600 16px "Geist Variable"'),
    document.fonts.load('400 14px "Geist Mono Variable"'),
  ]);
  await document.fonts.ready;
  setAnchors([
    { raw: 0, film: 0 },
    { raw: T.end, film: T.end },
  ]);
  initBackground();
  initFx();
  buildOpening(master);
  buildProblem(master);
  buildReveal(master);
  buildProduct(master);
  buildAutomation(master);
  buildCalm(master);
  buildFinale(master);
  if (import.meta.env.DEV) {
    // guard: nothing may run past the film's end
    for (const c of master.getChildren(true, true, false)) {
      const end = (c as unknown as { globalTime(t: number): number }).globalTime(c.totalDuration());
      if (end > T.end + 0.01) console.warn("[overrun]", end.toFixed(2));
    }
  }
  master.set({}, {}, T.end); // pad to the exact running time
  gsap.ticker.add(() => renderFrame());
  film.duration = T.end;
  film.seek(Number(params.get("t") || 0));
  (window as unknown as { __film: unknown }).__film = {
    duration: film.duration,
    fps: 60,
    cues: [...cues].sort((a, b) => a.t - b.t),
    chapters: T,
    seek(t: number) {
      film.seek(t);
    },
  };
  document.body.classList.add("ready");
  document.documentElement.classList.add("ready");
  if (!renderMode) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    initPlayer(params.has("paused") ? "paused" : reduced ? "reduced" : "auto");
  }
}
boot();
