/**
 * Film structure (seconds). Scenes overlap: each transition belongs to the
 * scene that *causes* it, so every cut has a visual reason.
 *
 *  discovery    → NOISE    a spark drifts in, pulses, and bursts into notifications
 *               → BRAND    the noise is pulled into a vortex; the ASTRYA halo ignites from it
 *  understanding→ INBOX    we fly through the halo into the product: triage, read, reply
 *  power        → WORK     a sentence becomes a meeting; agents work in parallel
 *               → CORE     every card collapses into a coloured node orbiting the core
 *  impression   → LIGHT    we push into the core; the light folds into a line…
 *               → MORNING  …that opens like a slit on a calm day
 *  conclusion   → FINALE   the UI dissolves; two lines of light cross and ignite ASTRYA
 */
export const T = {
  noise: 1.8,
  brand: 9.8,
  inbox: 14.2,
  work: 33.8,
  core: 45.4,
  light: 56.0,
  morning: 58.4,
  finale: 71.0,
  end: 82.6,
};

export const chapters: Array<{ t: number; label: string }> = [
  { t: 0, label: "Noise" },
  { t: T.brand, label: "ASTRYA" },
  { t: T.inbox, label: "Triage" },
  { t: T.work, label: "Agents" },
  { t: T.core, label: "Core" },
  { t: T.morning, label: "Calm" },
  { t: T.finale, label: "Finale" },
];
