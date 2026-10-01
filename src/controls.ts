import { gsap } from "./core/gsap";
import { film } from "./core/film";
import { $, camera } from "./core/stage";
import { chapters } from "./timing";
import "./styles/controls.css";

const fmt = (t: number) => {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Minimal transport: play/pause, scrub with chapter ticks, restart,
 * fullscreen, sound. Auto-hides; keyboard: Space, ←/→, R, F, M, 1-9 (chapters).
 * The scene itself reacts to the pointer with a faint parallax.
 */
export function initControls() {
  const hud = $("#hud");
  const dur = film.duration;
  hud.innerHTML = `
    <div class="hud-bar">
      <button class="hud-btn hud-play" aria-label="Play / pause">
        <svg viewBox="0 0 24 24" class="i-pause"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/></svg>
        <svg viewBox="0 0 24 24" class="i-play"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.7l-10-6.4A1 1 0 0 0 8 5.6Z"/></svg>
      </button>
      <div class="hud-track" role="slider" aria-label="Seek" tabindex="0">
        <div class="hud-rail"><div class="hud-fill"></div></div>
        ${chapters
          .map((c) => `<button class="hud-tick" style="left:${(c.t / dur) * 100}%" data-t="${c.t}"><span>${c.label}</span></button>`)
          .join("")}
        <div class="hud-knob"></div>
      </div>
      <div class="hud-time"><span class="hud-now">00:00</span><span class="hud-dur">${fmt(dur)}</span></div>
      <button class="hud-btn hud-sound" aria-label="Sound on / off" title="Sound (M)">
        <svg viewBox="0 0 24 24" class="i-off"><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" fill="currentColor"/><path d="m16 9.5 5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <svg viewBox="0 0 24 24" class="i-on"><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <button class="hud-btn hud-restart" aria-label="Restart">
        <svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 4.5V8h3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="hud-btn hud-fs" aria-label="Fullscreen">
        <svg viewBox="0 0 24 24"><path d="M4.5 9V5.5a1 1 0 0 1 1-1H9M15 4.5h3.5a1 1 0 0 1 1 1V9M19.5 15v3.5a1 1 0 0 1-1 1H15M9 19.5H5.5a1 1 0 0 1-1-1V15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>`;

  const play = $(".hud-play", hud);
  const trackEl = $(".hud-track", hud);
  const fill = $(".hud-fill", hud);
  const knob = $(".hud-knob", hud);
  const now = $(".hud-now", hud);

  // ── score: an <audio> slaved to the master timeline ────────────────
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/astrya-mix.m4a`);
  audio.preload = "auto";
  let soundOn = false;
  const syncAudio = (force = false) => {
    if (!soundOn) return;
    const t = film.time;
    const running = !film.paused && film.progress() < 1;
    if (!running) {
      if (!audio.paused) audio.pause();
      if (force) audio.currentTime = Math.min(t, audio.duration || t);
      return;
    }
    if (audio.paused) {
      audio.currentTime = t;
      audio.play().catch(() => {});
    } else if (force || Math.abs(audio.currentTime - t) > 0.12) {
      audio.currentTime = t;
    }
  };
  const setSound = (on: boolean) => {
    soundOn = on;
    hud.classList.toggle("is-sound", on);
    if (on) syncAudio(true);
    else audio.pause();
  };

  const seek = (t: number) => {
    film.seek(t);
    syncAudio(true);
  };
  const toggle = () => {
    if (film.paused) film.play();
    else film.pause();
  };

  gsap.ticker.add(() => {
    const p = film.progress();
    fill.style.transform = `scaleX(${p})`;
    knob.style.left = `${p * 100}%`;
    now.textContent = fmt(film.time);
    hud.classList.toggle("is-paused", film.paused || p >= 1);
    syncAudio();
  });
  $(".hud-sound", hud).addEventListener("click", () => setSound(!soundOn));

  play.addEventListener("click", toggle);
  $(".hud-restart", hud).addEventListener("click", () => {
    seek(0);
    film.play();
  });
  $(".hud-fs", hud).addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  hud.querySelectorAll<HTMLElement>(".hud-tick").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      seek(Number(b.dataset.t));
    }),
  );

  let scrubbing = false;
  let wasPaused = false;
  const fromEvent = (e: PointerEvent) => {
    const r = trackEl.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * dur);
  };
  trackEl.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest(".hud-tick")) return;
    scrubbing = true;
    wasPaused = film.paused;
    film.pause();
    trackEl.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  trackEl.addEventListener("pointermove", (e) => scrubbing && fromEvent(e));
  trackEl.addEventListener("pointerup", () => {
    scrubbing = false;
    if (!wasPaused) film.play();
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      toggle();
    } else if (e.code === "ArrowRight") seek(film.time + 5);
    else if (e.code === "ArrowLeft") seek(film.time - 5);
    else if (e.code === "KeyR") {
      seek(0);
      film.play();
    } else if (e.code === "KeyF") $<HTMLButtonElement>(".hud-fs", hud).click();
    else if (/^Digit[1-9]$/.test(e.code)) {
      const c = chapters[Number(e.code.slice(5)) - 1];
      if (c) seek(c.t);
    }
    wake();
  });

  // auto-hide
  let idle = 0;
  const wake = () => {
    hud.classList.add("is-awake");
    document.body.style.cursor = "";
    clearTimeout(idle);
    idle = window.setTimeout(() => {
      if (!scrubbing) {
        hud.classList.remove("is-awake");
        document.body.style.cursor = "none";
      }
    }, 2600);
  };
  window.addEventListener("pointermove", wake);
  wake();

  // subtle pointer parallax on the whole viewport (live viewing only)
  const rx = gsap.quickTo(camera, "rotationX", { duration: 1.6, ease: "power3.out" });
  const ry = gsap.quickTo(camera, "rotationY", { duration: 1.6, ease: "power3.out" });
  window.addEventListener("pointermove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    ry(nx * 1.6);
    rx(-ny * 1.1);
  });
}
