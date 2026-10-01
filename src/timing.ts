/**
 * Film structure (seconds). Scenes overlap: each transition belongs to the
 * scene that *causes* it, so every cut has a visual reason.
 *
 *  mystery      → INTRO    a spark becomes LUKA, the camera finds ZIYAD, the two lock up
 *  discovery    → NOISE    the lockup collapses into a point that bursts into notifications
 *               → BRAND    the noise is pulled into a vortex; the ASTRYA halo ignites from it
 *  understanding→ INBOX    we fly through the halo into the product: triage, read, reply
 *  power        → WORK     a sentence becomes a meeting; agents work in parallel
 *               → CORE     every card collapses into an orbiting node around the core
 *  impression   → LIGHT    we push into the core: LUKA × ZIYAD, in light
 *               → MORNING  the light folds into a line that opens on a calm day
 *  conclusion   → FINALE   the UI dissolves; LUKA × ZIYAD, then ASTRYA
 */
export const T = {
  intro: 0,
  noise: 14.4,
  brand: 22.4,
  inbox: 26.8,
  work: 45.4,
  core: 57.0,
  light: 65.6,
  morning: 71.2,
  finale: 83.8,
  end: 98.6,
};

export const chapters: Array<{ t: number; label: string }> = [
  { t: T.intro, label: "Origin" },
  { t: T.noise, label: "Noise" },
  { t: T.brand, label: "ASTRYA" },
  { t: T.inbox, label: "Triage" },
  { t: T.work, label: "Agents" },
  { t: T.core, label: "Core" },
  { t: T.light, label: "Founders" },
  { t: T.morning, label: "Calm" },
  { t: T.finale, label: "Finale" },
];
