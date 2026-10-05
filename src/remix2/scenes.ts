import { gsap } from "../core/gsap";
import { onFrame, clamp, smooth, rng, cue } from "../core/clock";
import { html, world, front, W, H, CX, CY, splitChars, $ } from "../remix/stage";
import { rib } from "../remix/ribbons";
import { markSvg, BAND } from "../mosaic/mark";
import { RING_A, RING_B, RING_W, RING_TILT } from "../core/icons";
import { ICON, typer } from "../remix/scenes";

/**
 * ASTRYA — "How do I get to inbox zero?" (22 s, 16:9). The reference's
 * language — light ribbons, logo, glowing pills, a prompt typed huge, the
 * pull back into the box — then a longer, louder answer: the prompt box
 * shatters into a flood of 2,184 unread mails; neon agent lasers slice
 * through them while the count falls to zero; the product card lands, flips
 * to show a reply written in your voice; a second prompt clears the week
 * (blocks slide out of conflict); four neon agents burst out of it; every-
 * thing implodes into the mark. Flashes, punches and chromatic splits on
 * every cut.
 */
export const S = {
  ring: 0.15,
  word: 0.55,
  logoOut: 1.55,
  pills: 1.7,
  click: 2.75,
  type: 3.15,
  pull: 3.95,
  send: 4.85,
  mails: 4.95,
  laser: 6.35,
  card: 7.55,
  flip: 9.55,
  write: 10.25,
  pan: 11.85,
  type2: 12.15,
  send2: 13.05,
  week: 13.15,
  solve: 13.95,
  agents: 15.3,
  out: 17.7,
  sign: 18.05,
  sub: 19.25,
  cta: 19.8,
  end: 21.5,
};
const HITS = [S.logoOut, S.click + 0.1, S.send, S.laser, S.card + 0.05, S.flip + 0.35, S.week + 0.05, S.agents, S.out + 0.25];
const NEON = { cyan: "#22e5ff", violet: "#9b5cff", magenta: "#ff3df0", lime: "#b6ff3a" };

export const cam = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildFilm(tl: gsap.core.Timeline) {
  const R = rng(4821);
  const rig = html(`<div class="abs" style="width:${W}px;height:${H}px;transform-style:preserve-3d;transform-origin:${CX}px ${CY}px"></div>`);
  world.appendChild(rig);
  // camera + punch + chromatic split on every hit
  const hitAmt = (t: number) => HITS.reduce((a, h) => a + (t >= h ? Math.exp(-(t - h) * 7) : 0), 0);
  onFrame((t) => {
    const k = Math.min(1, hitAmt(t));
    const s = cam.s * (1 + 0.035 * k);
    rig.style.transform = `translate3d(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px, ${cam.z.toFixed(2)}px) rotateX(${cam.rx.toFixed(3)}deg) rotateY(${cam.ry.toFixed(3)}deg) rotateZ(${cam.rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    const d = 9 * k;
    world.style.filter = d > 0.3 ? `drop-shadow(${(-d).toFixed(1)}px 0 0 rgba(255,40,200,${(0.55 * k).toFixed(3)})) drop-shadow(${d.toFixed(1)}px 0 0 rgba(30,220,255,${(0.55 * k).toFixed(3)}))` : "";
  });
  const flash = $("#flash");
  const flashAt = (t: number, a = 0.9, d = 0.5) => {
    tl.fromTo(flash, { opacity: 0 }, { opacity: a, duration: 0.06, immediateRender: false }, t);
    tl.to(flash, { opacity: 0, duration: d, ease: "power2.out" }, t + 0.06);
  };

  // ── 1 · LOGO on light ribbons ───────────────────────────────────────────
  const MID_A = RING_A - RING_W / 2;
  const MID_B = (MID_A * RING_B) / RING_A;
  const ell = `M${-MID_A} 0a${MID_A} ${MID_B} 0 1 0 ${2 * MID_A} 0a${MID_A} ${MID_B} 0 1 0 ${-2 * MID_A} 0`;
  const logo = html(`<div class="scene" style="visibility:visible">
    <div class="abs lg-ring" style="left:${CX - 500}px;top:${CY - 170}px;width:340px;height:340px">
      <svg viewBox="-200 -200 400 400" width="340" height="340" fill="none" style="overflow:visible;filter:drop-shadow(0 0 18px rgba(130,180,255,0.9)) drop-shadow(0 0 60px rgba(47,107,255,0.8))">
        <defs><linearGradient id="lgG" x1="-150" y1="-40" x2="150" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#8ff0ff"/><stop offset="1" stop-color="#4d8dff"/></linearGradient></defs>
        <g transform="rotate(${RING_TILT})"><path class="lg-band" d="${BAND}" fill="url(#lgG)" fill-rule="evenodd" opacity="0"/><path class="lg-draw" d="${ell}" stroke="url(#lgG)" stroke-width="${RING_W}" stroke-linecap="round"/></g>
      </svg>
    </div>
    <div class="abs wordmark lg-word" style="left:${CX - 130}px;top:${CY - 66}px;font-size:132px">ASTRYA</div>
  </div>`);
  rig.appendChild(logo);
  const ringBox = logo.querySelector<HTMLElement>(".lg-ring")!;
  gsap.set(ringBox, { scale: 0.3, rotation: -200, opacity: 0, transformOrigin: "50% 50%" });
  tl.to(ringBox, { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: "back.out(1.5)" }, S.ring);
  tl.fromTo(logo.querySelector(".lg-draw"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.6, ease: "power2.inOut" }, S.ring);
  tl.to(logo.querySelector(".lg-band"), { opacity: 1, duration: 0.25 }, S.ring + 0.55);
  tl.to(logo.querySelector(".lg-draw"), { opacity: 0, duration: 0.25 }, S.ring + 0.6);
  tl.fromTo(logo.querySelector(".lg-word"), { clipPath: "inset(0% 100% 0% 0%)", x: -80, filter: "blur(14px)", letterSpacing: "0.5em" }, { clipPath: "inset(0% 0% 0% 0%)", x: 0, filter: "blur(0px)", letterSpacing: "0.16em", duration: 0.7, ease: "power3.out" }, S.word);
  tl.to(logo, { scale: 1.6, opacity: 0, filter: "blur(20px)", duration: 0.3, ease: "power2.in" }, S.logoOut - 0.1);
  tl.set(logo, { visibility: "hidden" }, S.logoOut + 0.3);
  flashAt(S.logoOut, 0.7, 0.4);
  cue("riser", 0, 0.6, 0.8);
  cue("hit", S.word, undefined, 0.8);
  cue("chime", S.ring + 0.6, undefined, 0.9);
  cue("whoosh", S.logoOut - 0.15, 0.5, 0.9);

  // ── 2 · PILLS, a click ──────────────────────────────────────────────────
  const pills = html(`<div class="scene"><div class="pills">
      <span class="pill p-mail">${ICON.mail}Mail</span><span class="pill">${ICON.reply}Reply</span><span class="pill">${ICON.cal}Calendar</span><span class="pill">${ICON.agents}Agents</span><span class="pill">${ICON.brief}Brief</span>
    </div><div class="cursor">${ICON.hand}</div></div>`);
  rig.appendChild(pills);
  const pillEls = Array.from(pills.querySelectorAll<HTMLElement>(".pill"));
  const cursor = pills.querySelector<HTMLElement>(".cursor")!;
  const target = pillEls[0];
  tl.set(pills, { visibility: "visible" }, S.pills - 0.05);
  tl.fromTo(pillEls, { opacity: 0, scale: 0.6, y: 60, rotationX: -60, filter: "blur(16px)" }, { opacity: 1, scale: 1, y: 0, rotationX: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.06, ease: "back.out(1.7)" }, S.pills);
  pillEls.forEach((_, i) => cue("tick", S.pills + i * 0.06, undefined, 0.7));
  let tx = 0;
  let ty = 0;
  for (let n: HTMLElement | null = target; n && n !== pills; n = n.offsetParent as HTMLElement | null) {
    tx += n.offsetLeft;
    ty += n.offsetTop;
  }
  tx += target.offsetWidth * 0.55;
  ty += target.offsetHeight * 0.55;
  gsap.set(cursor, { x: tx + 520, y: ty + 420, opacity: 0 });
  tl.to(cursor, { opacity: 1, duration: 0.2 }, S.pills + 0.35);
  tl.to(cursor, { x: tx, y: ty, duration: 0.6, ease: "power3.inOut" }, S.pills + 0.35);
  // hover: the pills under the cursor's path light up in turn
  pillEls.slice(1).reverse().forEach((p, i) => tl.to(p, { scale: 1.06, duration: 0.1, yoyo: true, repeat: 1 }, S.pills + 0.5 + i * 0.09));
  tl.to(cursor, { scale: 0.8, duration: 0.08, yoyo: true, repeat: 1 }, S.click);
  tl.to(target, { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1 }, S.click);
  onFrame((t) => target.classList.toggle("on", t >= S.click + 0.04));
  cue("click", S.click, undefined, 1.0);
  tl.to(pillEls.slice(1), { opacity: 0, y: 80, rotationX: 50, filter: "blur(12px)", duration: 0.3, stagger: 0.03, ease: "power2.in" }, S.click + 0.12);
  tl.to(cursor, { opacity: 0, duration: 0.15 }, S.click + 0.12);
  tl.to(target, { scale: 9, opacity: 0, filter: "blur(22px)", duration: 0.4, ease: "power3.in" }, S.click + 0.15);
  tl.set(pills, { visibility: "hidden" }, S.type);
  flashAt(S.click + 0.42, 0.6, 0.35);
  cue("whoosh", S.click + 0.12, 0.5, 0.9);

  // ── 3 · THE PROMPT ─────────────────────────────────────────────────────
  const BOX = { x: 230, y: 360, w: 1460, h: 320 };
  const prompt = html(`<div class="scene">
    <div class="box" style="left:${BOX.x}px;top:${BOX.y}px;width:${BOX.w}px;height:${BOX.h}px">
      <div class="row">${ICON.plus}<span class="sp"></span><span>Astrya 1 ⌄</span>${ICON.mic}${ICON.wave}<span class="send">${ICON.up}</span></div>
    </div>
    <div class="bigtype" style="left:300px;font-size:116px">How do I get to inbox zero?</div>
    <div class="abs plus big" style="left:300px;top:660px;width:80px;height:80px">${ICON.plus}</div>
  </div>`);
  rig.appendChild(prompt);
  const box = prompt.querySelector<HTMLElement>(".box")!;
  const big = prompt.querySelector<HTMLElement>(".bigtype")!;
  const bigPlus = prompt.querySelector<HTMLElement>(".plus.big")!;
  const row = box.querySelector<HTMLElement>(".row")!;
  const send = box.querySelector<HTMLElement>(".send")!;
  const ty1 = typer(big, S.type, 0.05);
  tl.set(prompt, { visibility: "visible" }, S.type - 0.25);
  gsap.set(box, { opacity: 0, scale: 2.4, transformOrigin: "20% 30%" });
  gsap.set(row, { opacity: 0 });
  tl.fromTo(big, { scale: 1.15, filter: "blur(10px)" }, { scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out", transformOrigin: "0 0" }, S.type - 0.2);
  tl.fromTo(bigPlus, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3 }, S.type - 0.2);
  const k = 46 / 116;
  tl.to(big, { x: BOX.x + 54 - 300, y: BOX.y + 54 - 440, scale: k, duration: 0.75, ease: "power3.inOut" }, S.pull);
  tl.to(box, { opacity: 1, scale: 1, duration: 0.75, ease: "power3.inOut" }, S.pull);
  tl.to(bigPlus, { opacity: 0, scale: 0.4, x: -140, y: -60, duration: 0.5, ease: "power3.in" }, S.pull);
  tl.to(row, { opacity: 1, duration: 0.4 }, S.pull + 0.45);
  for (let i = 0; i < ty1.chars.length; i++) cue("tick", S.type + i * 0.05, undefined, 0.35);
  cue("whoosh", S.pull, 0.8, 0.6);
  tl.to(send, { scale: 0.84, duration: 0.07, yoyo: true, repeat: 1 }, S.send);
  tl.to(send, { boxShadow: "0 0 70px rgba(90,220,255,1)", duration: 0.1, yoyo: true, repeat: 1 }, S.send);
  cue("click", S.send, undefined, 1.0);
  // the box shatters: it becomes the flood of mail
  tl.to([box, big], { scale: "*=1.15", opacity: 0, filter: "blur(18px)", duration: 0.25, ease: "power2.in" }, S.send + 0.08);
  tl.set(prompt, { visibility: "hidden" }, S.mails + 0.3);

  // ── 4 · 2,184 UNREAD: a flood of mail, sliced by neon agents ────────────
  const SENDERS = [
    ["L", "Luka · Alpine", "Contract renewal — confirm by Friday"],
    ["Z", "Ziyad · Ops", "Shipment AT-8891 delayed"],
    ["HL", "Helios Legal", "September legal brief"],
    ["SP", "Silo Pay", "Payment received — INV-4820"],
    ["NR", "Northline", "Product newsletter — October"],
    ["AF", "Atlas Freight", "Tracking update"],
    ["Q4", "#launch-q4", "Who owns the Milan rollout?"],
    ["L", "Luka · Alpine", "Invoice 4821 — payment status"],
    ["D", "Drive", "Q4 allocation.xlsx shared"],
    ["C", "Calendar", "Kickoff conflicts with 2 events"],
  ];
  const COLS = 4;
  const ROWS = 11;
  const wallW = COLS * 560;
  const flood = html(`<div class="scene"><div class="abs fl-wall" style="width:${wallW}px;height:${ROWS * 112}px;transform-style:preserve-3d"></div>
    <div class="unread"><span class="un-n">0</span><small>UNREAD</small></div></div>`);
  rig.appendChild(flood);
  const wall = flood.querySelector<HTMLElement>(".fl-wall")!;
  const mails: Array<{ el: HTMLElement; c: number; r: number }> = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const s = SENDERS[(r * 3 + c * 7) % SENDERS.length];
      const el = html(`<div class="mail" style="left:${c * 560}px;top:${r * 112}px"><span class="av">${s[0]}</span><b>${s[1]}</b><span>${s[2]}</span><i class="dot"></i></div>`);
      wall.appendChild(el);
      mails.push({ el, c, r });
    }
  gsap.set(wall, { x: CX - wallW / 2, y: -40, rotationX: 38, rotationY: -16, rotationZ: 8, z: -300, transformOrigin: "50% 50%" });
  tl.set(flood, { visibility: "visible" }, S.mails - 0.05);
  // each mail flies out of the shattered box to its place
  mails.forEach((m, i) => {
    const t0 = S.mails + (i % 13) * 0.025 + R() * 0.1;
    tl.fromTo(m.el, { x: CX - wallW / 2 - m.c * 560 + 300 - 260 + (R() - 0.5) * 200, y: 520 - m.r * 112, z: 900, rotationX: (R() - 0.5) * 120, rotationY: (R() - 0.5) * 140, opacity: 0, scale: 0.4 }, { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out", immediateRender: true }, t0);
  });
  tl.to(wall, { y: -260, rotationZ: 4, duration: S.card - S.mails, ease: "none" }, S.mails);
  // the unread count climbs… then the agents bring it down
  const un = flood.querySelector<HTMLElement>(".un-n")!;
  const unBox = flood.querySelector<HTMLElement>(".unread")!;
  onFrame((t) => {
    if (t < S.mails || t > S.card + 0.5) return;
    const up = smooth(clamp((t - S.mails - 0.1) / 0.9));
    const down = clamp((t - S.laser - 0.05) / 1.05);
    const v = 2184 * up * (1 - down * down * (3 - 2 * down));
    un.textContent = fmt(v);
  });
  tl.fromTo(unBox, { opacity: 0, scale: 1.4, filter: "blur(20px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }, S.mails + 0.1);
  tl.to(unBox, { scale: 0.6, y: -80, opacity: 0, filter: "blur(12px)", duration: 0.3, ease: "power2.in" }, S.card - 0.2);
  cue("sweep", S.mails, 0.8, 0.7);
  for (let i = 0; i < 18; i++) cue("tick", S.mails + i * 0.05, undefined, 0.5);
  // neon lasers sweep across, one per agent colour
  const lasers = Object.values(NEON).map((c, i) =>
    html(`<div class="laser" style="color:${c};background:${c};left:-200px;top:${260 + i * 170}px;width:2400px"></div>`),
  );
  lasers.forEach((l) => flood.appendChild(l));
  lasers.forEach((l, i) => {
    const t0 = S.laser + i * 0.12;
    tl.fromTo(l, { scaleX: 0, rotation: -12 + i * 7, opacity: 1 }, { scaleX: 1, duration: 0.32, ease: "power3.out" }, t0);
    tl.to(l, { opacity: 0, scaleY: 0.2, duration: 0.35, ease: "power2.in" }, t0 + 0.35);
    cue("sweep", t0, 0.4, 0.6);
  });
  // mails burn away in the agents' colours, left to right
  const cols = Object.values(NEON);
  mails.forEach((m, i) => {
    const t0 = S.laser + 0.08 + m.c * 0.13 + m.r * 0.03 + R() * 0.06;
    const c = cols[(m.r + m.c) % 4];
    tl.to(m.el, { boxShadow: `inset 0 0 0 2px ${c}, 0 0 40px ${c}`, duration: 0.08 }, t0);
    tl.to(m.el, { z: 500 + R() * 400, y: -150 - R() * 200, rotationX: 60 * (R() - 0.5), rotationZ: 50 * (R() - 0.5), opacity: 0, filter: "blur(10px)", scale: 0.7, duration: 0.45, ease: "power3.in" }, t0 + 0.08);
    if (i % 4 === 0) cue("tick", t0, undefined, 0.6);
  });
  tl.set(flood, { visibility: "hidden" }, S.card + 0.5);
  flashAt(S.laser, 0.35, 0.4);

  // ── 5 · THE CARD: inbox zero, then it flips to the reply ───────────────
  const CARD = { x: (W - 1180) / 2, y: (H - 660) / 2 };
  const cardScene = html(`<div class="scene"><div class="flipper" style="left:${CARD.x}px;top:${CARD.y}px">
      <div class="face fr">
        <div class="bg" style="position:absolute;inset:0;background:linear-gradient(135deg,#050a2a 0%,#0b1fa8 45%,#2f6bff 85%,#5ab8ff 100%)"></div>
        <div class="nav" style="position:absolute;left:56px;top:44px;display:flex;align-items:center;gap:44px;font-weight:600;font-size:26px"><span style="width:66px;height:66px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.35)">${markSvg("#ffffff", 46)}</span><span>Inbox</span><span>Calendar</span><span>Agents</span><span>FAQ</span></div>
        <h2 style="position:absolute;left:60px;top:220px;margin:0;font-weight:600;font-size:80px;line-height:1.02;letter-spacing:-0.035em">Inbox zero.<br/><span style="color:#9fe7ff">Every morning.</span></h2>
        <div class="zero"><span class="z-n">2,184</span><small>UNREAD</small></div>
        <div class="stats"><span>1,912 archived</span><span>214 summarized</span><span>58 replies drafted</span></div>
        <span style="position:absolute;left:60px;bottom:52px;height:64px;padding:0 30px;border-radius:14px;display:inline-flex;align-items:center;font-weight:700;font-size:26px;color:#071334;background:#fff">Start free</span>
        <div class="sheen" style="position:absolute;inset:0;background:linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,255,255,0.3) 50%,rgba(255,255,255,0) 70%)"></div>
      </div>
      <div class="face back">
        <div class="reply-to"><span class="av">L</span><div>Re: Contract renewal<br/><span>to Luka · Alpine Supplies</span></div></div>
        <div class="reply-body">Hi Luka — Thursday works for me. I'll send the signed renewal tonight. Talk soon, Ziyad</div>
        <div class="voice">WRITTEN IN YOUR VOICE<div class="bars">${"<i></i>".repeat(42)}</div></div>
      </div>
    </div></div>`);
  rig.appendChild(cardScene);
  const flipper = cardScene.querySelector<HTMLElement>(".flipper")!;
  const zn = cardScene.querySelector<HTMLElement>(".z-n")!;
  tl.set(cardScene, { visibility: "visible" }, S.card - 0.05);
  tl.fromTo(flipper, { x: 0, y: 260, z: -900, rotationX: 55, rotationZ: -10, opacity: 0, filter: "blur(20px)" }, { y: 0, z: 0, rotationX: 0, rotationZ: 0, opacity: 1, filter: "blur(0px)", duration: 0.85, ease: "power4.out" }, S.card);
  tl.set(flipper, { filter: "none" }, S.card + 0.9); // a filter would flatten the 3D flip
  tl.fromTo(cardScene.querySelectorAll(".stats span"), { opacity: 0, y: 30, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.8)" }, S.card + 0.5);
  tl.fromTo(cardScene.querySelector(".fr .sheen"), { xPercent: -120 }, { xPercent: 120, duration: 0.9, ease: "power2.inOut" }, S.card + 0.4);
  onFrame((t) => {
    if (t < S.card || t > S.flip + 0.5) return;
    const p = smooth(clamp((t - S.card - 0.3) / 1.1));
    zn.textContent = fmt(2184 * (1 - p));
    zn.style.color = p >= 1 ? "#b6ff3a" : "#ffffff";
    zn.style.textShadow = p >= 1 ? "0 0 40px rgba(182,255,58,0.8)" : "";
  });
  tl.to(cam, { s: 1.04, ry: -3, duration: S.flip - S.card, ease: "sine.inOut" }, S.card + 0.5);
  cue("whoosh", S.card - 0.1, 0.8, 0.8);
  cue("hit", S.card + 0.05, undefined, 1.0);
  cue("chime", S.card + 1.4, undefined, 1.0);
  for (let i = 0; i < 12; i++) cue("tick", S.card + 0.3 + i * 0.09, undefined, 0.4);
  // the flip
  tl.to(flipper, { rotationY: 180, duration: 0.85, ease: "power3.inOut" }, S.flip);
  tl.to(cam, { z: 120, ry: 0, duration: 0.85, ease: "power3.inOut" }, S.flip);
  tl.to(cam, { z: 0, s: 1.02, duration: S.pan - S.flip - 0.85, ease: "sine.inOut" }, S.flip + 0.85);
  const ty2 = typer(cardScene.querySelector<HTMLElement>(".reply-body")!, S.write, 0.021, { hot: false });
  const vbars = Array.from(cardScene.querySelectorAll<HTMLElement>(".voice .bars i"));
  onFrame((t) => {
    if (t < S.flip || t > S.pan + 1) return;
    const on = t > S.write && t < ty2.end + 0.2 ? 1 : 0.15;
    vbars.forEach((b, i) => {
      const v = 0.5 + 0.5 * Math.sin(t * 13 + i * 0.7) * Math.sin(t * 7 + i * 0.31);
      b.style.transform = `scaleY(${(0.08 + on * 0.92 * v * Math.sin((Math.PI * (i + 0.5)) / vbars.length)).toFixed(3)})`;
    });
  });
  cue("whoosh", S.flip, 0.8, 0.8);
  for (let i = 0; i < ty2.chars.length; i += 3) cue("tick", S.write + i * 0.021, undefined, 0.35);

  // ── 6 · second prompt: clear my week ───────────────────────────────────
  const B2 = { x: 360, y: CARD.y + 660 + 140, w: 1200, h: 240 };
  const p2 = html(`<div class="scene" style="visibility:visible">
    <div class="box" style="left:${B2.x}px;top:${B2.y}px;width:${B2.w}px;height:${B2.h}px">
      <div class="txt">Now clear my week.</div>
      <div class="row">${ICON.plus}<span class="sp"></span><span>Astrya 1 ⌄</span>${ICON.mic}${ICON.wave}<span class="send">${ICON.up}</span></div>
    </div></div>`);
  rig.appendChild(p2);
  const box2 = p2.querySelector<HTMLElement>(".box")!;
  const send2 = p2.querySelector<HTMLElement>(".send")!;
  const ty3 = typer(p2.querySelector<HTMLElement>(".txt")!, S.type2, 0.045);
  gsap.set(box2, { opacity: 0 });
  tl.to(box2, { opacity: 1, duration: 0.3 }, S.pan + 0.1);
  tl.to(cam, { y: 560, rx: 8, duration: 0.6, ease: "power3.inOut" }, S.pan);
  for (let i = 0; i < ty3.chars.length; i++) cue("tick", S.type2 + i * 0.045, undefined, 0.35);
  tl.to(send2, { scale: 0.84, duration: 0.07, yoyo: true, repeat: 1 }, S.send2);
  cue("click", S.send2, undefined, 1.0);
  cue("whoosh", S.pan, 0.6, 0.7);

  // ── 7 · THE WEEK, untangled ────────────────────────────────────────────
  tl.to(flipper, { z: 700, y: -500, opacity: 0, filter: "blur(18px)", duration: 0.4, ease: "power3.in" }, S.week - 0.05);
  tl.set(cardScene, { visibility: "hidden" }, S.week + 0.4);
  tl.to(cam, { y: 0, rx: 0, s: 1, duration: 0.55, ease: "power3.inOut" }, S.week);
  tl.to(box2, { opacity: 0, y: -200, scale: 0.8, filter: "blur(10px)", duration: 0.35, ease: "power2.in" }, S.week);
  const SL = { x: 150, y: 200, w: 180, h: 64, px: 196, py: 74 };
  const ev = (c: number, r: number, label: string, cls = "", col = "") =>
    `<div class="ev ${cls}" data-c="${c}" data-r="${r}" style="${col ? `--c:${col};` : ""}left:${SL.x + c * SL.px}px;top:${SL.y + r * SL.py}px;width:${SL.w}px;height:${SL.h}px">${label}</div>`;
  const weekScene = html(`<div class="scene"><div class="week" style="left:${CARD.x}px;top:${CARD.y}px">
      <div class="hd">This week</div><div class="st">3 CONFLICTS</div>
      ${["MON", "TUE", "WED", "THU", "FRI"].map((d, j) => `<div class="day" style="left:${SL.x + j * SL.px}px;width:${SL.w}px">${d}</div>`).join("")}
      ${Array.from({ length: 30 }, (_, i) => `<div class="slot" style="left:${SL.x + (i % 5) * SL.px}px;top:${SL.y + Math.floor(i / 5) * SL.py}px;width:${SL.w}px;height:${SL.h}px"></div>`).join("")}
      ${Array.from({ length: 6 }, (_, r) => `<div class="day" style="left:40px;width:90px;top:${SL.y + r * SL.py + 20}px;letter-spacing:0.05em">${9 + r}:00</div>`).join("")}
      ${ev(0, 0, "Standup")}${ev(1, 1, "Budget review")}${ev(2, 4, "Board prep")}${ev(4, 5, "Retro")}
      ${ev(3, 2, "Design review", "x")}${ev(3, 2, "Vendor call", "x")}${ev(3, 2, "Hiring sync", "x")}
      ${ev(0, 2, "Focus · Q4", "n f1", NEON.lime)}${ev(2, 1, "Focus · deck", "n f2", NEON.lime)}
    </div></div>`);
  rig.appendChild(weekScene);
  const week = weekScene.querySelector<HTMLElement>(".week")!;
  const st = weekScene.querySelector<HTMLElement>(".st")!;
  const clash = Array.from(weekScene.querySelectorAll<HTMLElement>(".ev.x"));
  const focus = Array.from(weekScene.querySelectorAll<HTMLElement>(".ev.n"));
  gsap.set(clash, { x: (i: number) => i * 18, y: (i: number) => i * 10 });
  gsap.set(focus, { scale: 0, opacity: 0 });
  tl.set(weekScene, { visibility: "visible" }, S.week);
  tl.fromTo(week, { y: 520, z: -200, rotationX: -50, scale: 0.7, opacity: 0, filter: "blur(16px)" }, { y: 0, z: 0, rotationX: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "power4.out" }, S.week + 0.05);
  onFrame((t) => {
    if (t < S.week || t > S.solve + 0.2) return;
    clash.forEach((e, i) => (e.style.translate = `${(3 * Math.sin(t * 55 + i * 2)).toFixed(2)}px 0`));
  });
  const moves = [
    { c: 1, r: 3, col: NEON.cyan },
    { c: 4, r: 2, col: NEON.violet },
    { c: 0, r: 4, col: NEON.magenta },
  ];
  clash.forEach((e, i) => {
    const m = moves[i];
    const t0 = S.solve + i * 0.22;
    tl.to(e, { x: (m.c - 3) * SL.px, y: (m.r - 2) * SL.py, duration: 0.5, ease: "back.out(1.4)" }, t0);
    tl.to(e, { backgroundColor: m.col, color: "#061334", boxShadow: `0 0 26px ${m.col}`, duration: 0.25 }, t0 + 0.1);
    cue("click", t0, undefined, 0.9);
  });
  tl.to(focus, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.12, ease: "back.out(2)" }, S.solve + 0.8);
  tl.to(st, { scrambleText: { text: "WEEK CLEARED ✓", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", speed: 1 }, duration: 0.45, ease: "none" }, S.solve + 0.75);
  onFrame((t) => st.classList.toggle("ok", t >= S.solve + 0.85));
  cue("whoosh", S.week, 0.7, 0.8);
  cue("chime", S.solve + 0.85, undefined, 1.0);

  // ── 8 · FOUR AGENTS burst out, in neon ─────────────────────────────────
  const A = [
    { c: NEON.cyan, n: "Inbox agent", d: "2,184 sorted · 2 need you", m: "0", gx: 0, gy: 0 },
    { c: NEON.violet, n: "Reply agent", d: "58 replies in your voice", m: "58", gx: 1, gy: 0 },
    { c: NEON.magenta, n: "Calendar agent", d: "3 conflicts solved", m: "0", gx: 0, gy: 1 },
    { c: NEON.lime, n: "Finance agent", d: "INV-4821 reconciled", m: "✓", gx: 1, gy: 1 },
  ];
  const GX = (W - 2 * 560 - 40) / 2;
  const GY = 300;
  const agentsScene = html(`<div class="scene">
    <div class="core ag-title" style="top:110px">Agents at work.</div>
    ${A.map((a) => `<div class="apanel" style="--c:${a.c};left:${GX + a.gx * 600}px;top:${GY + a.gy * 370}px"><div class="t"><i></i>${a.n}</div><div class="d">${a.d}</div><div class="m">${a.m}</div><span class="bar"></span></div>`).join("")}
    ${A.map((a) => `<div class="laser trail" style="color:${a.c};background:${a.c};left:${CX}px;top:${CY}px;width:700px"></div>`).join("")}
  </div>`);
  rig.appendChild(agentsScene);
  const panels = Array.from(agentsScene.querySelectorAll<HTMLElement>(".apanel"));
  const trails = Array.from(agentsScene.querySelectorAll<HTMLElement>(".trail"));
  const title = agentsScene.querySelector<HTMLElement>(".ag-title")!;
  tl.to(week, { scale: 0.05, rotationZ: 200, opacity: 0, filter: "blur(10px)", duration: 0.35, ease: "power3.in" }, S.agents - 0.3);
  tl.set(weekScene, { visibility: "hidden" }, S.agents + 0.1);
  tl.set(agentsScene, { visibility: "visible" }, S.agents - 0.05);
  flashAt(S.agents, 0.95, 0.5);
  panels.forEach((p, i) => {
    const a = A[i];
    const px = GX + a.gx * 600 + 280;
    const py = GY + a.gy * 370 + 165;
    tl.fromTo(p, { x: CX - px, y: CY - py, scale: 0.1, rotationZ: (i % 2 ? 1 : -1) * 60, opacity: 0, filter: "blur(16px)" }, { x: 0, y: 0, scale: 1, rotationZ: 0, opacity: 1, filter: "blur(0px)", duration: 0.75, ease: "expo.out" }, S.agents + i * 0.06);
    const ang = Math.atan2(py - CY, px - CX);
    tl.fromTo(trails[i], { rotation: (ang * 180) / Math.PI, scaleX: 0, opacity: 1, transformOrigin: "0 50%" }, { scaleX: 1.4, opacity: 0, duration: 0.6, ease: "power3.out" }, S.agents + i * 0.06);
    tl.fromTo(p.querySelector(".bar"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, S.agents + 0.5 + i * 0.12);
    cue("hit", S.agents + i * 0.06, undefined, 0.5);
  });
  tl.fromTo(title, { opacity: 0, letterSpacing: "0.4em", filter: "blur(14px)" }, { opacity: 1, letterSpacing: "-0.02em", filter: "blur(0px)", duration: 0.7, ease: "power3.out" }, S.agents + 0.25);
  // the panels breathe in their colours; the camera orbits a little
  onFrame((t) => {
    if (t < S.agents || t > S.out + 0.5) return;
    panels.forEach((p, i) => {
      const g = 0.9 + 0.1 * Math.sin(t * 6 + i * 1.7);
      p.style.opacity = t > S.agents + 0.8 && t < S.out ? g.toFixed(3) : p.style.opacity;
    });
  });
  tl.to(cam, { ry: 6, rx: -4, s: 1.03, duration: S.out - S.agents, ease: "sine.inOut" }, S.agents);
  tl.to(rib, { hue: 1, a: 0.85, zoom: 0.8, x: 0, y: 0, duration: 0.8 }, S.agents);
  cue("sweep", S.agents - 0.1, 0.8, 1.0);
  A.forEach((_, i) => cue("chime", S.agents + 0.5 + i * 0.12, undefined, 0.6));

  // ── 9 · implosion into the mark, the sign-off ──────────────────────────
  panels.forEach((p, i) => {
    const a = A[i];
    tl.to(p, { x: CX - (GX + a.gx * 600 + 280), y: CY - (GY + a.gy * 370 + 165), scale: 0.05, rotationZ: (i % 2 ? -1 : 1) * 90, opacity: 0, filter: "blur(10px)", duration: 0.4, ease: "power4.in" }, S.out);
  });
  tl.to(title, { scale: 0.2, opacity: 0, filter: "blur(10px)", duration: 0.35, ease: "power3.in" }, S.out);
  tl.to(cam, { rx: 0, ry: 0, s: 1, duration: 0.4 }, S.out);
  tl.to(rib, { a: 0, duration: 0.4 }, S.out + 0.1);
  tl.set(agentsScene, { visibility: "hidden" }, S.out + 0.45);
  flashAt(S.out + 0.38, 1, 0.6);
  cue("riser", S.out - 0.3, 0.6, 1.0);
  const sign = html(`<div class="scene">
    <div class="abs sg-ring" style="left:${CX - 300}px;top:${CY - 300 - 140}px;width:600px;height:600px;border-radius:50%;border:3px solid rgba(160,210,255,0.9);box-shadow:0 0 40px rgba(90,160,255,0.8)"></div>
    <div class="abs sg-mark" style="left:${CX - 160}px;top:${CY - 300}px;width:320px;height:320px;filter:drop-shadow(0 0 20px rgba(130,190,255,0.95)) drop-shadow(0 0 70px rgba(47,107,255,0.8))">${markSvg("#d8ebff", 320)}</div>
    <div class="handled" style="top:610px">Handled by Astrya.</div>
    <div class="sub" style="top:760px">Inbox zero. Every day. Without lifting a finger.</div>
    <div class="cta2" style="top:850px">Try Astrya free ${ICON.up.replace('stroke-width="2.4"', 'stroke-width="2.4" style="width:30px;height:30px;transform:rotate(90deg)"')}</div>
  </div>`);
  front.appendChild(sign);
  const ring = sign.querySelector<HTMLElement>(".sg-ring")!;
  const mk = sign.querySelector<HTMLElement>(".sg-mark")!;
  const letters = splitChars(sign.querySelector<HTMLElement>(".handled")!);
  const sub = sign.querySelector<HTMLElement>(".sub")!;
  const cta = sign.querySelector<HTMLElement>(".cta2")!;
  tl.set(sign, { visibility: "visible" }, S.out + 0.35);
  tl.fromTo(ring, { scale: 0.05, opacity: 1 }, { scale: 2.2, opacity: 0, duration: 0.9, ease: "power2.out" }, S.out + 0.4);
  tl.fromTo(mk, { scale: 0.2, rotation: -260, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: "back.out(1.6)" }, S.out + 0.38);
  const sw = letters.map(() => ({ p: 0 }));
  letters.forEach((_, i) => tl.to(sw[i], { p: 1, duration: 0.55, ease: "power3.out" }, S.sign + 0.1 + i * 0.035));
  onFrame((t) => {
    if (t < S.sign - 0.1) return;
    letters.forEach((l, i) => {
      const q = 1 - sw[i].p;
      const ang = q * 2.2;
      const r = q * 280;
      l.style.transform = `translate3d(${(Math.sin(ang) * r).toFixed(1)}px, ${((1 - Math.cos(ang)) * r * 0.9 + q * 140).toFixed(1)}px, 0) rotate(${(q * 70).toFixed(1)}deg) scale(${(0.5 + 0.5 * sw[i].p).toFixed(3)})`;
      l.style.opacity = smooth(clamp(sw[i].p * 2.5)).toFixed(3);
      l.style.filter = q > 0.05 ? `blur(${(q * 8).toFixed(1)}px)` : "";
    });
  });
  tl.fromTo(sub, { opacity: 0, y: 20, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, ease: "power3.out" }, S.sub);
  gsap.set(cta, { xPercent: -50 });
  tl.fromTo(cta, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, S.cta);
  tl.fromTo(mk, { y: 0 }, { y: -12, duration: S.end - S.sign, ease: "sine.inOut", immediateRender: false }, S.sign + 0.6);
  cue("hit", S.out + 0.38, undefined, 1.2);
  cue("chime", S.sign + 0.2, undefined, 1.0);
  cue("click", S.cta + 0.05, undefined, 0.8);
  for (let i = 0; i < letters.length; i += 2) cue("tick", S.sign + 0.2 + i * 0.035, undefined, 0.3);

  // ribbons: bright for the logo and pills, then a glow behind the work
  gsap.set(rib, { a: 1, zoom: 1, x: 0, y: 0 });
  tl.to(rib, { flow: 1.4, duration: S.type, ease: "none" }, 0);
  tl.to(rib, { a: 0.0, duration: 0.25 }, S.type - 0.35);
  tl.to(rib, { a: 0.55, zoom: 0.7, x: 1.4, y: -0.7, duration: 0.9, ease: "power2.out" }, S.pull);
  tl.to(rib, { flow: 6, duration: S.out - S.pull, ease: "none" }, S.pull);
  tl.to(rib, { a: 0.2, duration: 0.4 }, S.mails);
  tl.to(rib, { x: 0.6, y: -0.2, a: 0.7, duration: 1.0, ease: "power2.inOut" }, S.card);
  tl.to(rib, { a: 0.45, duration: 0.6 }, S.flip);
}
