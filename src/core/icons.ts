/** Hairline icon set (1.6px strokes, 24 grid) — consistent with the UI type weight. */
const s = (d: string, extra = "") =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const icon = {
  mail: s(`<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>`),
  calendar: s(`<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`),
  check: s(`<path d="m5 12.5 4.2 4.2L19 7"/>`),
  finance: s(`<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>`),
  doc: s(`<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>`),
  truck: s(`<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>`),
  users: s(`<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.6.6 2.6 2 3 4.4"/>`),
  tasks: s(`<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.4 2.4L15.8 9.5"/>`),
  hash: s(`<path d="M9 4 7.5 20M16.5 4 15 20M4.5 9h15M3.5 15h15"/>`),
  file: s(`<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 12h6v6H9zM12 12v6M9 15h6"/>`),
  alert: s(`<path d="M12 4 21 19H3Z"/><path d="M12 10v4M12 16.6v.1"/>`),
  bell: s(`<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>`),
  clock: s(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`),
  shield: s(`<path d="M12 3.5 19 6v5.5c0 4.2-3 7.6-7 9-4-1.4-7-4.8-7-9V6Z"/><path d="m9 12 2.2 2.2L15.2 10"/>`),
  arrow: s(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  sparkle: s(`<path d="M12 3.5c.6 4.3 2.2 5.9 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.6 5.9-2.2 6.5-6.5Z"/><path d="M18.5 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5Z"/>`),
  reply: s(`<path d="M10 8 5 12.5 10 17"/><path d="M5.5 12.5H14a5 5 0 0 1 5 5v1"/>`),
  paperclip: s(`<path d="m20 11.5-7.8 7.8a4.6 4.6 0 0 1-6.5-6.5l8.3-8.3a3 3 0 0 1 4.3 4.3l-8.3 8.3a1.5 1.5 0 0 1-2.1-2.1l7.6-7.6"/>`),
};

/**
 * The ASTRYA mark, as in the original film: a flat ring of light seen in
 * perspective — a white band, full width at the ends of its long axis and a
 * thin line along its sides — tilted −31°. In the mark's own units (viewBox
 * −200…200): outer ellipse RING_A × RING_B, band RING_W wide at the ends.
 */
export const RING_A = 146;
export const RING_B = 48.5;
export const RING_W = 17.5;
export const RING_TILT = -31;
const ell = (a: number, b: number) => `M${-a} 0a${a} ${b} 0 1 0 ${2 * a} 0a${a} ${b} 0 1 0 ${-2 * a} 0`;
const MID_A = RING_A - RING_W / 2;
const MID_B = (MID_A * RING_B) / RING_A;
let uid = 0;
export function ringMark(cls = "", tilt = RING_TILT) {
  const id = `rk${uid++}`;
  const ia = RING_A - RING_W;
  const ib = (ia * RING_B) / RING_A;
  const band = `${ell(RING_A, RING_B)}${ell(ia, ib)}`;
  return `<svg class="ring-mark ${cls}" viewBox="-200 -200 400 400" fill="none" aria-hidden="true">
    <defs>
      <mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400">
        <path class="ring-reveal" d="${ell(MID_A, MID_B)}" stroke="#fff" stroke-width="52" stroke-linecap="round"/>
      </mask>
    </defs>
    <g transform="rotate(${tilt})">
      <g mask="url(#${id})">
        <path class="ring-glow" d="${band}" fill="#cfe0ff" fill-rule="evenodd"/>
        <path class="ring-main" d="${band}" fill="#ffffff" fill-rule="evenodd"/>
      </g>
      <path class="ring-echo" d="${ell(RING_A * 1.12, RING_B * 1.12 + 6)}" stroke="#9db8ff" stroke-width="1"/>
      <path class="ring-glint" d="${ell(MID_A, MID_B)}" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    </g>
  </svg>`;
}

export function avatar(initials: string, hue: number) {
  return `<span class="avatar${initials.length === 1 ? " solo" : ""}" style="--h:${hue}">${initials}</span>`;
}

/** Point on the halo's centre line (an ellipse, drawn from the left, through
 *  the bottom, then the top) at path fraction s ∈ [0,1], in the mark's own
 *  units, before the tilt. */
export function ringPoint(s: number) {
  if (s <= 0.5) {
    const a = Math.PI * (s * 2);
    return { x: -MID_A * Math.cos(a), y: MID_B * Math.sin(a) };
  }
  const a = Math.PI * (s * 2 - 1);
  return { x: MID_A * Math.cos(a), y: -MID_B * Math.sin(a) };
}
