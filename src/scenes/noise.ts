import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, atmos, CX, CY, fmt, W, SHORT } from "../core/stage";
import { titleIn, titleOut } from "../core/text";
import { burst, implode, shockwave, mote } from "../core/fx";
import { icon, avatar } from "../core/icons";
import { noise, type Noise } from "../data";
import { T } from "../timing";
import { toRaw } from "../core/film";
import { TXT, listBeats } from "../i18n";
import "./noise.css";

/** Hand-composed depth layout: [cx, cy, z, rotY]. The centre band is kept
 *  clear for the headline; far cards may pass behind it, blurred. */
const SLOTS_H: Array<[number, number, number, number]> = [
  [560, 262, 40, 8],
  [1395, 238, -90, -10],
  [1515, 805, 60, -12],
  [395, 792, -40, 10],
  [985, 160, -460, 0],
  [1745, 520, -320, -16],
  [205, 512, -380, 16],
  [1150, 905, -240, -4],
  [745, 905, -520, 4],
  [1700, 150, -640, -14],
  [250, 165, -700, 14],
  [1130, 330, -900, -4],
  [760, 740, -880, 6],
  [1820, 860, -560, -18],
  [120, 880, -600, 18],
  [1580, 575, 200, -14],
  [372, 610, 240, 14],
  [960, 970, 120, 0],
];
/** 9:16 constellation: the centre band (y 820–1100) stays clear for the words. */
const SLOTS_V: Array<[number, number, number, number]> = [
  [300, 430, 40, 8],
  [790, 350, -90, -10],
  [790, 1380, 60, -12],
  [290, 1330, -40, 10],
  [560, 250, -460, 0],
  [880, 700, -320, -16],
  [190, 640, -380, 16],
  [700, 1560, -240, -4],
  [330, 1610, -520, 4],
  [860, 200, -640, -14],
  [220, 190, -700, 14],
  [640, 560, -900, -4],
  [430, 1470, -880, 6],
  [900, 1240, -560, -18],
  [160, 1190, -600, 18],
  [800, 1210, 200, -14],
  [270, 1250, 240, 14],
  [560, 1720, 120, 0],
];
const SLOTS = fmt(SLOTS_H, SLOTS_V);

function cardHTML(n: Noise) {
  const lead =
    n.kind === "mail"
      ? avatar(n.initials!, n.hue!)
      : `<span class="nk-ico nk-${n.kind}">${
          { chat: icon.hash, invite: icon.calendar, file: icon.file, alert: icon.alert, reminder: icon.bell, mail: icon.mail }[n.kind]
        }</span>`;
  const foot =
    n.kind === "invite"
      ? `<div class="nk-actions"><span class="nk-btn">Accept</span><span class="nk-btn ghost">Decline</span></div>`
      : "";
  return `<div class="nk-orbit"><div class="ncard card soft nk-${n.kind}">
      <div class="nk-row">
        <div class="nk-lead">${lead}<span class="nk-ping"></span></div>
        <div class="nk-main">
          <div class="nk-top"><span class="nk-title">${n.title}</span><span class="nk-meta">${n.meta}</span></div>
          <div class="nk-body">${n.body ?? ""}</div>
        </div>
      </div>${foot}
    </div></div>`;
}

export function buildNoise(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-noise">
    <div class="noise-field">
      ${noise.map(cardHTML).join("")}
    </div>
    <div class="noise-shade"></div>
    <h2 class="noise-title t-a">${TXT.titleA}</h2>
    <h2 class="noise-title t-b">${TXT.titleB}</h2>
    <div class="noise-kin"><span>${TXT.kin[0]}</span><span>${TXT.kin[1]}</span><span class="amber">${TXT.kin[2]}</span></div>
    <div class="noise-counter card soft">
      <span class="nc-ico">${icon.bell}</span>
      <span class="nc-label">Unread</span>
      <span class="nc-num">3</span>
    </div>
    <div class="noise-seed"></div>
    <div class="noise-spark"></div>
  </section>`);
  camera.appendChild(root);
  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const field = q(".noise-field");
  const orbits = Array.from(root.querySelectorAll<HTMLElement>(".nk-orbit"));
  const cards = orbits.map((o) => o.querySelector(".ncard") as HTMLElement);
  const t0 = T.noise;
  const vortex = T.brand - 1.9;

  tl.set(root, { autoAlpha: 1 }, 0);

  // ── opening: the dark wakes up, a spark drifts in and lands ───────────
  tl.to(atmos, { stars: 0.6, duration: 2.6, ease: "sine.inOut" }, 0);
  tl.to(atmos, { halo: 0.5, zoom: 1.06, duration: 3, ease: "sine.inOut" }, 0.2);
  const spark = (p: number) => {
    const e = 1 - Math.pow(1 - p, 2.2);
    return { x: CX + (W * 0.29) * (1 - e), y: CY + 230 * (1 - e) - Math.sin(p * Math.PI) * 110 };
  };
  mote(0.05, t0 - 0.05, spark, (p) => Math.min(1, p * 5));
  cue("riser", 0.1, t0 - 0.1, 0.45);
  gsap.set(".noise-spark", { xPercent: -50, yPercent: -50, x: CX, y: CY });
  tl.fromTo(".noise-spark", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "cine" }, t0 - 0.15);
  tl.to(".noise-spark", { scale: 2.6, duration: 0.18, ease: "sine.out" }, t0 - 0.02);
  tl.to(".noise-spark", { scale: 0.4, opacity: 0, duration: 0.5, ease: "cine" }, t0 + 0.16);
  cue("hit", t0, undefined, 0.9);
  gsap.set(orbits, { x: CX, y: CY });
  gsap.set(".noise-title, .noise-seed", { xPercent: -50, yPercent: -50, x: CX, y: CY });

  // the singularity from the intro releases a pulse
  shockwave(t0, 1.4, CX, CY, 900, 0.62, 2.5);
  burst(t0, 1.2, CX, CY, 90, 520, 31, 0.62);
  tl.to(atmos, { halo: 0.75, leak: 0.6, duration: 3, ease: "sine.inOut" }, t0);

  // camera drifts into the field (depth reads through parallax between layers)
  tl.fromTo(field, { rotationY: -8, rotationX: 7, z: -60 }, { rotationY: 6, rotationX: -3, z: 170, duration: vortex - t0 + 0.6, ease: "sine.inOut" }, t0 - 0.1);

  // cards erupt from depth, faster and faster
  const n = cards.length;
  cards.forEach((card, i) => {
    const [cx, cy, z, ry] = SLOTS[i % SLOTS.length];
    const at = t0 + 0.25 + 5.3 * Math.pow(i / (n - 1), 0.62);
    const far = z < -300;
    const near = z > 150;
    const blur = far ? Math.min(4, (-z - 300) / 110) : near ? 1.6 : 0;
    const alpha = far ? Math.max(0.38, 1 + (z + 300) / 900) : 1;
    gsap.set(card, { xPercent: -50, yPercent: -50 });
    if (i === 0) {
      // the first message is born from the point itself
      tl.fromTo(
        card,
        { x: 0, y: 0, z: -200, scale: 0.1, opacity: 0, filter: "blur(10px)", rotationY: 0 },
        { x: cx - CX, y: cy - CY, z, scale: 1, opacity: 1, filter: "blur(0px)", rotationY: ry, duration: 1.5, ease: "cine" },
        at,
      );
    } else {
      tl.fromTo(
        card,
        { x: cx - CX, y: cy - CY + 50, z: z - 650, scale: 0.75, rotationX: 28, rotationY: ry * 2.5, opacity: 0, filter: "blur(18px)" },
        { y: cy - CY, z, scale: 1, rotationX: 0, rotationY: ry, opacity: alpha, filter: `blur(${blur}px)`, duration: 1.35, ease: "cine" },
        at,
      );
    }
    cue("tick", at + 0.3, undefined, 0.25 + 0.5 * (i / n));
    const ping = card.querySelector(".nk-ping")!;
    tl.fromTo(ping, { scale: 0.4, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 1.1, ease: "cine" }, at + 0.35);
    // slow independent drift → the field never freezes
    const driftAt = at + 1.35;
    if (vortex - driftAt > 0.3)
      tl.to(card, { x: `+=${((i * 37) % 50) - 25}`, y: `-=${18 + ((i * 53) % 40)}`, duration: vortex - driftAt, ease: "none" }, driftAt);
  });

  // headline A, then B — the pace tightens
  const ta = q(".t-a");
  const tb = q(".t-b");
  tl.fromTo(".noise-shade", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "sine.out" }, t0 + 0.5);
  tl.add(titleIn(ta, { stagger: 0.085, dur: 1.4, track: ["0.04em", "-0.025em"] }), t0 + 0.8);
  const K = listBeats(); // emails · meetings · invoices · all at once
  tl.add(titleOut(ta, { stagger: 0.03, dur: 0.5 }), toRaw(K[0] - (SHORT ? 0.7 : 0.45)));
  // Emails. Meetings. Invoices. — each word lands on the voice, the previous one is knocked out
  const kin = Array.from(root.querySelectorAll<HTMLElement>(".noise-kin span"));
  gsap.set(".noise-kin", { xPercent: -50, yPercent: -50, x: CX, y: CY });
  const ins = [K[0], K[1], K[2]];
  const outs = [ins[1] - 0.2, ins[2] - 0.2, K[3] - 0.22];
  ins.forEach((f, i) => {
    const el = kin[i];
    const span = (g: number, d: number) => toRaw(g + d) - toRaw(g);
    tl.fromTo(el, { opacity: 0, scale: 1.3, y: 24, filter: "blur(16px)", letterSpacing: "0.18em" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", letterSpacing: "-0.03em", duration: span(f, 0.34), ease: "cine" }, toRaw(f));
    tl.to(el, { opacity: 0, scale: 0.9, y: -16, filter: "blur(12px)", duration: span(outs[i], 0.17), ease: "exit" }, toRaw(outs[i]));
    cue("soft", toRaw(f), undefined, 0.35);
  });
  // (the 30-second cut runs straight from the three words into the vortex)
  if (SHORT) gsap.set(tb, { autoAlpha: 0 });
  else tl.add(titleIn(tb, { stagger: 0.12, dur: 0.9, track: ["0.1em", "-0.03em"] }), toRaw(K[3] - 0.05));

  // unread counter: climbs with an accelerating ease
  const counter = q(".noise-counter");
  const num = q(".nc-num");
  tl.fromTo(counter, { opacity: 0, y: -16, filter: "blur(8px)", scale: 0.92 }, { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 1, ease: "cine" }, t0 + 1.0);
  const cnt = { v: 3 };
  tl.to(cnt, { v: 147, duration: 5.0, ease: "power2.in", onUpdate: () => (num.textContent = String(Math.round(cnt.v))) }, t0 + 1.2);
  tl.fromTo(counter, { boxShadow: "0 0 0px rgba(255,180,90,0)" }, { boxShadow: "0 0 40px rgba(255,180,90,0.35)", duration: 2, ease: "sine.in" }, t0 + 4.2);

  // ── T2: a point of calm appears and pulls everything in ───────────────
  const seed = q(".noise-seed");
  tl.fromTo(seed, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "cine" }, vortex - 0.5);
  tl.add(titleOut(tb, { stagger: 0.03, dur: 0.5 }), vortex - 0.45);
  tl.to(counter, { opacity: 0, x: -30, filter: "blur(10px)", duration: 0.6, ease: "exit" }, vortex - 0.3);
  tl.to(".noise-shade", { opacity: 0, duration: 0.8 }, vortex - 0.3);
  tl.to(atmos, { pull: 0.6, duration: 1.4, ease: "suck" }, vortex);
  tl.to(atmos, { pull: 0, duration: 1.6, ease: "cine" }, vortex + 1.5);

  cue("riser", vortex - 0.4, T.brand - 0.15 - (vortex - 0.4), 0.9);
  // outermost cards go first: the spiral wraps inwards
  const order = cards
    .map((c, i) => ({ c, o: orbits[i], d: Math.hypot(SLOTS[i][0] - CX, SLOTS[i][1] - CY) - SLOTS[i][2] * 0.3 }))
    .sort((a, b) => b.d - a.d);
  order.forEach(({ c, o }, k) => {
    const at = vortex + k * 0.045;
    tl.to(o, { rotation: 110 + (k % 3) * 25, duration: 1.25, ease: "suck" }, at);
    tl.to(c, { x: 0, y: 0, z: -120, scale: 0.04, rotationY: 0, filter: "blur(8px)", duration: 1.25, ease: "suck" }, at);
    tl.to(c, { opacity: 0, duration: 0.35, ease: "sine.in" }, at + 0.95);
  });
  implode(vortex, 1.6, CX, CY, 260, 1000, 41);
  tl.to(seed, { scale: 2.6, duration: 1.4, ease: "suck" }, vortex + 0.2);
  tl.to(seed, { scale: 0.5, opacity: 0, duration: 0.5, ease: "cine" }, T.brand - 0.2);
  tl.set(root, { autoAlpha: 0 }, T.brand + 0.4);
}
