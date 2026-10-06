import { gsap } from "../core/gsap";
import { onFrame, cue, clamp, smooth, lerp, rng } from "../core/clock";
import { icon, ringMark } from "../core/icons";
import { html, splitChars, world, front, $, W, H } from "../remix/stage";
import { T } from "./timing";
import { hud, COUNTS, ROWS_Y } from "./gl";

/**
 * The DOM layer of "Astrya takes control": the storm of windows and
 * notifications, the words, the orbit labels and action chips, the organized
 * inbox, Eva's email, then the product's own screens chained by particles
 * (reply → calendar → tasks + finance agent), the calm, the logo.
 */
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eOut = (x: number) => 1 - Math.pow(1 - x, 3);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildFilm(tl: gsap.core.Timeline) {
  const show = (el: HTMLElement, a: number, b: number) =>
    onFrame((t) => {
      el.style.visibility = t >= a && t < b ? "visible" : "hidden";
    });
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
  const words = (cls: string, text: string, a: number, b: number, cut = false) => {
    const el = html(`<div class="${cls}">${text}</div>`);
    front.append(el);
    const chars = splitChars(el);
    show(el, a, b);
    ft(chars, { opacity: 0, scale: 2.2, filter: "blur(20px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, stagger: 0.03, ease: "expo.out" }, a);
    if (!cut) ft(chars, { opacity: 1, filter: "blur(0px)" }, { opacity: 0, y: -24, filter: "blur(14px)", duration: 0.3, stagger: 0.012, ease: "power2.in" }, b - 0.35);
    return { el, chars };
  };
  const splitWords = (el: HTMLElement) => {
    const ws = (el.textContent ?? "").trim().split(/\s+/);
    el.textContent = "";
    return ws.map((w) => {
      const s = document.createElement("span");
      s.className = "wd";
      s.textContent = w;
      el.appendChild(s);
      return s;
    });
  };

  // ── particles that carry one screen into the next ─────────────────────
  const pc = document.createElement("canvas");
  pc.width = W;
  pc.height = H;
  pc.className = "pcv";
  front.append(pc);
  const pg = pc.getContext("2d")!;
  type Rect = [number, number, number, number];
  const streams: Array<{ a: Rect; b: Rect; t0: number; dur: number; pts: Array<[number, number, number, number, number, number]> }> = [];
  const stream = (from: HTMLElement, a: Rect, to: HTMLElement, b: Rect, t0: number, dur: number, seed: number) => {
    const R = rng(seed);
    const pts = Array.from({ length: 1500 }, () => [R(), R(), R(), R(), (R() - 0.5) * 2, R()] as [number, number, number, number, number, number]);
    streams.push({ a, b, t0, dur, pts });
    // the source wipes away as its particles leave; the target builds as they land
    onFrame((t) => {
      const kOut = P(t, t0, t0 + dur * 0.55);
      const kIn = P(t, t0 + dur * 0.45, t0 + dur);
      if (t >= t0 - 0.01 && t <= t0 + dur + 0.01) {
        from.style.clipPath = `inset(0 0 0 ${(kOut * 100).toFixed(2)}%)`;
        to.style.clipPath = `inset(0 ${(100 - kIn * 100).toFixed(2)}% 0 0)`;
      } else if (t > t0 + dur) {
        to.style.clipPath = "none";
      } else {
        to.style.clipPath = "inset(0 100% 0 0)";
        from.style.clipPath = "none";
      }
    });
  };
  onFrame((t) => {
    pg.clearRect(0, 0, W, H);
    pg.fillStyle = "rgba(0,0,0,0.004)";
    pg.fillRect(0, 0, 1, 1);
    let any = false;
    pg.globalCompositeOperation = "lighter";
    for (const s of streams) {
      if (t < s.t0 || t > s.t0 + s.dur + 0.2) continue;
      any = true;
      for (const [sx, sy, tx, ty, curl, sz] of s.pts) {
        const d0 = s.t0 + sx * s.dur * 0.5;
        const u = clamp((t - d0) / (s.dur * 0.5));
        if (u <= 0 || u >= 1) continue;
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        const x0 = s.a[0] + sx * s.a[2];
        const y0 = s.a[1] + sy * s.a[3];
        const x1 = s.b[0] + tx * s.b[2];
        const y1 = s.b[1] + ty * s.b[3];
        const mx = (x0 + x1) / 2 + curl * 260;
        const my = (y0 + y1) / 2 - 180 + curl * 140;
        const bx = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * mx + e * e * x1;
        const by = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * my + e * e * y1;
        const a = Math.sin(u * Math.PI);
        pg.fillStyle = `rgba(${sz > 0.7 ? "230,242,255" : "120,180,255"},${(a * 0.9).toFixed(3)})`;
        const r = 1 + sz * 2.2;
        pg.fillRect(bx - r / 2, by - r / 2, r, r);
      }
    }
    pg.globalCompositeOperation = "source-over";
    pc.style.visibility = any ? "visible" : "hidden";
  });

  // ── I. the void, a first email… then the storm ────────────────────────
  cue("soft", 0.2, 2.5, 0.6);
  cue("chime", T.first, undefined, 0.8);
  cue("chime", T.second, undefined, 0.8);
  for (let i = 0; i < 10; i++) cue("tick", T.ten + i * 0.06, undefined, 0.7);
  const counter = html(`<div class="counter">INBOX<b>0</b></div>`);
  front.append(counter);
  const cb = counter.querySelector("b")!;
  onFrame((t) => {
    const on = t >= T.first && t < T.wave;
    counter.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const tc = Math.min(t, T.stop);
    const born = tc < T.second ? 1 : tc < T.ten ? 2 : tc < T.flood ? 2 + Math.min(10, Math.floor((tc - T.ten) / 0.06) + 1) : 12 + Math.floor(Math.pow(P(tc, T.flood, T.stop - 0.4), 1 / 0.55) * (COUNTS.total - 12));
    let txt = `${fmt(Math.min(COUNTS.total, born))} unread`;
    if (t > T.tooMany && t < T.stop && Math.floor(t * 30) % 5 === 0) txt = txt.replace(/\d/g, (d) => String((Number(d) * 3 + Math.floor(t * 60)) % 10));
    cb.textContent = txt;
    counter.style.opacity = (P(t, T.first, T.first + 0.4) * (1 - 0.75 * smooth(P(t, T.stop, T.stop + 0.3)))).toFixed(3);
  });
  // windows and notifications surge
  const R = rng(5);
  const popDefs: Array<[string, boolean]> = [
    [`<div class="t">${icon.hash}Sofia Marin<em>Chat · now</em></div><p>Can you send me the Q4 numbers before the board call?</p>`, false],
    [`<i>12</i>new messages`, true],
    [`<div class="t">${icon.calendar}Northline kickoff<em>Meeting</em></div><p>Thursday 14:30 · Missed</p>`, false],
    [`<i>!</i>Invoice 4821 · Overdue`, true],
    [`<div class="t">${icon.file}Q4 allocation.xlsx<em>Requested</em></div><p>For Priya Shah · Needed by Friday</p>`, false],
    [`<i>3</i>Reminders`, true],
    [`<div class="t">${icon.mail}Priya Shah<em>now</em></div><p>Re: Q4 budget — final numbers?</p>`, false],
    [`<i>48</i>unread in Operations`, true],
    [`<div class="t">${icon.truck}Nina Kovacs<em>Atlas Freight</em></div><p>Shipment AT-8891 delayed — new ETA Friday</p>`, false],
    [`<i>5</i>mentions`, true],
    [`<div class="t">${icon.doc}Helena Krug<em>Lumen Labs</em></div><p>NDA — signature needed</p>`, false],
    [`<i>!</i>Contract expires Friday`, true],
    [`<div class="t">${icon.bell}Reminder<em>today</em></div><p>Timesheet due tomorrow</p>`, false],
    [`<i>21</i>newsletters`, true],
    [`<div class="t">${icon.mail}Claire Osman<em>Northline</em></div><p>Proposal v3 — waiting on your board</p>`, false],
    [`<i>7</i>calendar invites`, true],
    [`<div class="t">${icon.finance}Silo Pay<em>Payments</em></div><p>Payment received — INV-4820</p>`, false],
    [`<i>99+</i>unread`, true],
    [`<div class="t">${icon.mail}Jonas Frei<em>Clearwater Bank</em></div><p>Updated bank details</p>`, false],
    [`<i>!</i>Reply needed · 14 threads`, true],
    [`<div class="t">${icon.mail}Marc Dufour<em>Silo Logistics</em></div><p>Invoice 4821 — payment status</p>`, false],
    [`<i>32</i>notifications`, true],
    [`<div class="t">${icon.calendar}Board prep<em>Wed</em></div><p>Conflicts with 2 events</p>`, false],
    [`<i>!</i>Storage almost full`, true],
  ];
  const pops = popDefs.map(([m, isPill], i) => {
    const el = html(`<div class="${isPill ? "npill" : "pop"}">${m}</div>`);
    front.append(el);
    const at = T.flood + 0.3 + Math.pow(i / popDefs.length, 0.7) * (T.stop - 0.25 - T.flood - 0.3);
    const x = 60 + R() * (W - 520);
    const y = 150 + R() * (H - 300);
    const rot = (R() - 0.5) * 10;
    const dx = (R() - 0.5) * 120;
    const dy = (R() - 0.5) * 80;
    const dist = Math.hypot(x + 200 - W / 2, y + 40 - H / 2);
    const hit = T.wave + (dist / 1100) * 0.7;
    show(el, at, hit + 0.35);
    ft(el, { opacity: 0, scale: 0.4, rotation: rot * 3 }, { opacity: 1, scale: 1, rotation: rot, duration: 0.3, ease: "back.out(2.4)" }, at);
    onFrame((t) => {
      if (t < at || t > hit + 0.4) return;
      const tc = Math.min(t, T.stop) - at;
      const jit = smooth(P(Math.min(t, T.stop), T.tooMany, T.stop)) * 6;
      const r = rng(Math.floor(Math.min(t, T.stop) * 60) + i * 7);
      el.style.left = `${x + dx * tc * 0.3 + (r() - 0.5) * jit}px`;
      el.style.top = `${y + dy * tc * 0.3 + (r() - 0.5) * jit}px`;
      el.style.zIndex = String(10 + i);
      // frozen, dimmed; then the wave scans each one and it dissolves
      const dim = smooth(P(t, T.stop, T.stop + 0.3));
      const k = P(t, hit, hit + 0.35);
      el.style.filter = t >= hit ? `brightness(${(1 + 2.5 * (1 - k)).toFixed(2)}) blur(${(k * 10).toFixed(1)}px)` : "none";
      el.style.opacity = (Math.min(1, P(t, at, at + 0.15) * 2) * (1 - 0.8 * dim) * (1 - k)).toFixed(3);
    });
    cue(isPill ? "tick" : "click", at, undefined, 0.45 + (i / popDefs.length) * 0.5);
  });
  void pops;
  words("slam", "TOO MUCH.", T.tooMuch, T.tooMuch + 1.35);
  cue("hit", T.tooMuch, undefined, 0.9);
  const tm = words("slam m", "TOO MANY EMAILS.", T.tooMany, T.stop, true);
  onFrame((t) => {
    if (t < T.tooMany || t > T.stop) return;
    const amp = 2 + smooth(P(t, T.tooMany + 0.5, T.stop)) * 14;
    const r = rng(Math.floor(t * 60));
    tm.el.style.transform = `translate(${(r() - 0.5) * amp}px, ${(r() - 0.5) * amp * 0.5}px)`;
    tm.el.style.textShadow = `${(r() - 0.5) * amp * 1.5}px 0 rgba(90,220,255,0.8), ${(r() - 0.5) * amp * 1.5}px 0 rgba(47,90,255,0.8), 0 0 40px rgba(90,150,255,0.85), 0 0 140px rgba(47,107,255,0.6)`;
  });
  cue("hit", T.tooMany, undefined, 1.0);
  cue("riser", T.tooMany + 0.2, T.stop - T.tooMany - 0.2, 1.3);
  // STOP. Then a light; then the ring; then the wave.
  cue("soft", T.light, 0.8, 0.4);
  cue("chime", T.logo + 0.1, undefined, 0.9);
  const q = html(`<div class="quiet">LET ASTRYA HANDLE IT.</div>`);
  front.append(q);
  show(q, T.handle, T.wave + 0.3);
  ft(q, { opacity: 0, letterSpacing: "0.7em" }, { opacity: 1, letterSpacing: "0.42em", duration: 0.8, ease: "power2.out" }, T.handle);
  tl.to(q, { opacity: 0, duration: 0.25 }, T.wave - 0.1);
  flash(T.wave, 0.85, 0.05, 0.6);
  cue("hit", T.wave, undefined, 1.6);
  cue("sweep", T.wave + 0.05, 1.4, 1.2);

  // ── II. understand → organize → act ───────────────────────────────────
  words("beat", "UNDERSTAND.", T.understand + 0.15, T.organize - 0.1);
  words("beat", "ORGANIZE.", T.organize + 0.15, T.act - 0.1);
  words("beat", "ACT.", T.act + 0.15, T.inbox - 0.15);
  cue("hit", T.understand + 0.15, undefined, 0.6);
  cue("hit", T.organize + 0.15, undefined, 0.7);
  cue("hit", T.act + 0.15, undefined, 0.8);
  cue("riser", T.understand + 0.3, 2.0, 0.6);
  cue("sweep", T.organize + 0.2, 1.6);
  const labels = [
    ["PRIORITY", "3"],
    ["NEEDS A REPLY", fmt(COUNTS.reply)],
    ["CAN WAIT", fmt(COUNTS.wait)],
  ].map(([n, c]) => {
    const el = html(`<div class="olab">${n}<em>${c}</em></div>`);
    front.append(el);
    return el;
  });
  onFrame((t) => {
    labels.forEach((el, k) => {
      const a = T.organize + 0.8 + k * 0.15;
      const vis = t >= a && t < T.act + 1.0 && hud.rings[k] && hud.rings[k].z < 1;
      el.style.visibility = vis ? "visible" : "hidden";
      if (!vis) return;
      el.style.left = `${Math.min(W - 380, hud.rings[k].x)}px`;
      el.style.top = `${hud.rings[k].y}px`;
      el.style.opacity = (eOut(P(t, a, a + 0.3)) * (1 - P(t, T.act + 0.6, T.act + 1.0))).toFixed(3);
    });
  });
  const cleared = html(`<div class="cleared"></div>`);
  front.append(cleared);
  show(cleared, T.organize + 0.4, T.act + 0.9);
  onFrame((t) => {
    if (t < T.organize + 0.4 || t > T.act + 0.9) return;
    cleared.textContent = `${fmt(COUNTS.noise * smooth(P(t, T.organize + 0.4, T.organize + 2.0)))} NEWSLETTERS & NOTIFICATIONS CLEARED`;
    cleared.style.opacity = (P(t, T.organize + 0.4, T.organize + 0.7) * (1 - P(t, T.act + 0.6, T.act + 0.9))).toFixed(3);
  });
  // actions, on the cards themselves (what Astrya actually does)
  const acts = [
    [icon.reply, "Reply prepared"],
    [icon.finance, "Finance agent · on it"],
    [icon.tasks, "Task · due Friday"],
    [icon.sparkle, "Draft ready · Q4 numbers"],
  ].map(([ic, l]) => {
    const el = html(`<div class="achip">${ic}${l}</div>`);
    front.append(el);
    return el;
  });
  onFrame((t) => {
    acts.forEach((el, k) => {
      const a = T.act + 0.25 + k * 0.12;
      const c = hud.cards[k];
      const vis = t >= a && t < T.act + 1.1 && c && c.z < 1 && c.on > 0.2;
      el.style.visibility = vis ? "visible" : "hidden";
      if (!vis) return;
      const k2 = eOut(P(t, a, a + 0.25));
      el.style.left = `${c.x}px`;
      el.style.top = `${c.y - 70}px`;
      el.style.opacity = (k2 * (1 - P(t, T.act + 0.8, T.act + 1.1))).toFixed(3);
      el.style.transform = `translate(-50%, -100%) scale(${lerp(0.5, 1, k2)})`;
    });
  });
  acts.forEach((_, k) => cue("chime", T.act + 0.25 + k * 0.12, undefined, 0.5));
  cue("whoosh", T.act + 0.7, 1.0, 1.0);

  // ── III. the organized inbox; into Eva's email ────────────────────────
  const rig = html(`<div class="rig"></div>`);
  world.append(rig);
  const rows = [
    ["EB", "Eva Brunner", "Alpine Supplies", "Contract renewal — confirmation needed", "09:12", "Due Friday"],
    ["MD", "Marc Dufour", "Silo Logistics", "Invoice 4821 — payment status", "09:15", "Overdue"],
    ["NK", "Nina Kovacs", "Atlas Freight", "Shipment AT-8891 delayed", "09:16", ""],
  ];
  const inbox = html(`<div class="panel inbox">
    <div class="hd"><h3>Inbox</h3><span class="unr">3 need you</span><span class="sortedby">${icon.sparkle}Sorted by ASTRYA</span></div>
    ${rows
      .map(([a, b, c, d, e, f], i) => `<div class="mrow${i === 0 ? " top" : ""}" style="top:${ROWS_Y[i] - 110 - 54}px"><span class="av">${a}</span><div class="who">${b}<span>${c}</span></div><div class="sub">${d}</div><span class="tm">${e}</span>${f ? `<span class="chp">${f}</span>` : ""}</div>`)
      .join("")}
    <div class="grp" style="top:${ROWS_Y[3] - 110 - 50}px">${icon.reply}<b>Replies prepared by ASTRYA</b> · ${fmt(COUNTS.reply)} ready to approve</div>
    <div class="grp" style="top:${ROWS_Y[4] - 110 - 50}px"><span class="stack"><i>JF</i><i>SP</i><i>AF</i><i>MC</i><i>HL</i></span><b>Can wait</b> · ${fmt(COUNTS.wait)} messages</div>
    <div class="foot">${fmt(COUNTS.noise)} newsletters &amp; notifications cleared</div>
  </div>`);
  rig.append(inbox);
  show(rig, T.inbox - 0.15, T.detail + 0.1);
  ft(inbox, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, T.inbox - 0.12);
  ft(inbox.querySelectorAll(".hd > *, .foot"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power3.out" }, T.inbox + 0.05);
  cue("chime", T.inbox, undefined, 0.8);
  cue("soft", T.inbox, 1.0, 0.6);
  inbox.style.transformOrigin = `400px ${ROWS_Y[0] - 110}px`;
  tl.to(inbox, { scale: 9, opacity: 0, duration: 0.55, ease: "power3.in" }, T.into);
  cue("whoosh", T.into, 0.55, 1.0);
  const mail = html(`<div class="panel mail">
    <div class="crumb">Inbox › Operations</div>
    <h2>Contract renewal — confirmation needed</h2>
    <div class="from"><span class="av">EB</span><b>Eva Brunner</b><small>eva.brunner@alpinesupplies.ch</small><span class="when">Today 09:12</span></div>
    <div class="body">Hi Ziyad,<br>Following up: the current contract <span class="k">expires Friday</span>.<br><span class="k">Please confirm renewal</span> so we can lock Q4 allocation.<br>Without confirmation we cannot hold the Geneva warehouse slot.</div>
    <span class="due">Due Fri · 4 days</span>
  </div>`);
  world.append(mail);
  show(mail, T.into + 0.3, T.galaxy + 0.15);
  ft(mail, { scale: 0.16, y: ROWS_Y[0] - 540, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, T.into + 0.35);
  [...mail.querySelectorAll<HTMLElement>(".k")].forEach((k, i) => {
    const at = T.detail + 0.2 + i * 0.18;
    onFrame((t) => k.classList.toggle("hit", t >= at));
    cue("tick", at, undefined, 0.7);
  });
  ft(mail.querySelector(".due"), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)" }, T.detail + 0.6);
  // the DOM email hands over to its 3D twin; the pull-back begins
  tl.to(mail, { opacity: 0, duration: 0.15 }, T.galaxy);
  cue("soft", T.galaxy, 2.0, 0.6);
  cue("riser", T.galaxy + 0.3, T.orbit - T.galaxy - 0.3, 1.0);
  cue("sweep", T.lines, 1.4, 1.0);
  cue("whoosh", T.orbit, 1.6, 0.9);
  cue("riser", T.dive - 0.4, T.app - T.dive + 0.4, 1.3);
  flash(T.app, 1, 0.1, 0.6);
  cue("hit", T.app, undefined, 1.4);

  // ── IV. inside: reply → calendar → tasks, carried by particles ────────
  const rig2 = html(`<div class="rig"></div>`);
  world.append(rig2);
  const replyText = "Hi Eva, We confirm the renewal of the 2026–27 agreement. Please hold the Geneva warehouse slot — the signed copy follows today. Best regards, Ziyad";
  const reply = html(`<div class="panel reply">
    <div class="to"><span class="av">EB</span><b>Reply to Eva Brunner</b><small>Contract renewal — confirmation needed</small></div>
    <span class="prep">${icon.sparkle}PREPARED BY ASTRYA</span>
    <div class="rbox">${replyText}</div>
    <div class="acts"><span class="btnx ghost">Edit</span><span class="btnx apv">Approve &amp; send</span></div>
  </div>`);
  const hours = ["08:00", "10:00", "12:00", "14:00", "16:00"];
  const cal = html(`<div class="panel calw">
    <div class="hd2">${icon.calendar}This week<span>Sep 28 – Oct 2</span></div>
    <div class="hours">${hours.map((h, i) => `<div style="top:${i * 130}px">${h}</div>`).join("")}</div>
    <div class="grid">
      ${[
        ["Mon", "28", [["Team standup", "08:30", 30]]],
        ["Tue", "29", [["Q4 budget review", "11:00", 230]]],
        ["Wed", "30", [["Board prep", "14:00", 400]]],
        ["Thu", "1", [["Northline kickoff", "14:30", 430]]],
        ["Fri", "2", [["Ops weekly", "09:00", 70]]],
      ]
        .map(
          ([d, n, evs], i) =>
            `<div class="col${i === 3 ? " on" : ""}"><div class="dn">${d} <b>${n}</b></div>${(evs as Array<[string, string, number]>).map(([a, b, y]) => `<div class="cev" style="top:${y}px;height:84px">${a}<small>${b}</small></div>`).join("")}${i === 3 ? `<div class="cev new" style="top:140px;height:100px">Pricing call<small>10:00 · Eva Brunner · added by ASTRYA</small></div>` : ""}</div>`,
        )
        .join("")}
    </div>
  </div>`);
  const tasks = html(`<div class="panel tasks"><h3>Tasks</h3>
    <div class="trow r0"><span class="cb"><i>${icon.check}</i></span><b>Invoice 4821 — payment status</b><small class="a">Marc Dufour · due 30 Sep</small><small class="b ok">Resolved by Finance agent · paid 12 Sep</small><span class="tg">Overdue</span></div>
    <div class="trow r1"><span class="cb"><i>${icon.check}</i></span><b>Confirm renewal — Alpine Supplies</b><small class="a">Eva Brunner · due Friday</small><small class="b ok">Done · replied 09:14</small></div>
    <div class="trow r2"><span class="cb"><i>${icon.check}</i></span><b>Pricing call with Eva Brunner</b><small class="a">Thursday · 10:00</small></div>
    <div class="trow r3"><span class="cb"><i>${icon.check}</i></span><b>Q4 allocation for Priya</b><small class="a">Due Friday</small><span class="tg">Fri</span></div>
  </div>`);
  const agent = html(`<div class="panel agent">
    <div class="t">${ringMark("")}<div><b>Finance agent</b><small>Working on Invoice 4821</small></div></div>
    <div class="step s0"><i>${icon.check}</i>Checked the payment run<em>done</em></div>
    <div class="step s1"><i>${icon.check}</i>Found the transfer · 12 Sep · CHF 4,820<em>done</em></div>
    <div class="step s2"><i>${icon.check}</i>Reply ready for Marc Dufour<em>done</em></div>
  </div>`);
  rig2.append(reply, cal, tasks, agent);
  show(rig2, T.app - 0.05, T.calm + 0.6);
  onFrame((t) => {
    if (t < T.app || t > T.calm + 0.6) return;
    const u = t - T.app;
    rig2.style.transform = `translateZ(${Math.sin(u * 0.5) * 50}px) rotateX(${5 + Math.sin(u * 0.45) * 3}deg) rotateY(${Math.sin(u * 0.33 + 0.4) * 9}deg)`;
  });
  // the reply, out of the light
  show(reply, T.app - 0.05, T.cal + 0.7);
  ft(reply, { scale: 1.6, z: 500, opacity: 0 }, { scale: 1, z: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, T.app);
  const wds = splitWords(reply.querySelector<HTMLElement>(".rbox")!);
  const r0 = T.app + 0.4;
  const rate = (T.approve - 0.35 - r0) / wds.length;
  wds.forEach((w, i) => {
    const at = r0 + i * rate;
    ft(w, { opacity: 0, y: 8, color: "#7fe0ff", textShadow: "0 0 18px rgba(127,224,255,1)" }, { opacity: 1, y: 0, color: "#eef3ff", textShadow: "0 0 0px rgba(127,224,255,0)", duration: 0.3, ease: "power2.out" }, at);
    if (i % 2 === 0) cue("tick", at, undefined, 0.35);
  });
  const apv = reply.querySelector<HTMLElement>(".apv")!;
  ft(apv, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.in" }, T.approve - 0.1);
  tl.to(apv, { scale: 1.08, duration: 0.12, ease: "power2.out" }, T.approve - 0.02);
  cue("click", T.approve - 0.08);
  // reply → particles → the week, the call lands on Thursday
  show(cal, T.cal - 0.05, T.tasks + 0.75);
  stream(reply, [460, 190, 1000, 660], cal, [330, 150, 1260, 740], T.cal, 1.0, 11);
  cue("whoosh", T.cal, 1.0, 0.9);
  cue("sweep", T.cal + 0.3, 0.8, 0.7);
  const nev = cal.querySelector<HTMLElement>(".cev.new")!;
  ft(nev, { y: -300, scale: 1.5, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, T.cal + 1.05);
  cue("hit", T.cal + 1.5, undefined, 0.5);
  cue("chime", T.cal + 1.5, undefined, 0.7);
  // the week → particles → the tasks
  show(tasks, T.tasks - 0.05, T.calm + 0.6);
  stream(cal, [330, 150, 1260, 740], tasks, [240, 190, 880, 700], T.tasks, 0.9, 12);
  cue("whoosh", T.tasks, 0.9, 0.9);
  const check = (row: HTMLElement, at: number) => {
    const i = row.querySelector<HTMLElement>(".cb i")!;
    ft(i, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(3)" }, at);
    const a = row.querySelector<HTMLElement>("small.a");
    const b = row.querySelector<HTMLElement>("small.b");
    if (a && b)
      onFrame((t) => {
        a.style.display = t >= at ? "none" : "block";
        b.style.display = t >= at ? "block" : "none";
      });
    cue("chime", at, undefined, 0.7);
  };
  const tr = (k: number) => tasks.querySelector<HTMLElement>(`.r${k}`)!;
  [2, 3].forEach((k) => tl.set(tr(k).querySelector(".cb i"), { scale: 0, opacity: 0 }, 0));
  check(tr(1), T.tasks + 0.85);
  ft(tr(2), { backgroundColor: "rgba(77,141,255,0.25)" }, { backgroundColor: "rgba(77,141,255,0)", duration: 0.8 }, T.tasks + 1.0);
  show(agent, T.agent - 0.05, T.calm + 0.6);
  ft(agent, { x: 600, rotationY: -50, opacity: 0, z: 0 }, { x: 0, rotationY: -12, opacity: 1, z: 80, duration: 0.6, ease: "expo.out" }, T.agent);
  cue("whoosh", T.agent - 0.05, 0.5, 0.7);
  [0, 1, 2].forEach((k) => {
    const st = agent.querySelector<HTMLElement>(`.s${k}`)!;
    const at = T.agent + 0.35 + k * 0.32;
    ft(st, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, at);
    ft(st.querySelector("i"), { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(3)" }, at + 0.1);
    cue("tick", at + 0.1, undefined, 0.6);
  });
  check(tr(0), T.agent + 1.4);
  ft(tr(0).querySelector(".tg"), { opacity: 1 }, { opacity: 0, duration: 0.2 }, T.agent + 1.4);

  // ── V. calm ──────────────────────────────────────────────────────────
  // the working screens glide back into the depth; the morning comes forward
  tl.to([tasks, agent], { z: -900, opacity: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.06 }, T.calm - 0.3);
  const rig3 = html(`<div class="rig"></div>`);
  world.append(rig3);
  const morning = html(`<div class="morning">
    <h2>Good morning, Ziyad</h2>
    <p><b>2 things</b> need you today<i></i>ASTRYA is handling the rest</p>
    <div class="panel today"><div class="lbl">TODAY</div>
      <div class="blk" style="left:26px;width:190px">Pricing call<small>10:00 · Eva Brunner</small></div>
      <div class="blk focus" style="left:232px;width:380px">Focus · Q4 launch plan<small>11:00 – 13:00 · protected</small></div>
      <div class="blk" style="left:628px;width:220px">Priya · Q4<small>15:00</small></div>
    </div>
  </div>`);
  const doc = html(`<div class="panel doc"><div class="lbl">DRAFT</div><h4>Q4 Launch Plan</h4>
    <p>Northline opens in Geneva, Zurich and Milan. The first market proves the model; the next two scale it.</p>
    <p>Launch the first market by March, with the whole team on it.</p></div>`);
  const handled = html(`<div class="handledx">${icon.sparkle}3 new messages handled</div>`);
  rig3.append(morning, doc, handled);
  show(rig3, T.calm - 0.1, T.end_logo + 0.2);
  ft(morning, { opacity: 0, z: -300, x: -60 }, { opacity: 1, z: 0, x: 0, duration: 1.2, ease: "power3.out" }, T.calm);
  ft(morning.querySelector(".today"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, T.calm + 0.35);
  ft(doc, { opacity: 0, z: -500, rotationY: -30 }, { opacity: 0.92, z: -120, rotationY: -16, duration: 1.4, ease: "power3.out" }, T.calm + 0.25);
  ft(handled, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, T.calm + 1.1);
  cue("soft", T.calm, 2.0, 0.6);
  cue("chime", T.calm + 1.1, undefined, 0.5);
  onFrame((t) => {
    if (t < T.calm - 0.1 || t > T.end_logo + 0.2) return;
    const u = t - T.calm;
    const k = smooth(P(t, T.recede, T.end_logo));
    rig3.style.transform = `translateZ(${lerp(u * 12, -1400, k)}px) rotateX(${3 - u * 0.4}deg) rotateY(${6 - u * 1.2}deg)`;
    rig3.style.opacity = (1 - smooth(P(t, T.recede + 0.3, T.end_logo))).toFixed(3);
  });

  // ── VI. the logo, in the blue ─────────────────────────────────────────
  const logo = html(`<div class="logo">${ringMark("")}<div class="wordmark">ASTRYA</div></div>`);
  front.append(logo);
  show(logo, T.end_logo - 0.05, T.end + 1);
  const svg = logo.querySelector("svg")!;
  ft(svg.querySelector(".ring-reveal"), { drawSVG: "62% 62%" }, { drawSVG: "0% 100%", duration: 1.4, ease: "cineInOut" }, T.end_logo);
  const glint = svg.querySelector(".ring-glint");
  ft(glint, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 1, duration: 1.4, ease: "cineInOut" }, T.end_logo);
  tl.to(glint, { opacity: 0, duration: 1.0 }, T.end_logo + 1.4);
  ft(svg, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: "cine" }, T.end_logo);
  const wc = splitChars(logo.querySelector<HTMLElement>(".wordmark")!);
  ft(wc, { opacity: 0, x: (i: number) => (i - 2.5) * 30, filter: "blur(14px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 1.2, stagger: 0.06, ease: "cine" }, T.end_logo + 0.4);
  const tagline = html(`<div class="tagline">AI-POWERED EMAIL INTELLIGENCE.</div>`);
  front.append(tagline);
  show(tagline, T.tag, T.end + 1);
  ft(tagline, { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.36em", duration: 1.4, ease: "power2.out" }, T.tag);
  cue("soft", T.end_logo, 3.0, 0.8);
  cue("chime", T.end_logo + 0.5, undefined, 0.7);
  cue("chime", T.tag + 0.1, undefined, 0.5);
}
