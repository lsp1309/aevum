import type { Anchor } from "./core/film";

/**
 * AUTHORED (raw) structure, in seconds. Scenes are written against these
 * times; the edit below remaps them into film time.
 *
 *  hook         → NOISE    a spark bursts into notifications: work arrives from everywhere
 *  turn         → BRAND    the noise is pulled into a vortex; the ASTRYA halo ignites from it
 *  what it does → INBOX    we fly through the halo: read, prioritise, understand, reply
 *               → WORK     a sentence becomes a meeting; agents work in parallel
 *  climax       → CORE     every card becomes a coloured node orbiting one intelligence
 *  release      → LIGHT    we push into the core; the light folds into a slit…
 *               → MORNING  …that opens on a calm morning
 *  resolution   → FINALE   the day burns off into light; ASTRYA, its promise, the call to action
 */
export const T = {
  noise: 1.8,
  brand: 9.8,
  inbox: 14.2,
  work: 33.8,
  core: 45.4,
  light: 56.0,
  morning: 58.4,
  finale: 63.4,
  end: 73.6,
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
  { raw: T.core - 1.55, film: 33.5 }, // cards collapse into nodes
  { raw: T.core - 0.15, film: 34.5 }, // the core ignites
  { raw: T.core + 0.9, film: 35.5 }, // "One intelligence…"
  { raw: T.light - 2.7, film: 40.2 }, // convergence
  { raw: T.light, film: 42.0 }, // pure light
  { raw: T.morning, film: 43.5 }, // "So every morning starts with clarity."
  { raw: T.finale - 0.3, film: 47.0 }, // the day burns off
  { raw: T.finale + 1.8, film: 48.5 }, // lines collide, halo ignites
  { raw: T.finale + 3.25, film: 50.0 }, // wordmark — "ASTRYA."
  { raw: T.end, film: 56.5 },
];

/** Player chapters, in film time. */
export const chapters: Array<{ t: number; label: string }> = [
  { t: 0, label: "Noise" },
  { t: 9.9, label: "ASTRYA" },
  { t: 12.5, label: "Inbox" },
  { t: 20.5, label: "Reply" },
  { t: 25.5, label: "Agents" },
  { t: 33.5, label: "Core" },
  { t: 43.5, label: "Morning" },
  { t: 47.0, label: "Finale" },
];
