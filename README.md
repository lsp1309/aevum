# ASTRYA — product film · LUKA × ZIYAD

A ~99-second cinematic product film for **ASTRYA**, an AI assistant, built as a
single real-time GSAP animation in the browser and exportable frame-exactly to MP4.

```bash
npm install
npm run dev          # http://localhost:5173 — plays in the browser
npm run build        # static build in dist/
npm run render       # → out/astrya.mp4 (1920×1080, 30 fps, frame-exact)
npm run render -- --audio public/audio/astrya-score.m4a   # with the score
```

Player: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> ±5 s · <kbd>1</kbd>–<kbd>9</kbd> chapters ·
<kbd>M</kbd> sound · <kbd>F</kbd> fullscreen · <kbd>R</kbd> restart. URL params: `?t=56` start at 56 s, `?paused`.

## Storyline

| Chapter | t (s) | Beat | Transition out |
|---|---|---|---|
| Origin | 0 | A spark lands; dust condenses into **LUKA**, the camera travels and a scanline writes **ZIYAD**; the names lock up around a crossing of light. | The lockup squeezes into a single point of light. |
| Noise | 14.4 | The point pulses and the first email is born from it; notifications erupt from depth, faster and faster. | A calm point pulls every card into a spiral vortex. |
| ASTRYA | 22.4 | The vortex point unfolds into the ASTRYA halo; the wordmark racks into focus. | **The halo turns to face us and we fly through it** — the inbox is framed in its opening. |
| Triage | 26.8 | AI scan beam tags every message; priorities rise, the rest folds into a deck; a click lifts the row into the email; facts highlight; summary slides from behind. | **The email turns over in 3D: its back is the reply.** Approve → the composer condenses into a toast. |
| Agents | 45.4 | Eva's reply: "walk through pricing on a call" — the phrase **detaches and flies into the calendar, becoming the meeting**; the conflict moves itself; the camera tilts down to tasks and a finance agent working in parallel. | **Every card collapses into a node on an orbit around a live WebGL core.** |
| Core | 57.0 | One intelligence, connected to everything: orbiting nodes, depth-sorted, data pulses. | Nodes converge and the camera pushes into the core until it's pure light. |
| Founders | 65.6 | In the light: **LUKA × ZIYAD**, ink on light. | The light folds into one line, which opens like a slit onto the next scene. |
| Calm | 71.2 | "Good morning." — the day, protected; click the focus block. | Zoom into the block: it grows into the document; AI completes the sentence. |
| Finale | 83.8 | The UI separates into layers and burns off as particles; two lines cross into the ×, **LUKA × ZIYAD** unfold; the lockup rises into a signature; the halo returns: ASTRYA. | Fade to black. |

## Architecture

```
src/
  main.ts            boot: fonts → scenes → master timeline → player
  timing.ts          chapter times (the film's structure in one place)
  data.ts            all product content (emails, events, tasks, brand)
  controls.ts        player HUD + score sync + pointer parallax
  core/
    clock.ts         master timeline, per-frame hooks, seeded RNG, sound cues
    stage.ts         fixed 1920×1080 stage scaled to fit (no layout shift)
    gsap.ts          plugins + the film's custom eases (cine, glide, suck, spring…)
    text.ts          typographic reveals (word/char/line, blur, tracking)
    background.ts    depth-parallax starfield, halos, light leak, film grain (canvas)
    fx.ts            transition particles: converge, implode, burst, shockwave, trail, dissolve
    orb.ts           WebGL ray-marched volumetric core
    cursor.ts        adaptive pointer that morphs around controls (magnetic)
  scenes/            intro · noise · brand · inbox · work · core · founders · morning · finale
scripts/
  render.mjs         Playwright frame-by-frame renderer → ffmpeg
  score.py           original score synthesised from the timeline's cue sheet
```

**Determinism.** Everything — DOM tweens, canvas particles, the orb shader, orbit
layout, grain — is a pure function of `master.time()`. No CSS animations, no
wall-clock timers. That is what makes scrubbing, chapter jumps and the frame-exact
MP4 export possible, and why the live version and the render are identical.

**Performance.** One GSAP ticker; procedural layers redraw only when time changes;
animation is transform/opacity/filter on composited layers; sprites are pre-rendered;
the orb renders at reduced internal resolution live. Measured JS cost per frame:
p50 < 1 ms, p95 < 3.5 ms across the film.

**Score.** `scenes/*` register sound cues (`cue("hit", t)`), exported with
`npm run render -- --cues scripts/cues.json`; `python3 scripts/score.py`
(numpy + scipy + ffmpeg) builds `public/audio/astrya-score.m4a` so impacts,
risers and UI clicks land on the exact frame.
