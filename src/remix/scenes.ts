import { gsap } from "../core/gsap";
import { onFrame, clamp, smooth, lerp, cue } from "../core/clock";
import { html, world, front, W, H, CX, CY, splitChars } from "./stage";
import { rib } from "./ribbons";
import { markSvg, BAND } from "../mosaic/mark";
import { RING_A, RING_B, RING_W, RING_TILT } from "../core/icons";

/**
 * ASTRYA — "I want a SaaS for my mails." The same film language as the
 * reference: light ribbons and the logo; glowing pills, a click; a prompt
 * typed huge, then the camera pulls back into the prompt box; the answer
 * streams by in 3D (here: Astrya's agents, in neon), and becomes the
 * product card; the camera drops to a second prompt; the card transforms;
 * the sign-off letters swirl in on a curve.
 */
export const S = {
  ring: 0.12,
  word: 0.5,
  logoOut: 1.35,
  pills: 1.5,
  click: 2.38,
  type: 2.78,
  pull: 3.55,
  send: 4.5,
  stream: 4.6,
  card: 5.35,
  pan: 6.85,
  type2: 7.2,
  send2: 8.32,
  neon: 8.45,
  out: 9.95,
  sign: 10.2,
  end: 12.0,
};

export const ICON = {
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="m4 7 8 6 8-6"/></svg>`,
  reply: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7 5 12l5 5"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/></svg>`,
  agents: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/></svg>`,
  brief: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v2M12 19v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M3 12h2M19 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>`,
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`,
  hand: `<svg viewBox="0 0 32 32"><path d="M11 3.5c1.2 0 2.2 1 2.2 2.2v8.1l1.1-.2c1.1-.2 2.1.4 2.4 1.4l.1.4.9-.2c1.1-.2 2.2.4 2.5 1.5l.1.3.6-.1c1.2-.2 2.4.6 2.6 1.8l.9 5.6c.3 2-.3 4-1.7 5.4l-.7.7H12.3l-4.9-6.6c-.6-.8-.5-2 .3-2.6.8-.6 1.9-.6 2.6.1l1.4 1.3V5.7c0-1.2 1-2.2 2.2-2.2Z" fill="#fff" stroke="#0b0d14" stroke-width="1.4" stroke-linejoin="round" transform="translate(-2 0)"/></svg>`,
};

const AGENTS = [
  { c: "#22e5ff", n: "Inbox agent", m: "312 → 2" },
  { c: "#9b5cff", n: "Reply agent", m: "3 drafted" },
  { c: "#ff3df0", n: "Calendar agent", m: "week solved" },
  { c: "#b6ff3a", n: "Finance agent", m: "INV-4821 ✓" },
];

const STREAM = [
  `<span class="a1">▸ inbox.agent</span>   <span class="k">triage</span>(<span class="s">312 unread</span>)`,
  `    <span class="k">priority</span> → <span class="s">Luka · contract renewal</span>   <span class="a1">needs you</span>`,
  `    <span class="k">priority</span> → <span class="s">Invoice 4821</span>              <span class="a1">needs you</span>`,
  `    <span class="k">archive</span>(<span class="s">214</span>)  <span class="k">summarize</span>(<span class="s">93</span>)`,
  `<span class="a2">▸ reply.agent</span>   <span class="k">draft</span>(<span class="s">"Hi Luka — the renewal looks right…"</span>)`,
  `    <span class="k">tone</span> = <span class="s">your_voice</span>   <span class="k">match</span> = <span class="a2">96%</span>`,
  `<span class="a3">▸ calendar.agent</span>  <span class="k">resolve</span>(<span class="s">Thu · 3 conflicts</span>)`,
  `    <span class="k">book</span>(<span class="s">"Pricing · Luka", Thu 14:00</span>)   <span class="a3">✓</span>`,
  `<span class="a4">▸ finance.agent</span>   <span class="k">reconcile</span>(<span class="s">INV-4821</span>, <span class="s">CHF 4,820</span>)`,
  `    <span class="k">status</span> = <span class="a4">paid · Luka notified</span>`,
  `<span class="a1">▸ astrya</span>   <span class="k">brief</span>(<span class="s">"2 things need you today"</span>)`,
  `    <span class="k">handled</span> = <span class="s">everything else</span>`,
];

export const cam = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };

/** Typing: characters appear one by one; the word being typed glows. */
export function typer(el: HTMLElement, t0: number, rate: number, opts: { caret?: boolean; hot?: boolean } = {}) {
  const chars = splitChars(el);
  const caret = document.createElement("span");
  caret.className = "caret";
  if (opts.caret !== false) el.appendChild(caret);
  const words: number[] = [];
  let w = 0;
  chars.forEach((c) => {
    if (c.classList.contains("sp")) w++;
    words.push(c.classList.contains("sp") ? -1 : w);
  });
  const nWords = w;
  onFrame((t) => {
    const n = Math.floor(clamp((t - t0) / rate, 0, chars.length));
    const typingWord = n < chars.length ? words[Math.max(0, n - 1)] : -2;
    chars.forEach((c, i) => {
      c.style.visibility = i < n ? "visible" : "hidden";
      if (opts.hot !== false) c.classList.toggle("hot", words[i] === typingWord && words[i] >= 0 && words[i] <= nWords);
    });
    caret.style.opacity = t < t0 - 0.4 ? "0" : Math.floor(t * 3) % 2 === 0 || n < chars.length ? "1" : "0";
    // keep the caret after the last visible character
    if (n > 0 && n <= chars.length) chars[n - 1].after(caret);
  });
  return { end: t0 + chars.length * rate, chars };
}

export function buildFilm(tl: gsap.core.Timeline) {
  const rig = html(`<div class="abs" style="width:${W}px;height:${H}px;transform-style:preserve-3d;transform-origin:${CX}px ${CY}px"></div>`);
  world.appendChild(rig);
  onFrame(() => {
    rig.style.transform = `translate3d(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px, ${cam.z.toFixed(2)}px) rotateX(${cam.rx.toFixed(3)}deg) rotateY(${cam.ry.toFixed(3)}deg) rotateZ(${cam.rz.toFixed(3)}deg) scale(${cam.s.toFixed(4)})`;
  });

  // ── 1 · LOGO on light ribbons ───────────────────────────────────────────
  const MID_A = RING_A - RING_W / 2;
  const MID_B = (MID_A * RING_B) / RING_A;
  const ell = `M${-MID_A} 0a${MID_A} ${MID_B} 0 1 0 ${2 * MID_A} 0a${MID_A} ${MID_B} 0 1 0 ${-2 * MID_A} 0`;
  const logo = html(`<div class="scene" style="visibility:visible">
    <div class="abs lg-ring" style="left:${CX - 470}px;top:${CY - 150}px;width:300px;height:300px">
      <svg viewBox="-200 -200 400 400" width="300" height="300" fill="none" style="overflow:visible;filter:drop-shadow(0 0 18px rgba(130,180,255,0.9)) drop-shadow(0 0 50px rgba(47,107,255,0.7))">
        <defs><linearGradient id="lgG" x1="-150" y1="-40" x2="150" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#9fd0ff"/><stop offset="1" stop-color="#4d8dff"/></linearGradient></defs>
        <g transform="rotate(${RING_TILT})"><path class="lg-band" d="${BAND}" fill="url(#lgG)" fill-rule="evenodd" opacity="0"/><path class="lg-draw" d="${ell}" stroke="url(#lgG)" stroke-width="${RING_W}" stroke-linecap="round"/></g>
      </svg>
    </div>
    <div class="abs wordmark lg-word" style="left:${CX - 120}px;top:${CY - 62}px">ASTRYA</div>
  </div>`);
  rig.appendChild(logo);
  const ringBox = logo.querySelector<HTMLElement>(".lg-ring")!;
  const word = logo.querySelector<HTMLElement>(".lg-word")!;
  gsap.set(ringBox, { scale: 0.4, rotation: -140, opacity: 0, transformOrigin: "50% 50%" });
  tl.to(ringBox, { scale: 1, rotation: 0, opacity: 1, duration: 0.75, ease: "back.out(1.4)" }, S.ring);
  tl.fromTo(logo.querySelector(".lg-draw"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.6, ease: "power2.inOut" }, S.ring);
  tl.to(logo.querySelector(".lg-band"), { opacity: 1, duration: 0.25 }, S.ring + 0.55);
  tl.to(logo.querySelector(".lg-draw"), { opacity: 0, duration: 0.25 }, S.ring + 0.6);
  tl.fromTo(word, { clipPath: "inset(0% 100% 0% 0%)", x: -60, filter: "blur(12px)" }, { clipPath: "inset(0% 0% 0% 0%)", x: 0, filter: "blur(0px)", duration: 0.6, ease: "power3.out" }, S.word);
  tl.to(logo, { scale: 1.4, opacity: 0, filter: "blur(16px)", duration: 0.32, ease: "power2.in" }, S.logoOut);
  tl.set(logo, { visibility: "hidden" }, S.logoOut + 0.35);
  cue("whoosh", S.ring - 0.05, 0.7, 0.7);
  cue("chime", S.ring + 0.6, undefined, 0.9);
  cue("hit", S.word, undefined, 0.5);

  // ── 2 · PILLS, a click ──────────────────────────────────────────────────
  const pills = html(`<div class="scene"><div class="pills">
      <span class="pill p-mail">${ICON.mail}Mail</span><span class="pill">${ICON.reply}Reply</span><span class="pill">${ICON.cal}Calendar</span><span class="pill">${ICON.agents}Agents</span><span class="pill">${ICON.brief}Brief</span>
    </div><div class="cursor">${ICON.hand}</div></div>`);
  rig.appendChild(pills);
  const pillEls = Array.from(pills.querySelectorAll<HTMLElement>(".pill"));
  const cursor = pills.querySelector<HTMLElement>(".cursor")!;
  tl.set(pills, { visibility: "visible" }, S.pills - 0.05);
  tl.fromTo(pillEls, { opacity: 0, scale: 0.7, y: 30, filter: "blur(14px)" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.45, stagger: 0.05, ease: "back.out(1.6)" }, S.pills);
  pillEls.forEach((_, i) => cue("tick", S.pills + i * 0.05, undefined, 0.6));
  // the cursor comes in from below and taps "Mail"
  const target = pills.querySelector<HTMLElement>(".p-mail")!;
  let tx = 0;
  let ty = 0;
  for (let n: HTMLElement | null = target; n && n !== pills; n = n.offsetParent as HTMLElement | null) {
    tx += n.offsetLeft;
    ty += n.offsetTop;
  }
  tx += target.offsetWidth * 0.55;
  ty += target.offsetHeight * 0.55;
  gsap.set(cursor, { x: tx + 380, y: ty + 380, opacity: 0 });
  tl.to(cursor, { opacity: 1, duration: 0.2 }, S.pills + 0.3);
  tl.to(cursor, { x: tx, y: ty, duration: 0.6, ease: "power3.inOut" }, S.pills + 0.3);
  tl.to(cursor, { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, S.click);
  tl.to(target, { scale: 0.94, duration: 0.08, yoyo: true, repeat: 1 }, S.click);
  onFrame((t) => target.classList.toggle("on", t >= S.click + 0.04));
  cue("click", S.click, undefined, 1.0);
  // the clicked pill rushes at the camera; everything else falls away
  tl.to(pillEls.filter((p) => p !== target), { opacity: 0, y: 60, filter: "blur(10px)", duration: 0.3, stagger: 0.02, ease: "power2.in" }, S.click + 0.12);
  tl.to(cursor, { opacity: 0, duration: 0.15 }, S.click + 0.12);
  tl.to(target, { scale: 6, opacity: 0, filter: "blur(18px)", duration: 0.4, ease: "power3.in" }, S.click + 0.15);
  tl.set(pills, { visibility: "hidden" }, S.type);
  cue("whoosh", S.click + 0.12, 0.5, 0.8);

  // ── 3 · THE PROMPT, typed huge, then the camera pulls back into the box ─
  const BOX = { x: 230, y: 360, w: 1460, h: 320 };
  const prompt = html(`<div class="scene">
    <div class="box" style="left:${BOX.x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px">
      <div class="row">${ICON.plus}<span class="sp"></span><span>Astrya 1 ⌄</span>${ICON.mic}${ICON.wave}<span class="send">${ICON.up}</span></div>
    </div>
    <div class="bigtype">I want a SaaS for my mails.</div>
    <div class="abs plus big" style="left:420px;top:650px;width:80px;height:80px">${ICON.plus}</div>
  </div>`);
  rig.appendChild(prompt);
  const box = prompt.querySelector<HTMLElement>(".box")!;
  const big = prompt.querySelector<HTMLElement>(".bigtype")!;
  const bigPlus = prompt.querySelector<HTMLElement>(".plus.big")!;
  const row = box.querySelector<HTMLElement>(".row")!;
  const send = box.querySelector<HTMLElement>(".send")!;
  const ty1 = typer(big, S.type, 0.052);
  tl.set(prompt, { visibility: "visible" }, S.type - 0.25);
  gsap.set(box, { opacity: 0, scale: 2.2, transformOrigin: "20% 30%" });
  gsap.set(row, { opacity: 0 });
  tl.fromTo(bigPlus, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3 }, S.type - 0.2);
  // pull back: the huge line becomes the line in the prompt box
  const k = 46 / 104;
  tl.to(big, { x: BOX.x + 54 - 420, y: BOX.y + 54 - 440, scale: k, duration: 0.75, ease: "power3.inOut" }, S.pull);
  tl.to(box, { opacity: 1, scale: 1, duration: 0.75, ease: "power3.inOut" }, S.pull);
  tl.to(bigPlus, { opacity: 0, scale: 0.4, x: -140, y: -60, duration: 0.5, ease: "power3.in" }, S.pull);
  tl.to(row, { opacity: 1, duration: 0.4 }, S.pull + 0.45);
  for (let i = 0; i < ty1.chars.length; i++) cue("tick", S.type + i * 0.052, undefined, 0.35);
  cue("whoosh", S.pull, 0.8, 0.5);
  // send
  tl.to(send, { scale: 0.86, duration: 0.07, yoyo: true, repeat: 1 }, S.send);
  tl.to(send, { boxShadow: "0 0 60px rgba(90,200,255,1)", duration: 0.1, yoyo: true, repeat: 1 }, S.send);
  cue("click", S.send, undefined, 1.0);
  // the box flies off, smeared
  tl.to([box, big], { x: "-=520", y: "-=260", rotationX: 25, rotationY: -20, scale: "*=0.8", opacity: 0, filter: "blur(16px)", duration: 0.5, ease: "power3.in" }, S.send + 0.12);
  tl.set(prompt, { visibility: "hidden" }, S.stream + 0.6);
  cue("whoosh", S.send + 0.1, 0.6, 0.9);

  // ── 4 · THE AGENTS STREAM by in 3D, and become the product ─────────────
  const stream = html(`<div class="scene"><div class="stream" style="left:420px;top:${CY - 300}px">${STREAM.join("\n")}</div></div>`);
  rig.appendChild(stream);
  const st = stream.querySelector<HTMLElement>(".stream")!;
  tl.set(stream, { visibility: "visible" }, S.stream - 0.05);
  tl.fromTo(st, { rotationY: -42, rotationX: 18, z: -500, y: 420, x: 300, opacity: 0, filter: "blur(14px)" }, { rotationY: -18, rotationX: 8, z: 0, y: -60, x: 60, opacity: 1, filter: "blur(2px)", duration: 0.75, ease: "power3.out" }, S.stream);
  tl.to(st, { y: -420, x: -260, rotationY: 12, z: 260, opacity: 0, filter: "blur(16px)", duration: 0.6, ease: "power3.in" }, S.card);
  tl.set(stream, { visibility: "hidden" }, S.card + 0.65);
  cue("sweep", S.stream, 0.8, 0.9);
  for (let i = 0; i < 12; i++) cue("tick", S.stream + 0.05 + i * 0.05, undefined, 0.45);

  const CARD = { x: (W - 1180) / 2, y: (H - 660) / 2 };
  const card = html(`<div class="scene"><div class="card" style="left:${CARD.x}px;top:${CARD.y}px">
      <div class="bg"></div><div class="neon"></div>
      <div class="nav"><span class="lg">${markSvg("#ffffff", 46)}</span><span>Inbox</span><span>Calendar</span><span>Agents</span><span>FAQ</span></div>
      <h2 class="h-a">Your inbox,<br/>handled.</h2>
      <h2 class="h-b" style="opacity:0">Agents<br/>at work.</h2>
      <span class="btn">Start free</span>
      <div class="chips">${AGENTS.map((a) => `<div class="chip" style="--c:${a.c}"><i></i>${a.n}<em>${a.m}</em><span class="bar"></span></div>`).join("")}</div>
      <div class="sheen"></div>
    </div>
    <div class="stream frag" style="left:${CARD.x + 1000}px;top:${CARD.y + 600}px;font-size:22px;line-height:30px">${STREAM[6]}\n${STREAM[7]}</div>
    <div class="stream frag" style="left:${CARD.x - 120}px;top:${CARD.y - 70}px;font-size:22px;line-height:30px">${STREAM[0]}</div>
  </div>`);
  rig.appendChild(card);
  const cardEl = card.querySelector<HTMLElement>(".card")!;
  const frags = Array.from(card.querySelectorAll<HTMLElement>(".frag"));
  tl.set(card, { visibility: "visible" }, S.card - 0.05);
  tl.fromTo(cardEl, { x: 620, y: 80, z: -600, rotationY: -46, rotationX: 14, rotationZ: 6, opacity: 0, filter: "blur(18px)" }, { x: 0, y: 0, z: 0, rotationY: -8, rotationX: 4, rotationZ: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out" }, S.card);
  tl.to(cardEl, { rotationY: 0, rotationX: 0, duration: 0.8, ease: "power2.inOut" }, S.card + 0.9);
  tl.fromTo(frags, { opacity: 0, filter: "blur(8px)" }, { opacity: 0.85, filter: "blur(0px)", duration: 0.3, stagger: 0.08 }, S.card + 0.2);
  tl.to(frags, { opacity: 0, y: -40, duration: 0.4 }, S.card + 1.0);
  tl.fromTo(card.querySelector(".sheen"), { xPercent: -120 }, { xPercent: 120, duration: 0.9, ease: "power2.inOut" }, S.card + 0.6);
  tl.to(cam, { s: 1.05, duration: S.pan - S.card, ease: "sine.inOut" }, S.card + 0.5);
  cue("whoosh", S.card - 0.05, 0.8, 0.7);
  cue("hit", S.card + 0.45, undefined, 0.7);
  const chips = Array.from(card.querySelectorAll<HTMLElement>(".chip"));
  gsap.set(chips, { opacity: 0, x: 60 });

  // ── 5 · the camera drops to a second prompt ─────────────────────────────
  const B2 = { x: 330, y: CARD.y + 660 + 140, w: 1260, h: 250 };
  const p2 = html(`<div class="scene" style="visibility:visible">
    <div class="box" style="left:${B2.x}px;top:${B2.y}px;width:${B2.w}px;height:${B2.h}px">
      <div class="txt">Now put my agents to work.</div>
      <div class="row">${ICON.plus}<span class="sp"></span><span>Astrya 1 ⌄</span>${ICON.mic}${ICON.wave}<span class="send">${ICON.up}</span></div>
    </div>
  </div>`);
  rig.appendChild(p2);
  const box2 = p2.querySelector<HTMLElement>(".box")!;
  const send2 = p2.querySelector<HTMLElement>(".send")!;
  const ty2 = typer(p2.querySelector<HTMLElement>(".txt")!, S.type2, 0.04);
  gsap.set(box2, { opacity: 0 });
  tl.to(box2, { opacity: 1, duration: 0.3 }, S.pan + 0.1);
  tl.to(cam, { y: 560, rx: 8, duration: 0.6, ease: "power3.inOut" }, S.pan);
  tl.fromTo(rig, { filter: "blur(0px)" }, { filter: "blur(5px)", duration: 0.2, yoyo: true, repeat: 1, ease: "power2.in", immediateRender: false }, S.pan + 0.1);
  for (let i = 0; i < ty2.chars.length; i++) cue("tick", S.type2 + i * 0.04, undefined, 0.35);
  tl.to(send2, { scale: 0.86, duration: 0.07, yoyo: true, repeat: 1 }, S.send2);
  cue("click", S.send2, undefined, 1.0);
  cue("whoosh", S.pan, 0.6, 0.6);

  // ── 6 · back up: the card turns into the agents, in neon ────────────────
  tl.to(cam, { y: 0, rx: 0, s: 1.0, ry: -4, duration: 0.6, ease: "power3.inOut" }, S.neon);
  tl.fromTo(rig, { filter: "blur(0px)" }, { filter: "blur(6px)", duration: 0.2, yoyo: true, repeat: 1, ease: "power2.in", immediateRender: false }, S.neon + 0.05);
  tl.to(box2, { opacity: 0, duration: 0.3 }, S.neon + 0.3);
  // a neon light sweeps across the card, leaving it transformed
  const sweep = html(`<div class="abs" style="left:-900px;top:${CARD.y - 200}px;width:900px;height:1060px;background:linear-gradient(90deg, rgba(34,229,255,0) 0%, rgba(34,229,255,0.85) 40%, rgba(255,61,240,0.9) 60%, rgba(155,92,255,0) 100%);filter:blur(40px);mix-blend-mode:screen;transform:skewX(-14deg)"></div>`);
  card.appendChild(sweep);
  tl.to(sweep, { x: W + 1000, duration: 0.9, ease: "power2.inOut" }, S.neon + 0.35);
  tl.to(card.querySelector(".neon"), { opacity: 1, duration: 0.45, ease: "power2.inOut" }, S.neon + 0.6);
  tl.to(cardEl, { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 0 2px rgba(255,255,255,0.5), 0 0 80px rgba(155,92,255,0.7), 0 0 160px rgba(34,229,255,0.35), 0 60px 120px -40px rgba(0,0,0,0.9)", duration: 0.5 }, S.neon + 0.6);
  tl.to(card.querySelector(".h-a"), { opacity: 0, y: -30, filter: "blur(10px)", duration: 0.3 }, S.neon + 0.55);
  tl.fromTo(card.querySelector(".h-b"), { opacity: 0, y: 30, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, S.neon + 0.7);
  tl.to(chips, { opacity: 1, x: 0, duration: 0.45, stagger: 0.09, ease: "back.out(1.5)" }, S.neon + 0.75);
  tl.fromTo(card.querySelectorAll(".chip .bar"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, stagger: 0.09, ease: "power2.inOut" }, S.neon + 0.9);
  tl.to(cam, { ry: 3, s: 1.04, duration: S.out - S.neon - 0.6, ease: "sine.inOut" }, S.neon + 0.6);
  tl.to(rib, { hue: 1, duration: 0.6 }, S.neon + 0.5);
  cue("sweep", S.neon + 0.35, 0.9, 1.0);
  cue("hit", S.neon + 0.6, undefined, 1.0);
  chips.forEach((_, i) => cue("chime", S.neon + 0.75 + i * 0.09, undefined, 0.6));

  // ── 7 · OUT: the card leaves upwards, the sign-off swirls in ────────────
  tl.to(cardEl, { y: -900, rotationX: 30, opacity: 0, filter: "blur(20px)", duration: 0.5, ease: "power3.in" }, S.out);
  tl.set(card, { visibility: "hidden" }, S.out + 0.55);
  tl.to(rib, { a: 0, duration: 0.4 }, S.out);
  cue("whoosh", S.out, 0.6, 0.9);
  const sign = html(`<div class="scene">
    <div class="abs sg-mark" style="left:${CX - 150}px;top:250px;width:300px;height:300px;filter:drop-shadow(0 0 20px rgba(120,170,255,0.9)) drop-shadow(0 0 60px rgba(47,107,255,0.7))">${markSvg("#cfe3ff", 300)}</div>
    <div class="handled">Handled by Astrya.</div>
  </div>`);
  front.appendChild(sign);
  const mk = sign.querySelector<HTMLElement>(".sg-mark")!;
  const letters = splitChars(sign.querySelector<HTMLElement>(".handled")!);
  tl.set(sign, { visibility: "visible" }, S.sign - 0.1);
  tl.fromTo(mk, { scale: 0.2, rotation: -200, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: "back.out(1.5)" }, S.sign - 0.1);
  // letters come in one after another along a curve, like a ribbon unrolling
  const sw = letters.map(() => ({ p: 0 }));
  letters.forEach((_, i) => tl.to(sw[i], { p: 1, duration: 0.55, ease: "power3.out" }, S.sign + 0.15 + i * 0.035));
  onFrame((t) => {
    if (t < S.sign - 0.1) return;
    letters.forEach((l, i) => {
      const p = sw[i].p;
      const q = 1 - p;
      // the curve: from below-right, curling up into place
      const ang = q * 2.2;
      const r = q * 260;
      const x = Math.sin(ang) * r;
      const y = (1 - Math.cos(ang)) * r * 0.9 + q * 120;
      l.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(q * 70).toFixed(1)}deg) scale(${(0.5 + 0.5 * p).toFixed(3)})`;
      l.style.opacity = smooth(clamp(p * 2.5)).toFixed(3);
      l.style.filter = q > 0.05 ? `blur(${(q * 8).toFixed(1)}px)` : "";
    });
  });
  cue("chime", S.sign, undefined, 1.0);
  cue("hit", S.sign - 0.05, undefined, 0.7);
  for (let i = 0; i < letters.length; i += 2) cue("tick", S.sign + 0.25 + i * 0.035, undefined, 0.3);

  // ribbons: bright for the logo and pills, then a dim glow behind the work
  gsap.set(rib, { a: 1, zoom: 1, x: 0, y: 0 });
  tl.to(rib, { flow: 1.2, duration: S.type, ease: "none" }, 0);
  tl.to(rib, { a: 0.0, duration: 0.25 }, S.type - 0.3);
  tl.to(rib, { a: 0.55, zoom: 0.7, x: 1.4, y: -0.7, duration: 0.9, ease: "power2.out" }, S.pull);
  tl.to(rib, { flow: 4, duration: S.out - S.pull, ease: "none" }, S.pull);
  tl.to(rib, { x: 0.6, y: -0.2, a: 0.7, duration: 1.0, ease: "power2.inOut" }, S.card);
  void lerp;
}
