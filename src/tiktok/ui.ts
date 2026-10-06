import { gsap } from "../core/gsap";
import { onFrame, cue, clamp, smooth, lerp, rng } from "../core/clock";
import { icon, ringMark } from "../core/icons";
import { html, splitChars, world, front, $, W, H } from "./stage";
import { T } from "./timing";
import { hud, LEVELS } from "./gl";

/**
 * The DOM layer of the TikTok film: HUD, the envelope that becomes the inbox,
 * the flood, the tower's levels, the sorted inbox, the camera's trip into
 * Eva's email and behind it, the tasks, the morning, the words, the logo.
 * The screens and features are the product's own (reference film).
 */
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eIn = (x: number) => x * x * x;
const eOut = (x: number) => 1 - Math.pow(1 - x, 3);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildFilm(tl: gsap.core.Timeline) {
  const show = (el: HTMLElement, a: number, b: number) =>
    onFrame((t) => {
      el.style.visibility = t >= a && t < b ? "visible" : "hidden";
    });
  // every element starts in the "from" state of its first tween (set at t = 0)
  const seen = new WeakSet<object>();
  const ft = (el: gsap.TweenTarget, from: gsap.TweenVars, to: gsap.TweenVars, at: number, init = true) => {
    const list = (gsap.utils.toArray(el) as object[]).filter((e) => !seen.has(e));
    list.forEach((e) => seen.add(e));
    if (init && list.length) tl.set(list, { ...from }, 0);
    return tl.fromTo(el, from, { ...to, immediateRender: false }, at);
  };
  const flashEl = $("#flash");
  tl.set(flashEl, { opacity: 0 }, 0);
  const flash = (at: number, peak = 1, rise = 0.06, fall = 0.45) => {
    tl.to(flashEl, { opacity: peak, duration: rise, ease: "none" }, at - rise);
    tl.to(flashEl, { opacity: 0, duration: fall, ease: "power2.out" }, at);
  };
  const caption = (text: string, a: number, b: number, cls = "cap") => {
    const el = html(`<div class="${cls}">${text}</div>`);
    front.append(el);
    const chars = splitChars(el);
    show(el, a, b);
    ft(chars, { opacity: 0, scale: 1.8, y: 20, filter: "blur(18px)" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.022, ease: "expo.out" }, a);
    ft(chars, { opacity: 1, filter: "blur(0px)" }, { opacity: 0, y: -30, filter: "blur(14px)", duration: 0.3, stagger: 0.01, ease: "power2.in" }, b - 0.35);
    return { el, chars };
  };
  const splitWords = (el: HTMLElement) => {
    const words = (el.textContent ?? "").trim().split(/\s+/);
    el.textContent = "";
    return words.map((w) => {
      const s = document.createElement("span");
      s.className = "wd";
      s.textContent = w;
      el.appendChild(s);
      return s;
    });
  };

  // ── speed: streaks of light, and the cloud deck ───────────────────────
  const sc = document.createElement("canvas");
  sc.width = W;
  sc.height = H;
  sc.className = "abs";
  front.append(sc);
  const sg = sc.getContext("2d")!;
  const RS = rng(77);
  const lines = Array.from({ length: 280 }, () => ({ a: RS() * Math.PI * 2, ph: RS(), rate: 0.8 + RS() * 1.6, w: 0.6 + RS() * 2.4, l: 0.15 + RS() * 0.5 }));
  // a cloud texture: soft blobs
  const cloud = document.createElement("canvas");
  cloud.width = 1200;
  cloud.height = 1200;
  {
    const g = cloud.getContext("2d")!;
    const R = rng(12);
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI * 2;
      const r = 120 + Math.pow(R(), 0.6) * 520;
      const x = 600 + Math.cos(a) * r;
      const y = 600 + Math.sin(a) * r;
      const s = 40 + R() * 160;
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      const v = 0.05 + R() * 0.12;
      gr.addColorStop(0, `rgba(220,235,255,${v})`);
      gr.addColorStop(1, "rgba(160,200,255,0)");
      g.fillStyle = gr;
      g.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
  }
  onFrame((t) => {
    const dive = smooth(P(t, T.dive + 0.25, T.clouds)) * (1 - smooth(P(t, T.city - 0.1, T.city + 0.25)));
    const city = 0.4 * smooth(P(t, T.city + 0.6, T.env)) * (t < T.env ? 1 : 0);
    const into = Math.sin(Math.PI * P(t, T.into, T.detail)) * 0.9;
    const send = Math.sin(Math.PI * P(t, T.approve, T.tasks + 0.2)) * 0.8;
    const out = Math.sin(Math.PI * P(t, T.pullout - 0.1, T.pullout + 1.0)) * 0.9;
    const k = Math.max(dive, city, into, send, out);
    const cl = Math.sin(Math.PI * P(t, T.clouds - 0.15, T.city + 0.3));
    sg.clearRect(0, 0, W, H);
    sg.fillStyle = "rgba(0,0,0,0.004)";
    sg.fillRect(0, 0, 1, 1);
    const on = k > 0.001 || cl > 0.001;
    sc.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const useHud = (dive > 0.001 || city > 0.001) && hud.on;
    const cx = useHud ? hud.x : W / 2;
    const cy = useHud ? hud.y : H / 2;
    if (cl > 0.001) {
      // three layers of cloud rushing past the lens
      for (let j = 0; j < 3; j++) {
        const z = (((j / 3 + (t - T.clouds) * 1.7) % 1) + 1) % 1;
        const s = 0.5 * Math.exp(z * 3.2);
        sg.globalAlpha = Math.min(1, Math.sin(z * Math.PI) * 1.6) * cl;
        sg.drawImage(cloud, cx - 600 * s, cy - 600 * s, 1200 * s, 1200 * s);
      }
      sg.globalAlpha = 1;
    }
    if (k <= 0.001) return;
    sg.globalCompositeOperation = "lighter";
    sg.lineCap = "round";
    for (const ln of lines) {
      const ph = (ln.ph + t * ln.rate * (0.6 + k * 1.8)) % 1;
      const r = 40 + ph * ph * 1900;
      const len = r * ln.l * (0.4 + k);
      const x0 = cx + Math.cos(ln.a) * r;
      const y0 = cy + Math.sin(ln.a) * r;
      const x1 = cx + Math.cos(ln.a) * (r + len);
      const y1 = cy + Math.sin(ln.a) * (r + len);
      const gr = sg.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, "rgba(120,180,255,0)");
      gr.addColorStop(1, `rgba(215,236,255,${(k * ph * 0.85).toFixed(3)})`);
      sg.strokeStyle = gr;
      sg.lineWidth = ln.w * (0.6 + ph * 1.6);
      sg.beginPath();
      sg.moveTo(x0, y0);
      sg.lineTo(x1, y1);
      sg.stroke();
    }
    sg.globalCompositeOperation = "source-over";
  });

  // ── HUD: the notification is noticed, then tracked down ───────────────
  const ret = html(`<div class="reticle"><svg viewBox="-80 -80 160 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
      <path d="M-70 -40V-70H-40M40 -70H70V-40M70 40V70H40M-40 70H-70V40"/>
      <circle r="48" stroke-width="1.5" stroke-dasharray="4 8" class="spin"/></svg></div>`);
  const tag = html(`<div class="hudtag"></div>`);
  front.append(ret, tag);
  const spin = ret.querySelector<SVGElement>(".spin")!;
  onFrame((t) => {
    const intro = t >= T.notice && t < T.clouds;
    const city = t >= T.city + 0.35 && t < T.env;
    if (!(intro || city) || !hud.on) {
      ret.style.visibility = tag.style.visibility = "hidden";
      return;
    }
    ret.style.visibility = tag.style.visibility = "visible";
    let s: number;
    let o: number;
    let rot: number;
    if (intro) {
      const lock = eOut(P(t, T.notice, T.notice + 0.4));
      s = lerp(2.6, 0.75, lock) * (1 + eIn(P(t, T.dive, T.clouds)) * 4);
      o = lock * (1 - P(t, T.clouds - 0.4, T.clouds));
      rot = lerp(45, 0, lock);
    } else {
      const lock = eOut(P(t, T.city + 0.35, T.city + 0.7));
      s = lerp(2, 1, lock) * (1 + eIn(P(t, T.city + 0.8, T.env)) * 2.5);
      o = lock * (1 - P(t, T.env - 0.3, T.env));
      rot = lerp(-45, 0, lock);
    }
    ret.style.transform = `translate3d(${hud.x}px, ${hud.y}px, 0) rotate(${rot}deg) scale(${s})`;
    ret.style.opacity = o.toFixed(3);
    spin.style.transform = `rotate(${t * 90}deg)`;
    const blink = intro && t < T.notice + 0.5 ? (Math.floor((t - T.notice) * 8) % 2 ? 0.25 : 1) : 1;
    tag.style.transform = `translate3d(calc(${hud.x}px - 50%), ${hud.y + 110 * s}px, 0)`;
    tag.style.opacity = (o * blink * (intro ? 1 - P(t, T.dive, T.dive + 0.3) : 1)).toFixed(3);
    tag.innerHTML = intro ? `1 NEW MESSAGE` : `<b>ASTRYA</b> · INBOX`;
  });
  cue("soft", 0.1, 3);
  cue("sweep", 1.2, 1.2, 0.6);
  cue("chime", T.signal);
  cue("tick", T.notice);
  cue("tick", T.notice + 0.12);
  cue("riser", T.notice + 0.2, T.dive - T.notice - 0.2);
  cue("whoosh", T.dive, 0.9);
  cue("sweep", T.clouds, 0.7);
  cue("whoosh", T.city, 1.2);
  cue("riser", T.city + 0.2, T.env - T.city - 0.2);
  cue("hit", T.env);

  // ── the envelope opens; the letter unfolds into the inbox ─────────────
  const rig = html(`<div class="rig"></div>`);
  world.append(rig);
  const env = html(`<div class="env">
    <div class="back"></div>
    <div class="front"></div>
    <div class="flap"></div>
    <div class="seal">${ringMark("")}</div>
  </div>`);
  const inboxRows: Array<[string, string, string, string, string, string]> = [
    ["EB", "Eva Brunner", "Alpine Supplies", "Contract renewal — confirmation needed", "The current contract expires Friday. Please confirm…", "09:12"],
    ["SM", "Sofia Marin", "Chat", "Can you send me the Q4 numbers before the board call?", "", "09:14"],
    ["MD", "Marc Dufour", "Silo Logistics", "Invoice 4821 — payment status", "We have not yet received payment for invoice 4821.", "09:15"],
    ["HK", "Helena Krug", "Lumen Labs", "NDA — Lumen Labs engagement", "Mutual NDA attached, 24 months. Could you sign…", "09:15"],
    ["NK", "Nina Kovacs", "Atlas Freight", "Shipment AT-8891 delayed", "Customs hold in Basel. New ETA Friday 16:00.", "09:16"],
    ["NK", "Northline kickoff", "Meeting", "Thursday 14:30 · Missed", "", "09:16"],
    ["SP", "Silo Pay", "Notifications", "Payment received — INV-4820", "A payment of CHF 4,820 was received.", "09:17"],
    ["PS", "Priya Shah", "Finance", "Re: Q4 budget — final numbers?", "Can we lock this before Friday?", "09:17"],
    ["XL", "Q4 allocation.xlsx", "Shared file", "For Priya Shah · Needed by Friday", "", "09:17"],
    ["JF", "Jonas Frei", "Clearwater Bank", "Updated bank details", "Please update our payment details before…", "09:18"],
    ["CO", "Claire Osman", "Northline Retail", "Proposal v3 — waiting on your board", "Attached the revised proposal with pricing…", "09:18"],
    ["AF", "Atlas Freight", "Tracking", "AT-8891 — tracking update", "Your shipment is on hold.", "09:18"],
    ["MC", "Maya Chen", "People Ops", "Expense report reminder", "Your September report is due.", "09:19"],
    ["NR", "Northline Retail", "Newsletter", "Product newsletter — October", "What's new this month…", "09:19"],
    ["HL", "Helios Legal", "Legal", "September legal brief", "Three updates you should know about.", "09:19"],
  ];
  const kindIcon = (who: string) =>
    who === "Sofia Marin" ? `<span class="kind">${icon.hash}Chat</span>` : who === "Northline kickoff" ? `<span class="kind">${icon.calendar}Missed</span>` : who === "Q4 allocation.xlsx" ? `<span class="kind">${icon.file}Requested</span>` : "";
  const inbox = html(`<div class="panel inbox">
    <div class="hd"><h3>Inbox</h3><span class="unr">1 unread</span></div>
    <div class="list"></div>
  </div>`);
  rig.append(inbox, env);
  const list = inbox.querySelector<HTMLElement>(".list")!;
  const unr = inbox.querySelector<HTMLElement>(".unr")!;
  // arrivals: Eva first, then faster and faster
  const arr: number[] = [T.inbox - 0.6];
  {
    let a = T.flood + 0.2;
    let gap = 0.34;
    for (let i = 1; i < 30; i++) {
      arr.push(a);
      a += gap;
      gap = Math.max(0.06, gap * 0.86);
    }
  }
  const rows = arr.map((_, i) => {
    const [ini, who, org, sub, pre, tm] = inboxRows[i % inboxRows.length];
    const el = html(`<div class="mrow"><span class="dot"></span><span class="av">${ini}</span><div class="who">${who}<span>${org}</span></div><div class="sub">${sub}</div>${pre ? `<div class="pre">${pre}</div>` : ""}<span class="tm">${tm}</span>${kindIcon(who)}</div>`);
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.right = "0";
    list.append(el);
    return el;
  });
  onFrame((t) => {
    if (t < T.env || t > T.tower + 0.6) return;
    const fast = smooth(P(t, T.saturate - 0.3, T.tower));
    rows.forEach((el, i) => {
      const a = arr[i];
      if (t < a) {
        el.style.visibility = "hidden";
        return;
      }
      let y = 0;
      for (let j = i + 1; j < arr.length; j++) if (t >= arr[j]) y += eOut(P(t, arr[j], arr[j] + 0.22)) * 134;
      const k = eOut(P(t, a, a + 0.22));
      // saturation: the list races, faster than it can be read
      y += fast * ((t - T.saturate + 0.3) * 2600);
      y = y % (134 * 30);
      el.style.visibility = y > 1100 ? "hidden" : "visible";
      el.style.transform = `translate3d(0, ${y - (1 - k) * 60}px, 0)`;
      el.style.opacity = k.toFixed(3);
      el.style.background = t < a + 0.5 ? `rgba(77,141,255,${(0.22 * (1 - P(t, a, a + 0.5))).toFixed(3)})` : "";
    });
    const arrived = arr.filter((a) => t >= a).length;
    const n = Math.max(arrived, Math.floor(248 * Math.pow(P(t, T.flood + 1.2, T.tower - 0.3), 1.6)));
    let txt = `${fmt(n)} unread`;
    if (t > T.saturate && Math.floor(t * 30) % 4 === 0) txt = txt.replace(/\d/g, (d) => String((Number(d) * 7 + Math.floor(t * 60)) % 10));
    unr.textContent = txt;
  });
  arr.slice(1).forEach((a, i) => i < 14 && cue("tick", a, undefined, 0.5 + i * 0.03));
  // the envelope
  show(env, T.env - 0.02, T.unfold + 0.7);
  ft(env, { scale: 2.2, opacity: 0, z: 400, rotationX: 0 }, { scale: 1, opacity: 1, z: 0, rotationX: 0, duration: 0.4, ease: "expo.out" }, T.env);
  flash(T.env, 0.7, 0.05, 0.35);
  const flap = env.querySelector<HTMLElement>(".flap")!;
  ft(flap, { rotationX: 0 }, { rotationX: 178, duration: 0.4, ease: "power2.inOut" }, T.open);
  ft(env.querySelector(".seal"), { scale: 1, opacity: 1 }, { scale: 0.2, opacity: 0, duration: 0.2, ease: "power2.in" }, T.open - 0.05);
  ft(env, { y: 0, opacity: 1 }, { y: 900, rotationX: 55, opacity: 0, duration: 0.6, ease: "power3.in" }, T.unfold + 0.05);
  cue("click", T.open - 0.05);
  cue("whoosh", T.open + 0.05, 0.4, 0.7);
  // the letter: the inbox itself, pulled out of the envelope then unfolding
  show(inbox, T.open + 0.1, T.tower + 0.6);
  ft(inbox, { scale: 0.52, y: 60, z: -2, opacity: 0, rotationX: 0 }, { y: -170, opacity: 1, duration: 0.35, ease: "power2.out" }, T.open + 0.15);
  tl.to(inbox, { scale: 1, y: 0, z: 0, duration: 0.65, ease: "expo.out" }, T.unfold + 0.1);
  cue("sweep", T.unfold + 0.1, 0.6);

  // side messages: chat, missed meeting, requested file (from the product)
  const sides = [
    [`<div class="t">${icon.hash}Sofia Marin<em>Chat · now</em></div><p>Can you send me the Q4 numbers before the board call?</p>`, 470, 228, T.flood + 0.45, 1],
    [`<div class="t">${icon.calendar}Northline kickoff<em>Meeting</em></div><p>Thursday · 14:30 <span class="chipb">Missed</span></p>`, 30, 1395, T.flood + 0.8, -1],
    [`<div class="t">${icon.file}Q4 allocation.xlsx<em>Requested</em></div><p>For Priya Shah <span class="chipb">Needed by Friday</span></p>`, 490, 1560, T.flood + 1.1, 1],
  ] as const;
  const sideEls = sides.map(([m, x, y, at, dir], i) => {
    const el = html(`<div class="side" style="left:${x}px;top:${y}px">${m}</div>`);
    rig.append(el);
    show(el, at, T.tower + 0.5);
    ft(el, { x: dir * 900, z: 300, rotationY: dir * -50, opacity: 0 }, { x: 0, z: 120, rotationY: dir * -8, opacity: 1, duration: 0.5, ease: "expo.out" }, at);
    cue("whoosh", at - 0.05, 0.4, 0.6);
    cue("chime", at + 0.1, undefined, 0.4);
    onFrame((t) => {
      if (t < at + 0.5 || t > T.tower) return;
      const sat = smooth(P(t, T.saturate - 0.2, T.tower));
      const j = sat * 14;
      el.style.translate = `${Math.sin(t * 1.3 + i) * 10 + Math.sin(t * 47 + i * 3) * j}px ${Math.cos(t * 1.1 + i) * 12 + Math.sin(t * 39 + i) * j}px`;
    });
    return el;
  });
  // the camera floats; under saturation it shakes
  onFrame((t) => {
    if (t < T.env || t > T.tower + 0.6) return;
    const u = t - T.inbox;
    const k = smooth(P(t, T.inbox, T.inbox + 1));
    const sat = smooth(P(t, T.saturate - 0.3, T.tower));
    const rx = (5 + Math.sin(u * 0.5) * 3) * k + Math.sin(t * 41) * sat * 1.2;
    const ry = Math.sin(u * 0.4 + 0.5) * 5 * k + Math.sin(t * 37) * sat * 1.5;
    rig.style.transform = `translateZ(${Math.sin(u * 0.6) * 40 * k - sat * 120}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  const tooMany = caption("TOO MANY EMAILS.", T.tooMany, T.tower - 0.1);
  onFrame((t) => {
    if (t < T.tooMany || t > T.tower) return;
    const amp = 1 + smooth(P(t, T.saturate - 0.4, T.tower)) * 12;
    const r = rng(Math.floor(t * 60));
    tooMany.el.style.transform = `translate(${(r() - 0.5) * amp}px, ${(r() - 0.5) * amp * 0.5}px)`;
    tooMany.el.style.textShadow = `${(r() - 0.5) * amp * 1.6}px 0 rgba(90,220,255,0.75), ${(r() - 0.5) * amp * 1.6}px 0 rgba(47,90,255,0.75), 0 0 30px rgba(90,150,255,0.75), 0 0 90px rgba(47,107,255,0.5)`;
  });
  cue("hit", T.tooMany, undefined, 1.0);
  cue("riser", T.saturate - 0.6, T.tower - T.saturate + 0.6, 1.1);
  // everything is drawn into the base of the tower
  ft([inbox, ...sideEls], { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.06, y: 520, duration: 0.42, ease: "power4.in", stagger: 0.03 }, T.tower);
  flash(T.tower + 0.42, 0.55, 0.05, 0.5);
  cue("hit", T.tower + 0.42, undefined, 1.2);

  // ── the tower: levels of analysis ─────────────────────────────────────
  const lvls = LEVELS.map((n, k) => {
    const el = html(`<div class="lvl"><em>0${k + 1}</em>${n}</div>`);
    front.append(el);
    return el;
  });
  onFrame((t) => {
    lvls.forEach((el, k) => {
      const on = T.levels + k * 0.8;
      const vis = t >= T.tower + 0.6 && t < T.converge + 0.15 && hud.levels[k] && hud.levels[k].z < 1;
      el.style.visibility = vis ? "visible" : "hidden";
      if (!vis) return;
      const p = hud.levels[k];
      const lit = t >= on;
      const o = smooth(P(t, T.tower + 0.6 + k * 0.1, T.tower + 1.0 + k * 0.1)) * (lit ? 1 : 0.35) * (1 - P(t, T.converge - 0.15, T.converge + 0.15));
      el.style.left = `${Math.min(W - 420, p.x)}px`;
      el.style.top = `${p.y}px`;
      el.style.opacity = o.toFixed(3);
      el.style.boxShadow = lit ? `inset 0 0 0 1.5px rgba(160,210,255,${0.6 + 0.4 * Math.exp(-(t - on) * 3)}), 0 0 ${24 + 40 * Math.exp(-(t - on) * 3)}px rgba(47,107,255,0.8)` : "";
    });
  });
  LEVELS.forEach((_, k) => {
    cue("tick", T.levels + k * 0.8);
    cue("chime", T.levels + k * 0.8 + 0.02, undefined, 0.45);
  });
  caption("ASTRYA UNDERSTANDS.", T.levels + 1.4, T.converge - 0.2);
  const an = html(`<div class="analyzed"></div>`);
  front.append(an);
  show(an, T.levels, T.converge + 0.2);
  onFrame((t) => {
    if (t < T.levels || t > T.converge + 0.2) return;
    an.textContent = `ANALYZED  ${fmt(248 * smooth(P(t, T.levels, T.converge - 0.2)))} / 248`;
    an.style.opacity = (P(t, T.levels, T.levels + 0.3) * (1 - P(t, T.converge, T.converge + 0.2))).toFixed(3);
  });
  cue("riser", T.converge - 1.2, 1.4, 1.2);
  flash(T.clean, 1, 0.12, 0.7);
  cue("hit", T.clean, undefined, 1.5);

  // ── a perfectly clean inbox ───────────────────────────────────────────
  const rig2 = html(`<div class="rig"></div>`);
  world.append(rig2);
  const clean = html(`<div class="panel inbox">
    <div class="hd"><h3>Inbox</h3><span class="unr">3 need you</span><span class="sortedby">${icon.sparkle}Sorted by ASTRYA</span></div>
    <div class="list">
      <div class="mrow top"><span class="av">EB</span><div class="who">Eva Brunner<span>Alpine Supplies</span></div><div class="sub">Contract renewal — confirmation needed</div><div class="pre">The current contract expires Friday. Please confirm…</div><span class="tm">09:12</span><span class="due">Due Friday</span></div>
      <div class="mrow"><span class="av">MD</span><div class="who">Marc Dufour<span>Silo Logistics</span></div><div class="sub">Invoice 4821 — payment status</div><div class="pre">We have not yet received payment for invoice 4821.</div><span class="tm">09:15</span></div>
      <div class="mrow"><span class="av">NK</span><div class="who">Nina Kovacs<span>Atlas Freight</span></div><div class="sub">Shipment AT-8891 delayed</div><div class="pre">Customs hold in Basel. New ETA Friday 16:00.</div><span class="tm">09:16</span></div>
      <div class="canwait"><span class="stack"><i>HK</i><i>SP</i><i>AF</i><i>NR</i><i>HL</i></span><b>Can wait</b> · 245 messages</div>
    </div>
  </div>`);
  rig2.append(clean);
  show(rig2, T.clean - 0.05, T.detail + 0.1);
  ft(clean, { scale: 0.86, opacity: 0, z: -300 }, { scale: 1, opacity: 1, z: 0, duration: 0.7, ease: "expo.out" }, T.clean);
  const cleanParts = [...clean.querySelectorAll<HTMLElement>(".hd > *, .mrow, .canwait")];
  ft(cleanParts, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power3.out" }, T.clean + 0.15);
  ft(clean.querySelector(".due"), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, T.clean + 0.7);
  cue("chime", T.clean + 0.7, undefined, 0.7);
  onFrame((t) => {
    if (t < T.clean || t > T.detail) return;
    const u = t - T.clean;
    rig2.style.transform = `translateZ(${u * 25}px) rotateX(${6 - u * 1.5}deg) rotateY(${-8 + u * 4}deg)`;
  });
  // the camera dives into Eva's email
  clean.style.transformOrigin = "450px 194px";
  tl.to(clean, { scale: 9, opacity: 0, duration: 0.62, ease: "power3.in" }, T.into);
  cue("whoosh", T.into, 0.6, 1.1);

  // ── inside the email: Astrya reads it; then, behind the card, the reply ─
  const rig3 = html(`<div class="rig"></div>`);
  world.append(rig3);
  const reply =
    "Hi Eva, We confirm the renewal of the 2026–27 agreement. Please hold the Geneva warehouse slot — the signed copy follows today. Best regards, Ziyad";
  const flip = html(`<div class="flip">
    <div class="face panel dt">
      <div class="crumb">Inbox › Operations</div>
      <h2>Contract renewal — confirmation needed</h2>
      <div class="from"><span class="av">EB</span><b>Eva Brunner</b> <span class="chipb">Key supplier · Alpine Supplies</span><small>eva.brunner@alpinesupplies.ch</small><span class="when">Today 09:12</span></div>
      <div class="body">Hi Ziyad,<br>Following up: the current contract <span class="k">expires Friday</span>.<br><span class="k">Please confirm renewal</span> so we can lock Q4 allocation. Without confirmation we cannot hold the <span class="k">Geneva warehouse slot</span>.<br><br>Best regards, Eva</div>
      <div class="att">${icon.paperclip}Supply agreement 2026–27.pdf</div>
      <span class="due">Due Fri · 4 days</span>
      <div class="scanl"></div>
    </div>
    <div class="face panel rear rp">
      <div class="to"><span class="av">EB</span><b>Reply to Eva Brunner</b><small>Contract renewal — confirmation needed</small></div>
      <span class="prep">${icon.sparkle}PREPARED BY ASTRYA</span>
      <div class="rbox">${reply}</div>
      <div class="acts"><span class="btn ghost">Edit</span><span class="btn apv">Approve &amp; send</span></div>
    </div>
  </div>`);
  rig3.append(flip);
  const insight = html(`<div class="insight"><div class="lb">${ringMark("")}ASTRYA</div><h4>Renewal needed before Friday.</h4><p>Without it, the Geneva warehouse slot is released.</p><span class="btn conf">Confirm renewal</span></div>`);
  rig3.append(insight);
  insight.querySelector<SVGElement>(".lb svg")!.style.cssText = "width:34px;height:34px";
  show(rig3, T.into + 0.3, T.tasks + 0.3);
  // the card opens around the camera, out of the row
  ft(flip, { scale: 0.18, y: -186, z: 0, opacity: 0, rotationY: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, T.into + 0.4);
  onFrame((t) => {
    if (t < T.into || t > T.tasks + 0.3) return;
    const u = t - T.detail;
    rig3.style.transform = `translateZ(${Math.sin(u * 0.6) * 40}px) rotateX(${4 + Math.sin(u * 0.5) * 2}deg) rotateY(${Math.sin(u * 0.4) * 7}deg)`;
  });
  const scan = flip.querySelector<HTMLElement>(".scanl")!;
  ft(scan, { opacity: 0, y: 0 }, { opacity: 1, duration: 0.05 }, T.detail + 0.4);
  tl.to(scan, { y: 860, duration: 0.6, ease: "power1.inOut" }, T.detail + 0.4);
  tl.to(scan, { opacity: 0, duration: 0.1 }, T.detail + 1.0);
  cue("sweep", T.detail + 0.4, 0.6);
  [...flip.querySelectorAll<HTMLElement>(".k")].forEach((k, i) => {
    const at = T.detail + 0.55 + i * 0.16;
    onFrame((t) => k.classList.toggle("hit", t >= at && t < T.behind + 0.2));
    cue("tick", at, undefined, 0.7);
  });
  const due = flip.querySelector<HTMLElement>(".dt .due")!;
  ft(due, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, T.detail + 1.05);
  cue("chime", T.detail + 1.05, undefined, 0.6);
  show(insight, T.insight, T.behind + 0.3);
  ft(insight, { opacity: 0, y: 260, z: 0, rotationX: 40 }, { opacity: 1, y: 0, z: 140, rotationX: 0, duration: 0.55, ease: "expo.out" }, T.insight);
  cue("whoosh", T.insight - 0.05, 0.4, 0.7);
  cue("soft", T.insight + 0.1, 1.0, 0.5);
  const conf = insight.querySelector<HTMLElement>(".conf")!;
  ft(conf, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.in" }, T.confirm - 0.1);
  tl.to(conf, { scale: 1.06, duration: 0.15, ease: "power2.out" }, T.confirm - 0.02);
  cue("click", T.confirm - 0.08);
  tl.to(insight, { opacity: 0, y: 380, rotationX: -30, duration: 0.3, ease: "power3.in" }, T.confirm + 0.05);
  // the camera swings behind the card
  tl.to(flip, { rotationY: 180, duration: 0.65, ease: "power3.inOut" }, T.behind);
  tl.to(flip, { z: -260, duration: 0.32, ease: "power2.out" }, T.behind);
  tl.to(flip, { z: 0, duration: 0.33, ease: "power2.in" }, T.behind + 0.32);
  cue("whoosh", T.behind, 0.6);
  const wds = splitWords(flip.querySelector<HTMLElement>(".rbox")!);
  const r0 = T.behind + 0.65;
  const rate = (T.approve - 0.3 - r0) / wds.length;
  wds.forEach((w, i) => {
    const at = r0 + i * rate;
    ft(w, { opacity: 0, y: 8, color: "#7fe0ff", textShadow: "0 0 18px rgba(127,224,255,1)" }, { opacity: 1, y: 0, color: "#eef3ff", textShadow: "0 0 0px rgba(127,224,255,0)", duration: 0.3, ease: "power2.out" }, at);
    if (i % 2 === 0) cue("tick", at, undefined, 0.35);
  });
  const send = flip.querySelector<HTMLElement>(".apv")!;
  ft(send, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.in" }, T.approve - 0.12);
  tl.to(send, { scale: 1.08, duration: 0.12, ease: "power2.out" }, T.approve - 0.04);
  cue("click", T.approve - 0.1);
  // approved: the reply folds into a line of light and leaves, upward
  tl.to(flip, { scaleY: 0.015, duration: 0.14, ease: "power3.in" }, T.approve + 0.02);
  tl.to(flip, { y: -1700, opacity: 0, duration: 0.28, ease: "power4.in" }, T.approve + 0.16);
  const streak = html(`<div class="streak"></div>`);
  front.append(streak);
  show(streak, T.approve + 0.12, T.approve + 0.8);
  ft(streak, { scaleY: 0, opacity: 1 }, { scaleY: 1, duration: 0.25, ease: "power4.in" }, T.approve + 0.14);
  tl.to(streak, { opacity: 0, duration: 0.35 }, T.approve + 0.4);
  cue("whoosh", T.approve + 0.1, 0.5, 1.3);
  caption("ASTRYA ACTS.", T.approve + 0.25, T.morning - 0.6);

  // ── the work keeps going: tasks, calendar, the finance agent ───────────
  const rig4 = html(`<div class="rig"></div>`);
  world.append(rig4);
  const tasks = html(`<div class="panel tasks"><h3>Tasks</h3>
    <div class="trow r0"><span class="cb"><i>${icon.check}</i></span><b>Invoice 4821 — payment status</b><small class="a">Marc Dufour · due 30 Sep</small><small class="b ok">Resolved by Finance agent · paid 12 Sep</small><span class="tg">Overdue</span></div>
    <div class="trow r1"><span class="cb"><i>${icon.check}</i></span><b>Confirm renewal — Alpine Supplies</b><small class="a">Eva Brunner · due Friday</small><small class="b ok">Done · replied 09:14</small></div>
    <div class="trow r2"><span class="cb"><i>${icon.check}</i></span><b>Pricing call with Eva Brunner</b><small class="a">Thursday · 10:00</small></div>
    <div class="trow r3"><span class="cb"><i>${icon.check}</i></span><b>Q4 allocation for Priya</b><small class="a">Due Friday</small><span class="tg">Fri</span></div>
  </div>`);
  rig4.append(tasks);
  const cal = html(`<div class="panel cal"><div class="lbl">CALENDAR · THIS WEEK</div><div class="days">
    ${["Mon 28", "Tue 29", "Wed 30", "Thu 1", "Fri 2"].map((d, i) => `<div class="day${i === 3 ? " on" : ""}">${d}${i === 3 ? `<div class="ev" style="top:60px">Pricing call<small>10:00 · Eva Brunner</small></div>` : ""}</div>`).join("")}
  </div></div>`);
  const agent = html(`<div class="panel agent">
    <div class="t">${ringMark("")}<div><b>Finance agent</b><small>Working on Invoice 4821</small></div></div>
    <div class="step s0"><i>${icon.check}</i>Checked the payment run<em>done</em></div>
    <div class="step s1"><i>${icon.check}</i>Found the transfer · 12 Sep · CHF 4,820<em>done</em></div>
    <div class="step s2"><i>${icon.check}</i>Reply ready for Marc Dufour<em>done</em></div>
  </div>`);
  rig4.append(cal, agent);
  show(rig4, T.tasks - 0.05, T.morning + 0.2);
  ft(tasks, { y: -1500, rotationX: -40, opacity: 0 }, { y: 0, rotationX: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, T.tasks);
  onFrame((t) => {
    if (t < T.tasks || t > T.morning + 0.2) return;
    const u = t - T.tasks;
    rig4.style.transform = `translateZ(${u * 20}px) rotateX(${5 - u * 0.8}deg) rotateY(${-6 + u * 3}deg)`;
  });
  const tr = (k: number) => tasks.querySelector<HTMLElement>(`.r${k}`)!;
  const check = (row: HTMLElement, at: number) => {
    const i = row.querySelector<HTMLElement>(".cb i")!;
    ft(i, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" }, at);
    const a = row.querySelector<HTMLElement>("small.a");
    const b = row.querySelector<HTMLElement>("small.b");
    if (a && b) {
      onFrame((t) => {
        a.style.display = t >= at ? "none" : "block";
        b.style.display = t >= at ? "block" : "none";
      });
    }
    ft(row, { backgroundColor: "rgba(77,141,255,0)" }, { backgroundColor: "rgba(77,141,255,0.22)", duration: 0.15 }, at);
    tl.to(row, { backgroundColor: "rgba(77,141,255,0)", duration: 0.6 }, at + 0.15);
    cue("chime", at, undefined, 0.7);
  };
  [0, 1, 2, 3].forEach((k) => {
    if (k !== 0 && k !== 1) {
      const i = tr(k).querySelector<HTMLElement>(".cb i")!;
      tl.set(i, { scale: 0, opacity: 0 }, 0);
    }
  });
  check(tr(1), T.tasks + 0.45);
  ft(tr(2), { x: 700, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: "expo.out" }, T.tasks + 0.7);
  cue("whoosh", T.tasks + 0.65, 0.35, 0.6);
  show(cal, T.tasks + 0.75, T.agent + 0.4);
  ft(cal, { y: 500, opacity: 0, rotationX: 30 }, { y: 0, opacity: 1, rotationX: 0, duration: 0.5, ease: "expo.out" }, T.tasks + 0.75);
  const ev = cal.querySelector<HTMLElement>(".ev")!;
  ft(ev, { y: -260, scale: 1.4, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.6)" }, T.tasks + 1.0);
  cue("click", T.tasks + 1.3);
  tl.to(cal, { y: 400, opacity: 0, duration: 0.35, ease: "power3.in" }, T.agent - 0.05);
  show(agent, T.agent + 0.05, T.morning + 0.2);
  ft(agent, { y: 500, opacity: 0, rotationX: 30 }, { y: 0, opacity: 1, rotationX: 0, duration: 0.5, ease: "expo.out" }, T.agent + 0.1);
  agent.querySelector<SVGElement>(".t svg")!.style.cssText = "width:58px;height:58px";
  [0, 1, 2].forEach((k) => {
    const st = agent.querySelector<HTMLElement>(`.s${k}`)!;
    const at = T.agent + 0.3 + k * 0.3;
    ft(st, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, at);
    ft(st.querySelector("i"), { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(3)" }, at + 0.1);
    cue("tick", at + 0.1, undefined, 0.6);
  });
  check(tr(0), T.agent + 1.2);
  ft(tr(0).querySelector(".tg"), { opacity: 1 }, { opacity: 0, duration: 0.2 }, T.agent + 1.2);
  ft([tasks, agent], { opacity: 1, y: 0 }, { opacity: 0, y: -260, duration: 0.4, ease: "power3.in", stagger: 0.05 }, T.morning - 0.3);

  // ── the morning after ─────────────────────────────────────────────────
  const rig5 = html(`<div class="rig"></div>`);
  world.append(rig5);
  const morning = html(`<div class="morning">
    <h2>Good morning, Ziyad</h2>
    <p><b>2 things</b> need you today<i></i>ASTRYA is handling the rest</p>
    <div class="panel today"><div class="lbl">TODAY</div>
      <div class="blk"><em>10:00</em>Pricing call<small>Eva Brunner · added by ASTRYA</small></div>
      <div class="blk focus"><em>11:00</em>Focus · Q4 launch plan<small>Protected · notifications held</small></div>
      <div class="blk"><em>15:00</em>Priya · Q4<small>Allocation review</small></div>
    </div>
  </div>`);
  const handled = html(`<div class="handledx">${icon.sparkle}3 new messages handled</div>`);
  rig5.append(morning, handled);
  show(rig5, T.morning - 0.05, T.pullout + 0.05);
  const mh = splitChars(morning.querySelector<HTMLElement>("h2")!);
  ft(mh, { opacity: 0, y: 40, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.02, ease: "power3.out" }, T.morning);
  ft(morning.querySelector("p"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, T.morning + 0.3);
  ft(morning.querySelector(".today"), { opacity: 0, y: 80, rotationX: 25 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.6, ease: "expo.out" }, T.morning + 0.35);
  ft(morning.querySelectorAll(".blk"), { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.1, ease: "power3.out" }, T.morning + 0.5);
  ft(handled, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "back.out(2)" }, T.morning + 0.75);
  cue("soft", T.morning, 1.2);
  cue("chime", T.morning + 0.75, undefined, 0.6);
  onFrame((t) => {
    if (t < T.morning || t > T.pullout) return;
    const u = t - T.morning;
    rig5.style.transform = `translateZ(${u * 30}px) rotateX(${4 - u}deg) rotateY(${4 - u * 3}deg)`;
  });
  // the interface collapses into the point of light on the planet
  ft(morning, { scale: 1, opacity: 1 }, { scale: 0.02, opacity: 0, duration: 0.3, ease: "power4.in" }, T.pullout - 0.3);
  tl.to(handled, { opacity: 0, duration: 0.2 }, T.pullout - 0.3);
  flash(T.pullout, 0.9, 0.06, 0.5);
  cue("whoosh", T.pullout - 0.3, 0.5);
  cue("hit", T.pullout);

  // ── finale ───────────────────────────────────────────────────────────
  cue("sweep", T.net, 1.6);
  caption("YOUR INBOX. REIMAGINED.", T.reimagined, T.logo - 0.2, "cap big");
  const logo = html(`<div class="logo">${ringMark("")}<div class="wordmark">ASTRYA</div></div>`);
  front.append(logo);
  show(logo, T.logo - 0.05, T.end + 1);
  const svg = logo.querySelector("svg")!;
  ft(svg.querySelector(".ring-reveal"), { drawSVG: "62% 62%" }, { drawSVG: "0% 100%", duration: 1.0, ease: "cineInOut" }, T.logo);
  const glint = svg.querySelector(".ring-glint");
  ft(glint, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 1, duration: 1.0, ease: "cineInOut" }, T.logo);
  tl.to(glint, { opacity: 0, duration: 0.8 }, T.logo + 1.0);
  ft(svg, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: "cine" }, T.logo);
  const wc = splitChars(logo.querySelector<HTMLElement>(".wordmark")!);
  ft(wc, { opacity: 0, x: (i: number) => (i - 2.5) * 40, filter: "blur(16px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.05, ease: "cine" }, T.logo + 0.25);
  cue("hit", T.logo, undefined, 0.8);
  cue("chime", T.logo + 0.3);
  const tag2 = html(`<div class="tag">AI-POWERED EMAIL<br>INTELLIGENCE.</div>`);
  front.append(tag2);
  show(tag2, T.tag, T.end + 1);
  ft(tag2, { opacity: 0, y: 20, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power2.out" }, T.tag);
  cue("chime", T.tag + 0.05, undefined, 0.6);
  cue("soft", T.tag, 3);
}
