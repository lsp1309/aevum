import { tighten, trimMap, type Anchor } from "./core/film";
import TRIMS from "./trims.json";
import { SHORT } from "./core/stage";

/**
 * AUTHORED (raw) structure, in seconds. Scenes are written against these
 * times; the edit below remaps them into film time.
 *
 *  hook         → NOISE    a spark bursts into notifications: work arrives from everywhere
 *  turn         → BRAND    the noise is pulled into a vortex; the ASTRYA halo ignites from it
 *  what it does → INBOX    we fly through the halo: read, prioritise, understand, reply
 *               → WORK     a sentence becomes a meeting; agents work in parallel
 *  climax       → SYSTEM   everything flows into one core; its tools light up around it
 *  release      → MORNING  a calm morning…
 *               → FOCUS    …and time for the work that matters
 *  resolution   → FINALE   the halo, ASTRYA, its promise, the call to action
 *
 * From SYSTEM on, the edit runs at 1:1 (raw = film + 10.35): those scenes are
 * authored directly in film rhythm.
 */
export const T = {
  noise: 1.8,
  brand: 9.8,
  inbox: 14.2,
  work: 33.8,
  system: 43.85, // film 33.5
  morning: 57.75, // film 47.4
  focus: 60.55, // film 50.2
  finale: 63.95, // film 53.6
  end: 73.55, // film 63.2
};

/**
 * THE EDIT. (raw, film) anchor pairs, each tied to a narration beat
 * (scripts/narration.json). Between anchors the timeline speed-ramps smoothly.
 */
export const EDIT: Anchor[] = [
  { raw: 0, film: 0 },
  { raw: T.noise, film: 1.0 }, // spark bursts — "Every day…"
  { raw: 2.6, film: 1.7 }, // headline builds
  { raw: T.brand - 1.9, film: 7.9 }, // vortex — "What if it could all…"
  { raw: T.brand - 0.3, film: 9.9 }, // slow-motion: the halo ignites
  { raw: T.brand + 0.6, film: 10.8 }, // wordmark — "Meet ASTRYA."
  { raw: T.inbox - 1.5, film: 12.5 }, // fly through the halo
  { raw: T.inbox + 1.25, film: 14.5 }, // scan — "It reads every message…"
  { raw: T.inbox + 3.2, film: 16.5 }, // re-sort — "…puts what matters first…"
  { raw: T.inbox + 5.8, film: 17.8 }, // the email opens
  { raw: T.inbox + 8.0, film: 18.9 }, // highlights — "…understands every detail."
  { raw: T.inbox + 10.35, film: 20.5 }, // the card flips — "It drafts your reply…"
  { raw: T.inbox + 12.15, film: 21.4 }, // typing
  { raw: T.inbox + 16.2, film: 23.5 }, // approve — "…You just approve."
  { raw: T.inbox + 18.4, film: 24.6 }, // reply arrives
  { raw: T.inbox + 19.4, film: 25.5 }, // intent detected — "A call is mentioned?"
  { raw: T.work + 1.45, film: 26.5 }, // the sentence takes flight
  { raw: T.work + 2.8, film: 27.5 }, // lands in the calendar — "…already in your calendar."
  { raw: T.work + 4.7, film: 29.0 }, // camera tilts to the agents — "Invoices, deliveries…"
  { raw: T.work + 8.5, film: 32.0 }, // "Handled. In parallel."
  { raw: T.system, film: 33.5 }, // the agents' work flows into one core
  { raw: T.system + 1, film: 34.5 }, // (pins the 1:1 section)
  { raw: T.end, film: 63.2 }, // 1:1 to the end
];

/** The edit as played: tightened to run under a minute (src/trims.json). */
export const CUT = tighten(EDIT, TRIMS.spans);
const M = trimMap(TRIMS.spans);

/** Player chapters, in film time. */
const longChapters: Array<{ t: number; label: string }> = (
  [
  { t: 0, label: "Noise" },
  { t: 9.9, label: "ASTRYA" },
  { t: 12.5, label: "Inbox" },
  { t: 20.5, label: "Reply" },
  { t: 25.5, label: "Agents" },
  { t: 33.5, label: "Core" },
  { t: 47.4, label: "Morning" },
  { t: 53.6, label: "Finale" },
] as Array<{ t: number; label: string }>
).map((c) => ({ ...c, t: M(c.t) }));

/**
 * THE 30-SECOND CUT (`?cut=short`): only the essentials, joined by hard cuts
 * that core/transitions.ts turns into light transitions. Same scenes, same
 * animation — each reel is a stretch of the authored timeline, speed-ramped.
 * Picture hits sit on the short score's grid (beats at 0.3 + 0.5 k).
 *
 *   0.0  the noise — "Your work arrives from everywhere."
 *   5.8  the halo ignites — "Meet ASTRYA." — fly-through into the inbox
 *  10.3  ✂ the reply, written in your voice
 *  14.3  ✂ the core: work streams in, flash at 15.8 — "One intelligence."
 *  17.3  ✂ pull back: the tools light up — "Connected to every tool you use."
 *  21.8  ✂ the halo, ASTRYA, the promise, the call to action → 30.0
 */
export const SHORT_REELS: Anchor[][] = [
  [
    { raw: 0.6, film: 0 },
    { raw: T.noise, film: 0.8 }, // the spark lands
    { raw: 2.6, film: 1.2 },
    { raw: 4.6, film: 2.6 },
    { raw: 6.6, film: 4.8 },
    { raw: T.brand - 1.9, film: 5.3 }, // vortex
    { raw: T.brand - 0.35, film: 5.8 }, // the halo ignites
    { raw: T.brand + 0.55, film: 6.4 }, // wordmark
    { raw: 11.6, film: 7.3 },
    { raw: T.inbox - 1.5, film: 7.9 }, // fly through the halo
    { raw: 14.0, film: 8.55 },
    { raw: T.inbox + 1.25, film: 9.2 }, // scan
    { raw: T.inbox + 3.2, film: 10.0 }, // re-sort
    { raw: T.inbox + 3.8, film: 10.3 },
  ],
  [
    { raw: T.inbox + 10.1, film: 10.3 },
    { raw: T.inbox + 10.35, film: 10.45 }, // the card flips
    { raw: T.inbox + 12.15, film: 11.3 }, // typing
    { raw: T.inbox + 16.2, film: 13.4 }, // approve
    { raw: T.inbox + 17.2, film: 14.3 },
  ],
  [
    { raw: T.system + 0.55, film: 14.3 }, // the core behind the cards
    { raw: T.system + 2.9, film: 15.8 }, // flash
    { raw: T.system + 4.9, film: 16.8 }, // push in
    { raw: T.system + 5.55, film: 17.3 },
  ],
  [
    { raw: T.system + 7.7, film: 17.3 }, // pull back
    { raw: T.system + 9.6, film: 18.6 }, // the meeting lands on Calendar
    { raw: T.system + 10.95, film: 19.7 }, // holographic figures
    { raw: T.system + 12.55, film: 21.0 },
    { raw: T.system + 13.45, film: 21.8 },
  ],
  [
    { raw: T.finale - 0.18, film: 21.8 }, // the halo already sweeping in
    { raw: T.finale + 0.9, film: 22.8 }, // the halo settles
    { raw: T.finale + 1.4, film: 23.2 }, // wordmark
    { raw: T.finale + 2.85, film: 24.4 }, // promise
    { raw: T.finale + 4.55, film: 25.8 }, // call to action
    { raw: T.finale + 6.65, film: 27.6 },
    { raw: T.finale + 7.7, film: 28.3 },
    { raw: T.end, film: 30.0 },
  ],
];
/** Cut points of the short film (film s) and the transition played on each. */
export const SHORT_CUTS: Array<{ t: number; kind: "whip" | "punch" | "flash" | "implode" }> = [
  { t: 10.3, kind: "whip" },
  { t: 14.3, kind: "punch" },
  { t: 17.3, kind: "flash" },
  { t: 21.8, kind: "implode" },
];
export const shortChapters: Array<{ t: number; label: string }> = [
  { t: 0, label: "Noise" },
  { t: 5.8, label: "ASTRYA" },
  { t: 8.55, label: "Inbox" },
  { t: 10.3, label: "Reply" },
  { t: 14.3, label: "Core" },
  { t: 21.8, label: "Finale" },
];

export const chapters = SHORT ? shortChapters : longChapters;
