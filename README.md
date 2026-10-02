# ASTRYA — product film (v2)

A 63-second cinematic product film for **ASTRYA**, an AI agent for professional email:
narrated, scored, colour-graded, delivered in **16:9** and a recomposed **9:16** cut,
in **English** and **French**.
Built as one real-time GSAP animation in the browser and rendered frame-exactly to MP4.

```bash
npm install
npm run dev                         # http://localhost:5173 (16:9) · /?format=vertical (9:16)
./scripts/render-all.sh                   # → out/astrya-16x9-en.mp4 (1920×1080, 60 fps, graded, mixed)
FORMAT=vertical ./scripts/render-all.sh   # → out/astrya-9x16-en.mp4 (1080×1920, 60 fps)
LANG_CUT=fr ./scripts/render-all.sh       # → out/astrya-16x9-fr.mp4 (French cut)
./scripts/render-both.sh                  # all four cuts
```

Player: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> ±5 s · <kbd>1</kbd>–<kbd>8</kbd> chapters ·
<kbd>M</kbd> sound · <kbd>F</kbd> fullscreen · <kbd>R</kbd> restart. URL params: `?t=35`, `?paused`, `?format=vertical`, `?lang=fr`.

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
| 33.5 | | the core appears behind the cards; work items stream in on dotted arcs |
| 36.4 | *One intelligence.* | flash — the orbits ripple out; push in on ASTRYA Core |
| 41.4 | *Connected to every tool you use.* | pull back: six tools light up (glass spheres in holographic figures); the meeting lands on Calendar |
| 47.4 | *So every morning starts with clarity.* | Good morning, Ziyad — the day, focus time protected |
| 50.2 | *And your time goes back to what matters.* | the focus block opens into the Q4 Launch Plan draft |
| 53.6 | *ASTRYA. Intelligence that works with you.* | the halo sweeps in; wordmark, promise, call to action |

The core sequence (33.5–63) follows the composition, motion and timing of the original
film's 0:38–1:15 — same globe, orbits, tools and layout — rebuilt at a higher finish.

## Pipeline

- **Edit** — scenes are authored on a raw GSAP timeline; `src/timing.ts → EDIT` maps raw→film time
  through smooth monotone speed ramps anchored to narration beats and a 120 BPM grid (`src/core/film.ts`).
- **Voice** — `scripts/narration.<lang>.json` → `python3 scripts/voice.py en|fr` (Kokoro-82M ONNX, offline;
  *af_heart* in English, *ff_siwis* in French). Phrase timings are exported to `src/narration.timing.<lang>.json`
  and drive kinetic words and captions. French lines are fitted into the same picture slots.
- **Language** — `src/i18n.ts`: `?lang=fr` localises the narrative layer (voice, titles, kinetic words,
  captions, tagline, CTA); product UI stays as shipped.
- **Sound** — `npm run render -- --dev --cues scripts/cues.json` then `python3 scripts/mix.py en|fr`:
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
    globe.ts         WebGL core: glass sphere, parallax nebula, hot core, fresnel rim (full-frame shader)
    cursor.ts        adaptive pointer that morphs around controls (magnetic)
  scenes/            noise · brand · inbox · work · system · morning · focus · finale · kinetic (one file per scene)
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
`npm run render -- --dev --cues scripts/cues.json`; `python3 scripts/voice.py en|fr`; `python3 scripts/mix.py en|fr`
(numpy + scipy + ffmpeg) builds `public/audio/astrya-mix-<lang>.m4a` so impacts,
risers and UI clicks land on the exact frame.
