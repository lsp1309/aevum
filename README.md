# ASTRYA — product film (v2)

A 56-second cinematic product film for **ASTRYA**, an AI agent for professional email:
narrated, scored, colour-graded, delivered in **16:9** and a recomposed **9:16** cut.
Built as one real-time GSAP animation in the browser and rendered frame-exactly to MP4.

```bash
npm install
npm run dev                         # http://localhost:5173 (16:9) · /?format=vertical (9:16)
./scripts/render-all.sh             # → out/astrya-16x9.mp4  (1920×1080, 60 fps, graded, mixed)
FORMAT=vertical ./scripts/render-all.sh   # → out/astrya-9x16.mp4 (1080×1920, 60 fps)
```

Player: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> ±5 s · <kbd>1</kbd>–<kbd>8</kbd> chapters ·
<kbd>M</kbd> sound · <kbd>F</kbd> fullscreen · <kbd>R</kbd> restart. URL params: `?t=35`, `?paused`, `?format=vertical`.

## The film

| t | Narration | Picture |
|---|---|---|
| 0 | *Every day, your work arrives from everywhere.* | a spark bursts into notifications |
| 4 | *Emails. Meetings. Invoices. All at once.* | kinetic words, the noise accelerates |
| 7.7 | *What if it could all… fall into place?* | slow-motion vortex |
| 10.9 | *Meet ASTRYA.* | the halo ignites, traced by two comets |
| 14.4 | *It reads every message. Puts what matters first. And understands every detail.* | fly through the halo · scan · re-sort · highlights |
| 20.6 | *It drafts your reply, in your voice. You just approve.* | the email flips into the AI reply, typed live |
| 25.3 | *A call is mentioned? It's already in your calendar.* | the sentence flies into the calendar |
| 29 | *Invoices, deliveries, documents… handled, in parallel.* | agents at work |
| 35.5 | *One intelligence, connected to every tool you use.* | climax: coloured tools orbit the core |
| 43.5 | *So every morning starts with clarity.* | light folds into a slit → Good morning |
| 50 | *ASTRYA. Intelligence that works with you.* | the day burns off; halo, wordmark, CTA |

## Pipeline

- **Edit** — scenes are authored on a raw GSAP timeline; `src/timing.ts → EDIT` maps raw→film time
  through smooth monotone speed ramps anchored to narration beats and a 120 BPM grid (`src/core/film.ts`).
- **Voice** — `scripts/narration.json` → `python3 scripts/voice.py` (Kokoro-82M ONNX, voice *af_heart*,
  offline). Phrase timings are exported to `src/narration.timing.json` and drive kinetic words and captions.
- **Sound** — `npm run render -- --dev --cues scripts/cues.json` then `python3 scripts/mix.py`:
  original score (drone → groove → build → climax → resolve), sound design from timeline cues,
  sidechain + spectral ducking under the voice, −14 LUFS master.
- **Grade** — `scripts/grade.txt` (RGB highlight bloom, S-curve, cool blacks) applied at final encode.
- **9:16** — same animation recomposed per scene (`fmt()` in TS, `.fmt-v` in CSS), content kept in the
  Reels/TikTok safe zone (y 240–1480), burned-in captions for sound-off viewing.

Luka (Alpine Supplies) and Ziyad (Ops) appear only inside the example emails, calendar and tasks.

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
  scenes/            noise · brand · inbox · work · core · lightfold · morning · finale · kinetic (one file per scene)
scripts/
  render.mjs         Playwright frame-by-frame renderer → ffmpeg
  render-all.sh      parallel, resumable full render (segments + score)
  voice.py · mix.py  narration (Kokoro) · score + sound design + ducking + master
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
`npm run render -- --dev --cues scripts/cues.json`; `python3 scripts/voice.py`; `python3 scripts/mix.py`
(numpy + scipy + ffmpeg) builds `public/audio/astrya-mix.m4a` so impacts,
risers and UI clicks land on the exact frame.
