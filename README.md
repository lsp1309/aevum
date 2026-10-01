# ASTRYA — product film

An ~83-second cinematic product film for **ASTRYA**, an AI agent for professional
email, built as a single real-time GSAP animation in the browser and exported
frame-exactly to MP4 (1920×1080, 60 fps).

```bash
npm install
npm run dev                  # http://localhost:5173 — plays in the browser
npm run build                # static build in dist/
./scripts/render-all.sh      # → out/astrya.mp4 (60 fps, parallel + resumable, with score)
FPS=30 ./scripts/render-all.sh   # faster 30 fps render
```

Player: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> ±5 s · <kbd>1</kbd>–<kbd>7</kbd> chapters ·
<kbd>M</kbd> sound · <kbd>F</kbd> fullscreen · <kbd>R</kbd> restart. URL params: `?t=45` start at 45 s, `?paused`.

## Storyline

| Chapter | t (s) | Beat | Transition out |
|---|---|---|---|
| Noise | 0 | A spark drifts in and bursts into notifications: "Your work arrives from everywhere." → "All of it. All at once." | A calm point pulls every card into a spiral vortex. |
| ASTRYA | 9.8 | The point unfolds into the halo, traced by two comets; the wordmark racks into focus. | **The halo turns to face us and we fly through it** into the inbox. |
| Triage | 14.2 | Scan beam tags every message, priorities rise, the rest folds into a deck; Luka's contract email opens; ASTRYA reads it and highlights the facts. | **The email turns over in 3D: its back is the reply**, typed live ("Hi Luka … Ziyad"). Approve → toast. |
| Agents | 33.8 | Luka replies; "walk through pricing on a call" **flies into the calendar and becomes the meeting**; the conflict moves itself; tasks + finance agent: "Handled. In parallel." | **Every card collapses into a coloured node orbiting the core.** |
| Core | 45.4 | "One intelligence." Seven coloured tools (Mail, Calendar, Slack, Finance, Tasks, Docs, Logistics) on inclined 3D orbits, with trails and pulsing links. | Push into the core → the light folds into a line → a slit opens. |
| Calm | 58.4 | "Good morning." — the day, protected; click the focus block. | Zoom into the block: it becomes the Q4 Launch Plan, completed by the AI. |
| Finale | 71.0 | The UI burns off into particles; two lines collide and ignite the ASTRYA halo; blade-lit wordmark, tagline, CTA. | Fade to black. |

Luka (Alpine Supplies) and Ziyad (Ops) appear only as the people inside the example
emails, calendar and tasks (`src/data.ts → PEOPLE`).

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
  scenes/            noise · brand · inbox · work · core · lightfold · morning · finale (one file per scene)
scripts/
  render.mjs         Playwright frame-by-frame renderer → ffmpeg
  render-all.sh      parallel, resumable full render (segments + score)
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
