import { gsap } from "../../core/gsap";
import { onFrame, clamp, lerp, smooth, cue } from "../../core/clock";
import { W, html, world, front, box } from "../stage";
import { S, VO, beat } from "../timing";
import { paint, glowPath, flare } from "../light";
import { sky } from "../sky";
import { ROWS } from "../data";
import { ROW, rowY } from "./noise";
import { PRICING } from "../layout";

/**
 * ACT II·b — TRIAGE. The noise has become one calm inbox. Each row is read
 * (a light passes over it) and labelled; then all but two fall away into the
 * dark while the counter rolls from 312 down to 2.
 * ACT III·a — THE REPLY. The camera rises with Luka's email; a reply unfolds
 * out of it and writes itself, in Ziyad's voice. One phrase of it —
 * "Thursday at 14:30" — lifts off the page and falls into the week.
 */
const sparkle = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.5 4.6 2.4 6.9 7.5 9.5-5.1 2.6-7 4.9-7.5 9.5-.5-4.6-2.4-6.9-7.5-9.5 5.1-2.6 7-4.9 7.5-9.5Z"/></svg>`;
const KEY_A = 4; // contract renewal — the hero
const KEY_B = 7; // invoice 4821

const words = (s: string) =>
  s
    .split(" ")
    .map((w) => `<span class="wd">${w}</span>`)
    .join(" ");

export function buildInbox(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene inbox" id="s-inbox">
    ${ROWS.map(
      (r, i) => `<div class="row glass${r.key ? " is-key" : ""}" style="top:${rowY(i)}px;border-radius:22px">
        <span class="av${r.from.startsWith("Luka") ? "" : " dim"}">${r.initials}</span>
        <div class="tx"><b>${r.from}</b><span>${r.subject}</span></div>
        <span class="tm">${r.time}</span>
        <span class="tag${r.tone ? ` ${r.tone}` : ""}">${r.tag}</span>
        <i class="read"></i>
      </div>`,
    ).join("")}
    <div class="reply">
      <div class="rp-head">${sparkle}<span>Reply · drafted by Astrya</span>
        <span class="rp-tone"><span class="wave">${"<i></i>".repeat(7)}</span>Your tone</span>
      </div>
      <p class="rp-body">${words("Hi Luka — thanks for sending the renewal over. Everything looks right on our side. Happy to walk through pricing on")} <span class="hl"><i class="hlbg"></i>${words("Thursday at 14:30.")}</span></p>
      <div class="rp-sign"><span class="wd">— Ziyad</span></div>
      <div class="rp-foot"><span class="btn-send"><span class="bs-l">Send</span></span><span class="mono">⌘ ↵</span></div>
    </div>
    <div class="voiceprint abs">
      <div class="vp-bars">${"<i></i>".repeat(56)}</div>
      <div class="vp-label mono">VOICE PROFILE · ZIYAD · LEARNED FROM 2,140 SENT EMAILS</div>
    </div>
  </section>`);
  world.appendChild(root);
  const rows = Array.from(root.querySelectorAll<HTMLElement>(".row"));
  const tags = rows.map((r) => r.querySelector<HTMLElement>(".tag")!);
  const reads = rows.map((r) => r.querySelector<HTMLElement>(".read")!);
  const reply = root.querySelector<HTMLElement>(".reply")!;
  const hero = rows[KEY_A];
  const second = rows[KEY_B];
  const others = rows.filter((_, i) => i !== KEY_A && i !== KEY_B);
  const vp = root.querySelector<HTMLElement>(".voiceprint")!;
  const bars = Array.from(vp.querySelectorAll<HTMLElement>(".vp-bars i"));
  const toneBars = Array.from(reply.querySelectorAll<HTMLElement>(".wave i"));
  const hl = reply.querySelector<HTMLElement>(".hl")!;
  const hlbg = reply.querySelector<HTMLElement>(".hlbg")!;
  const bodyWords = Array.from(reply.querySelectorAll<HTMLElement>(".rp-body .wd, .rp-sign .wd"));
  const send = reply.querySelector<HTMLElement>(".btn-send")!;
  const sendLabel = reply.querySelector<HTMLElement>(".bs-l")!;

  gsap.set(tags, { opacity: 0, scale: 0.6, x: 12 });
  gsap.set(reply, { autoAlpha: 0 });
  gsap.set(vp, { autoAlpha: 0 });
  gsap.set(hlbg, { scaleX: 0 });
  tl.set(root, { visibility: "visible" }, S.rows);

  // ── read & label ─────────────────────────────────────────────────────────
  const r0 = S.rows + 0.12;
  rows.forEach((_, i) => {
    const t = r0 + i * 0.075;
    tl.fromTo(reads[i], { "--r": 0 }, { "--r": 1, duration: 0.55, ease: "power2.inOut" }, t);
    tl.to(tags[i], { opacity: 1, scale: 1, x: 0, duration: 0.45, ease: "back.out(2.2)" }, t + 0.32);
    if (i % 2 === 0) cue("tick", t + 0.32, undefined, 0.5);
  });

  // ── triage: ten rows fall away into the dark; two come forward ──────────
  const s0 = S.sort - 0.05;
  others.forEach((r) => {
    const i = rows.indexOf(r);
    const d = Math.abs(i - 5.5);
    tl.to(r, { z: -900 - 60 * d, y: (i - 5.5) * 60, rotationX: (i - 5.5) * 3, opacity: 0, filter: "blur(8px)", duration: 0.9, ease: "power3.in" }, s0 + d * 0.035);
  });
  const ya = 1150;
  const yb = 1282;
  tl.to(hero, { y: ya - rowY(KEY_A), z: 30, duration: 1.0, ease: "power3.inOut" }, s0 + 0.15);
  tl.to(second, { y: yb - rowY(KEY_B), z: 30, duration: 1.0, ease: "power3.inOut" }, s0 + 0.2);
  tl.to([hero, second], {
    boxShadow: "inset 0 1px 0 rgba(255,240,225,0.16), inset 0 0 0 1.5px rgba(255,170,110,0.6), 0 0 70px -10px rgba(255,120,60,0.5), 0 40px 70px -30px rgba(0,0,0,0.9)",
    duration: 0.6,
  }, s0 + 0.7);
  cue("whoosh", s0, 1.0, 0.5);
  cue("hit", S.sort + DOWN_END(), undefined, 0.55);
  for (let k = 0; k < 14; k++) cue("tick", S.sort + 0.9 * Math.pow(k / 14, 1.8), undefined, 0.4);

  // ── the dive: Luka's email rises; its reply unfolds out of it ────────────
  const D0 = S.dive;
  tl.to(second, { y: "+=520", opacity: 0, filter: "blur(10px)", rotationX: -20, duration: 0.55, ease: "power3.in" }, D0 - 0.2);
  tl.to(hero, { y: 330 - rowY(KEY_A), z: 0, duration: 0.75, ease: "power3.inOut" }, D0 - 0.1);
  tl.fromTo(reply, { autoAlpha: 0, rotationX: -96, y: -10 }, { autoAlpha: 1, rotationX: 0, y: 0, duration: 0.75, ease: "power3.out" }, D0 + 0.3);
  tl.from(reply.querySelectorAll(".rp-head > *"), { opacity: 0, x: -14, duration: 0.5, stagger: 0.06, ease: "power2.out" }, D0 + 0.5);
  tl.fromTo(bodyWords, { opacity: 0, filter: "blur(8px)", y: 10 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.42, stagger: 0.041, ease: "power2.out" }, VO.voice.start - 0.05);
  tl.from(reply.querySelectorAll(".rp-foot > *"), { opacity: 0, y: 12, duration: 0.45, stagger: 0.07, ease: "power2.out" }, D0 + 0.9);
  tl.fromTo(vp, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, D0 + 0.55);
  cue("whoosh", D0 - 0.1, 0.8, 0.5);
  cue("soft", D0 + 0.4, undefined, 0.5);
  bodyWords.forEach((_, i) => i % 3 === 0 && cue("click", VO.voice.start + i * 0.041, undefined, 0.35));

  // the voice: bars breathe while the reply writes itself
  const typing = (t: number) => smooth(clamp((t - (VO.voice.start - 0.1)) / 0.3)) * (1 - smooth(clamp((t - (VO.voice.start + 1.55)) / 0.4)));
  onFrame((t) => {
    if (t < D0 || t > S.phrase + 1) return;
    const k = 0.25 + 0.75 * typing(t);
    bars.forEach((b, i) => {
      const x = i / bars.length;
      const env = Math.sin(Math.PI * x) ** 0.7;
      const v = 0.5 + 0.5 * Math.sin(t * 9.1 + i * 0.73) * Math.sin(t * 5.3 + i * 0.29 + 1.1);
      b.style.transform = `scaleY(${(0.08 + env * k * (0.25 + 0.75 * v)).toFixed(3)})`;
    });
    toneBars.forEach((b, i) => {
      const v = 0.5 + 0.5 * Math.sin(t * 11 + i * 1.3);
      b.style.transform = `scaleY(${(0.25 + 0.75 * v * k).toFixed(3)})`;
    });
  });

  // send, highlight, lift-off
  const P = S.phrase;
  tl.to(send, { scale: 0.93, duration: 0.09, ease: "power2.in" }, P - 0.2);
  tl.to(send, { scale: 1, duration: 0.4, ease: "back.out(3)" }, P - 0.11);
  tl.to(sendLabel, { scrambleText: { text: "Sent ✓", chars: "·•", speed: 1 }, duration: 0.3, ease: "none" }, P - 0.12);
  tl.to(hlbg, { scaleX: 1, duration: 0.24, ease: "power3.out" }, P - 0.06);
  cue("click", P - 0.2, undefined, 1.0);
  cue("chime", P, undefined, 0.6);

  // the phrase becomes an object: a clone takes its place and flies
  const hb = box(hl);
  const start = { x: hb.x - 8, y: hb.y + 4, w: hb.w + 16, h: hb.h - 6 };
  const fly = html(`<div class="phrase-fly">
    <span class="pf-a" style="line-height:${start.h}px;padding:0 8px">Thursday at 14:30.</span>
    <span class="pf-b"><b>Pricing call · Luka</b><em class="mono">14:30 – 15:30 · invite sent</em></span>
  </div>`);
  front.appendChild(fly); // above the week it lands in
  const fa = fly.querySelector<HTMLElement>(".pf-a")!;
  const fb = fly.querySelector<HTMLElement>(".pf-b")!;
  const F = { p: 0, grow: 0 };
  const L0 = P + 0.1;
  const LAND = S.land + 0.1;
  gsap.set(fly, { autoAlpha: 0, width: start.w, height: start.h, x: start.x, y: start.y });
  gsap.set(fb, { opacity: 0 });
  tl.set(fly, { autoAlpha: 1 }, L0);
  tl.set(hl, { opacity: 0 }, L0);
  tl.to(F, { p: 1, duration: LAND - L0, ease: "power2.inOut" }, L0);
  tl.to(F, { grow: 1, duration: 0.42, ease: "power3.inOut" }, LAND);
  tl.to(fa, { opacity: 0, duration: 0.18 }, LAND + 0.06);
  tl.to(fb, { opacity: 1, duration: 0.25 }, LAND + 0.18);
  cue("whoosh", L0, 0.6, 0.8);
  cue("hit", LAND, undefined, 0.6);
  const C = { x: start.x + 260, y: start.y + 120 };
  const at = (p: number) => ({
    x: (1 - p) * (1 - p) * start.x + 2 * (1 - p) * p * C.x + p * p * PRICING.x,
    y: (1 - p) * (1 - p) * start.y + 2 * (1 - p) * p * C.y + p * p * PRICING.y,
  });
  onFrame((t) => {
    if (t < L0 || t > S.land + 1.2) return;
    const q = at(F.p);
    const bump = 1 + 0.28 * Math.sin(Math.PI * F.p);
    const w = lerp(start.w, PRICING.w, F.grow);
    const h = lerp(start.h, PRICING.h, F.grow);
    fly.style.transform = `translate3d(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px, 0) scale(${bump.toFixed(4)})`;
    fly.style.width = `${w.toFixed(2)}px`;
    fly.style.height = `${h.toFixed(2)}px`;
    fly.style.borderRadius = `${lerp(12, 20, F.grow).toFixed(2)}px`;
    fly.style.transformOrigin = "0 0";
  });
  paint((g, t) => {
    if (t < L0 || t > LAND + 0.3) return;
    const path = new Path2D();
    const n = 16;
    const head = F.p;
    const tail = Math.max(0, head - 0.35);
    for (let i = 0; i <= n; i++) {
      const p = lerp(tail, head, i / n);
      const q = at(p);
      const x = q.x + start.w / 2;
      const y = q.y + start.h / 2;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    const a = 1 - smooth(clamp((t - LAND) / 0.3));
    glowPath(g, path, 6, 0.7 * a, "255,130,140");
    const q = at(head);
    flare(g, q.x + start.w / 2, q.y + start.h / 2, 160, 0.5 * a, "255,140,150");
  });

  // the email and its reply leave upwards: the camera tilts down to the week
  tl.to([hero, reply, vp], { y: "-=1250", rotationX: 32, opacity: 0, filter: "blur(10px)", duration: 0.55, ease: "power3.in", stagger: 0.03 }, P + 0.12);
  tl.set(root, { visibility: "hidden" }, S.land + 0.4);
  tl.set(fly, { autoAlpha: 0 }, S.land + 0.7);

  // light: warm, then rose for the voice
  tl.to(sky, { c1: "255,140,70", l1x: 0.5, l1y: 0.26, l1r: 0.3, l1i: 0.42, l2i: 0.12, duration: 1.0, ease: "power2.inOut" }, S.sort - 0.2);
  tl.to(sky, { c1: "255,110,150", l1y: 0.42, l1r: 0.55, l1i: 0.26, c2: "255,120,70", l2i: 0.16, duration: 1.0, ease: "power2.inOut" }, D0);
  void W;
  void beat;
  void ROW;
}

/** When the roll-down settles on 2 (relative to S.sort). */
function DOWN_END() {
  return 0.95;
}
