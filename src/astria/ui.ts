import { gsap } from "../core/gsap";
import { onFrame, cue, clamp, smooth, lerp, rng } from "../core/clock";
import { icon, ringMark } from "../core/icons";
import { html, splitChars, world, front, $ } from "../remix/stage";
import { T } from "./timing";
import { hud, LANES } from "./gl";

/**
 * The DOM layer: HUD over the planet, the Astria interface (glass), the AI
 * made visible (scan, extracted data, decision, filing, generated reply,
 * automation), the words of the film, the dashboard and the final card.
 * Everything is placed on the master timeline or computed from t.
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

  // ── HUD: the signal is spotted, then tracked down to the city ──────────
  const ret = html(`<div class="reticle"><svg viewBox="-80 -80 160 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
      <path d="M-70 -40V-70H-40M40 -70H70V-40M70 40V70H40M-40 70H-70V40"/>
      <circle r="46" stroke-width="1.5" stroke-dasharray="4 8" class="spin"/>
      <path d="M0 -58V-50M0 50V58M-58 0H-50M50 0H58" stroke-width="2"/></svg></div>`);
  const tag = html(`<div class="hudtag"><i></i>INCOMING SIGNAL <b>· 1 NEW MESSAGE</b></div>`);
  const alt = html(`<div class="alt"></div>`);
  front.append(ret, tag, alt);
  const spin = ret.querySelector<SVGElement>(".spin")!;
  onFrame((t) => {
    const intro = t >= T.notice && t < T.atmos;
    const city = t >= T.city + 0.15 && t < T.flash;
    if (!(intro || city) || !hud.on) {
      ret.style.visibility = tag.style.visibility = "hidden";
    } else {
      ret.style.visibility = tag.style.visibility = "visible";
      let s: number;
      let o: number;
      let rot: number;
      if (intro) {
        const lock = eOut(P(t, T.notice, T.notice + 0.45));
        s = lerp(2.4, 0.8, lock) * (1 + eIn(P(t, T.dive, T.atmos)) * 3.5);
        o = lock * (1 - P(t, T.atmos - 0.35, T.atmos));
        rot = lerp(45, 0, lock);
      } else {
        const lock = eOut(P(t, T.city + 0.15, T.city + 0.5));
        s = lerp(2, 0.9, lock) * (1 + eIn(P(t, T.city + 0.6, T.flash)) * 2.5);
        o = lock * (1 - P(t, T.flash - 0.25, T.flash));
        rot = lerp(-45, 0, lock);
      }
      ret.style.transform = `translate3d(${hud.x}px, ${hud.y}px, 0) rotate(${rot}deg) scale(${s})`;
      ret.style.opacity = o.toFixed(3);
      spin.style.transform = `rotate(${t * 90}deg)`;
      const blink = intro ? (Math.floor((t - T.notice) * 6) % 2 === 0 || t > T.notice + 0.5 ? 1 : 0.2) : 1;
      tag.style.transform = `translate3d(${hud.x + 100 * s}px, ${hud.y - 12}px, 0)`;
      tag.style.opacity = (o * blink * (intro ? 1 - P(t, T.dive, T.dive + 0.3) : 1)).toFixed(3);
      tag.innerHTML = intro ? `<i></i>INCOMING SIGNAL <b>· 1 NEW MESSAGE</b>` : `<i></i>TARGET LOCKED <b>· LUKA · ALPINE SUPPLIES</b>`;
    }
    // altitude, from orbit to the rooftops
    if (t >= T.dive && t < T.flash) {
      alt.style.visibility = "visible";
      let km: string;
      let v: string;
      if (t < T.city) {
        const h = lerp(412, 2.4, eIn(P(t, T.dive, T.city)) * 0.6 + P(t, T.dive, T.city) * 0.4);
        km = h > 10 ? `${fmt(h)} km` : `${h.toFixed(1)} km`;
        v = `${fmt(lerp(7.6, 3.1, P(t, T.dive, T.city)) * 3600)} km/h`;
      } else {
        km = `${fmt(lerp(2400, 140, eOut(P(t, T.city, T.flash))))} m`;
        v = `${fmt(lerp(900, 420, P(t, T.city, T.flash)))} km/h`;
      }
      alt.innerHTML = `ALT   <b>${km}</b>\nVEL   ${v}\nLOCK  ASTRYA://inbox/0001`;
      alt.style.opacity = (P(t, T.dive, T.dive + 0.2) * (1 - P(t, T.flash - 0.15, T.flash))).toFixed(3);
    } else alt.style.visibility = "hidden";
  });
  // speed: streaks of light rushing past the camera
  const sc = document.createElement("canvas");
  sc.width = 1920;
  sc.height = 1080;
  sc.className = "abs";
  front.append(sc);
  const sg = sc.getContext("2d")!;
  const RS = rng(77);
  const lines = Array.from({ length: 260 }, () => ({ a: RS() * Math.PI * 2, ph: RS(), rate: 0.8 + RS() * 1.6, w: 0.6 + RS() * 2.2, l: 0.15 + RS() * 0.5 }));
  onFrame((t) => {
    const dive = smooth(P(t, T.dive + 0.25, T.atmos)) * (1 - smooth(P(t, T.city - 0.1, T.city + 0.25)));
    const city = 0.35 * smooth(P(t, T.city + 0.6, T.flash)) * (t < T.flash ? 1 : 0);
    const tun = smooth(P(t, T.tunnel + 0.3, T.dash - 0.1)) * (t < T.dash ? 1 : 0);
    const k = Math.max(dive, city, tun);
    sg.clearRect(0, 0, 1920, 1080);
    sg.fillStyle = "rgba(0,0,0,0.004)";
    sg.fillRect(0, 0, 1, 1);
    sc.style.visibility = k > 0.001 ? "visible" : "hidden";
    if (k <= 0.001) return;
    const cx = dive > city && dive > tun && hud.on ? hud.x : 960;
    const cy = dive > city && dive > tun && hud.on ? hud.y : 540;
    sg.globalCompositeOperation = "lighter";
    sg.lineCap = "round";
    for (const ln of lines) {
      const ph = (ln.ph + t * ln.rate * (0.6 + k * 1.8)) % 1;
      const r = 40 + ph * ph * 1500;
      const len = r * ln.l * (0.4 + k);
      const x0 = cx + Math.cos(ln.a) * r;
      const y0 = cy + Math.sin(ln.a) * r;
      const x1 = cx + Math.cos(ln.a) * (r + len);
      const y1 = cy + Math.sin(ln.a) * (r + len);
      const gr = sg.createLinearGradient(x0, y0, x1, y1);
      const o = k * ph * 0.85;
      gr.addColorStop(0, "rgba(120,180,255,0)");
      gr.addColorStop(1, `rgba(215,236,255,${o.toFixed(3)})`);
      sg.strokeStyle = gr;
      sg.lineWidth = ln.w * (0.6 + ph * 1.6);
      sg.beginPath();
      sg.moveTo(x0, y0);
      sg.lineTo(x1, y1);
      sg.stroke();
    }
    sg.globalCompositeOperation = "source-over";
  });

  cue("soft", T.planet, 3);
  cue("chime", T.signal);
  cue("tick", T.notice);
  cue("tick", T.notice + 0.12);
  cue("riser", T.notice + 0.2, T.dive - T.notice);
  cue("whoosh", T.dive, 0.9);
  cue("sweep", T.atmos, 0.6);
  cue("whoosh", T.city, 1.2);
  cue("riser", T.city + 0.2, T.flash - T.city - 0.2);
  cue("hit", T.flash);
  cue("sweep", T.burst + 0.05, 0.7);
  flash(T.burst + 0.22, 0.55, 0.05, 0.35);
  cue("hit", T.burst + 0.2, undefined, 0.8);
  cue("soft", T.form);

  // ── the interface ──────────────────────────────────────────────────────
  const rig = html(`<div class="rig"></div>`);
  world.append(rig);
  const app = html(`<div class="app glass">
    <div class="sb">
      <div class="brand">${ringMark("")}ASTRYA</div>
      <div class="nav on">${icon.mail}Inbox<em>2,184</em></div>
      <div class="nav">${icon.alert}Priority<em>7</em></div>
      <div class="nav">${icon.reply}Replies<em>12</em></div>
      <div class="nav">${icon.calendar}Calendar</div>
      <div class="nav">${icon.finance}Finance</div>
      <div class="nav">${icon.sparkle}Automations</div>
    </div>
    <div class="hd"><h3>Inbox</h3><div class="search">${icon.sparkle}Search or ask Astrya…</div><div class="live"><i></i>Astrya is watching · live</div></div>
    <div class="rows">
      ${[
        ["Z", "Ziyad · Ops", "Shipment AT-8891 delayed — new ETA"],
        ["SP", "Silo Pay", "Payment received — INV-4820"],
        ["HL", "Helios Legal", "September legal brief"],
        ["NR", "Northline", "Product newsletter — October"],
        ["M", "Mara · Design", "Deck review before Thursday?"],
        ["AF", "Atlas Freight", "Tracking update for your order"],
      ]
        .map(([a, b, c]) => `<div class="row"><span class="av">${a}</span><b>${b}</b><span>${c}</span></div>`)
        .join("")}
    </div>
  </div>`);
  rig.append(app);
  const trays = [
    ["PRIORITY", 7, "#ffffff"],
    ["REPLIES", 12, "#5ae6ff"],
    ["FINANCE", 24, "#8c9aff"],
    ["LATER", 31, "#6f8fd9"],
  ].map(([name, n, c], i) => {
    const el = html(`<div class="tray" style="top:${140 + i * 160}px;--c:${c}"><div class="tt"><i></i>${name}</div><div class="n">${n}</div><div class="gl"></div></div>`);
    app.append(el);
    return { el, n: el.querySelector<HTMLElement>(".n")!, gl: el.querySelector<HTMLElement>(".gl")!, base: n as number };
  });
  const bumps: number[][] = trays.map(() => []);
  onFrame((t) => trays.forEach((tr, k) => (tr.n.textContent = String(tr.base + bumps[k].filter((a) => t >= a).length))));
  const bump = (k: number, at: number) => {
    bumps[k].push(at);
    ft(trays[k].gl, { opacity: 1 }, { opacity: 0, duration: 0.8, ease: "power2.out" }, at, false);
    ft(trays[k].el, { scale: 1.06 }, { scale: 1, duration: 0.5, ease: "power3.out" }, at, false);
    cue("chime", at, undefined, 0.6);
  };
  show(rig, T.form + 0.3, T.wow + 0.3);
  ft(app, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, T.form + 0.4);
  const inner = [...app.querySelectorAll<HTMLElement>(".nav, .hd > *, .row, .tray .tt, .tray .n, .brand")];
  ft(inner, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.012, ease: "power2.out" }, T.form + 0.55);
  ft(app.querySelector(".rows"), { opacity: 1 }, { opacity: 0.22, duration: 0.5 }, T.mail + 0.1);
  // the camera floats around the interface
  onFrame((t) => {
    if (t < T.form || t > T.wow + 0.3) return;
    const k = smooth(P(t, T.ui, T.ui + 1.2));
    const u = t - T.ui;
    const rx = (4 + Math.sin(u * 0.45) * 2.5) * k;
    const ry = (Math.sin(u * 0.33 + 0.6) * 6 - 2) * k;
    const z = lerp(0, 40, k) + Math.sin(u * 0.5) * 30 * k;
    rig.style.transform = `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });

  // ── demo 1: a mail arrives, is seen, understood, decided, filed ────────
  const mail = html(`<div class="mailc">
    <div class="from"><span class="av">L</span>Luka <span>· Alpine Supplies</span><small>09:41</small></div>
    <h4>Contract <span class="k">renewal</span> — can we confirm?</h4>
    <p>Hi Ziyad, our <span class="k">contract</span> ends this month. Can you confirm the
    <span class="k">renewal (CHF 48k)</span> by <span class="k">Friday 18:00</span>? <span class="k">Happy</span> to keep working together.</p>
    <div class="holo"></div><div class="scanwash"></div><div class="scan"></div>
  </div>`);
  app.append(mail);
  show(mail, T.mail, T.file + 0.5);
  ft(mail, { x: 420, y: -260, z: -2600, rotationY: -55, rotationX: 25, opacity: 0 }, { x: 0, y: 0, z: 70, rotationY: 0, rotationX: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, T.mail);
  cue("whoosh", T.mail - 0.05, 0.5);
  cue("soft", T.mail + 0.45);
  const scan = mail.querySelector<HTMLElement>(".scan")!;
  const wash = mail.querySelector<HTMLElement>(".scanwash")!;
  const holo = mail.querySelector<HTMLElement>(".holo")!;
  ft(scan, { opacity: 1, y: -10 }, { y: 255, duration: 0.55, ease: "power1.inOut" }, T.scan, false);
  ft(scan, { opacity: 1 }, { opacity: 0, duration: 0.15 }, T.scan + 0.55);
  ft(wash, { opacity: 1, y: -130 }, { y: 140, duration: 0.55, ease: "power1.inOut" }, T.scan, false);
  ft(wash, { opacity: 1 }, { opacity: 0, duration: 0.15 }, T.scan + 0.55);
  tl.set(wash, { opacity: 0 }, 0);
  tl.set(scan, { opacity: 0 }, 0);
  ft(holo, { opacity: 0 }, { opacity: 0.9, duration: 0.2 }, T.scan);
  ft(holo, { opacity: 0.9 }, { opacity: 0.25, duration: 0.6 }, T.scan + 0.4);
  cue("sweep", T.scan, 0.55);
  const keys = [...mail.querySelectorAll<HTMLElement>(".k")];
  keys.forEach((k, i) => {
    const at = T.scan + 0.12 + i * 0.07;
    onFrame((t) => k.classList.toggle("hit", t >= at && t < T.file));
    cue("tick", at, undefined, 0.5);
  });
  // extracted data
  const data = [
    ["INTENT", "Renewal", 300, 440],
    ["URGENCY", "High", 520, 440],
    ["DEADLINE", "Fri 18:00", 715, 440],
    ["SENTIMENT", "Positive", 300, 530],
    ["VALUE", "CHF 48k", 520, 530],
  ] as const;
  data.forEach(([k, v, x, y], i) => {
    const el = html(`<div class="dtag" style="left:${x}px;top:${y}px"><small>${k}</small><b>${v}</b></div>`);
    const wire = html(`<div class="wire" style="left:${x + 40}px;top:392px;height:${y - 392}px"></div>`);
    app.append(wire, el);
    const at = T.data + i * 0.1;
    show(el, at, T.file + 0.2);
    show(wire, at - 0.08, T.file + 0.2);
    ft(wire, { scaleY: 0, opacity: 1 }, { scaleY: 1, duration: 0.2, ease: "power2.out" }, at - 0.08);
    ft(el, { opacity: 0, scale: 0.6, y: -30, z: 40 }, { opacity: 1, scale: 1, y: 0, z: 40, duration: 0.4, ease: "back.out(2)" }, at);
    ft([el, wire], { opacity: 1 }, { opacity: 0, x: 400, y: -200, scale: 0.4, duration: 0.3, ease: "power3.in" }, T.file - 0.1 + i * 0.02);
    cue("click", at, undefined, 0.7);
  });
  const dec = html(`<div class="decide">${icon.sparkle}Priority · reply drafted <em>confidence 98%</em></div>`);
  app.append(dec);
  show(dec, T.decide, T.file + 0.4);
  ft(dec, { opacity: 0, scale: 0.4, z: 120 }, { opacity: 1, scale: 1, z: 60, duration: 0.4, ease: "back.out(2.2)" }, T.decide);
  ft(dec, { opacity: 1 }, { opacity: 0, x: 600, y: -400, scale: 0.3, duration: 0.3, ease: "power3.in" }, T.file + 0.05);
  cue("hit", T.decide, undefined, 0.5);
  // filed into Priority, along a trail of light
  ft(mail, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: 580, y: -55, scale: 0.18, opacity: 0, duration: 0.42, ease: "power3.in" }, T.file);
  const trail = html(`<div class="trail" style="left:650px;top:265px;width:585px;transform:rotate(-5.4deg)"></div>`);
  app.append(trail);
  show(trail, T.file, T.file + 0.8);
  ft(trail, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.42, ease: "power3.in" }, T.file);
  ft(trail, { opacity: 1 }, { opacity: 0, duration: 0.35 }, T.file + 0.42);
  cue("whoosh", T.file, 0.45);
  bump(0, T.file + 0.42);

  // ── demo 2: the reply writes itself, and leaves ────────────────────────
  const words =
    "Hi Luka — Friday works. The renewal terms look good on our side. I've attached the signed contract and booked Thursday 10:00 to close the last points. Best, Ziyad";
  const comp = html(`<div class="comp">
    <div class="to">To <b>Luka · Alpine Supplies</b><span class="drafting">${icon.sparkle}ASTRYA · DRAFTING</span></div>
    <h4>Re: Contract renewal — can we confirm?</h4>
    <div class="body">${words}</div>
    <div class="att"><span class="chipx">${icon.paperclip}Contract_2026_signed.pdf</span><span class="chipx">${icon.calendar}Thu 10:00 · booked</span></div>
    <div class="sendb">Send ${icon.arrow}</div>
  </div>`);
  app.append(comp);
  const wd = splitWords(comp.querySelector<HTMLElement>(".body")!);
  show(comp, T.reply, T.send + 0.35);
  ft(trays[0].gl, { opacity: 1 }, { opacity: 0, duration: 0.6 }, T.reply - 0.05, false);
  ft(comp, { rotationX: -95, opacity: 0, z: 70 }, { rotationX: 0, opacity: 1, z: 70, duration: 0.5, ease: "back.out(1.3)" }, T.reply);
  cue("whoosh", T.reply - 0.05, 0.4);
  const rate = (T.send - 0.45 - T.gen) / wd.length;
  wd.forEach((w, i) => {
    const at = T.gen + i * rate;
    ft(w, { opacity: 0, y: 8, color: "#7fe0ff", textShadow: "0 0 18px rgba(127,224,255,1)" }, { opacity: 1, y: 0, color: "#eef4ff", textShadow: "0 0 0px rgba(127,224,255,0)", duration: 0.35, ease: "power2.out" }, at);
    if (i % 2 === 0) cue("tick", at, undefined, 0.35);
  });
  const chips = [...comp.querySelectorAll<HTMLElement>(".chipx")];
  ft(chips, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.12, ease: "back.out(2)" }, T.send - 0.55);
  const sendb = comp.querySelector<HTMLElement>(".sendb")!;
  ft(sendb, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.in" }, T.send - 0.12);
  ft(sendb, { scale: 0.9 }, { scale: 1.08, duration: 0.15, ease: "power2.out" }, T.send - 0.04);
  ft(comp, { x: 0, scaleX: 1, opacity: 1 }, { x: 1500, scaleX: 1.4, opacity: 0, duration: 0.32, ease: "power4.in" }, T.send);
  const streak = html(`<div class="streak"></div>`);
  app.append(streak);
  show(streak, T.send, T.send + 0.7);
  ft(streak, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.3, ease: "power4.in" }, T.send);
  ft(streak, { opacity: 1 }, { opacity: 0, duration: 0.3 }, T.send + 0.3);
  cue("click", T.send - 0.1);
  cue("whoosh", T.send, 0.4, 1.2);
  const toast = html(`<div class="toast">${icon.check}Sent to Luka <em>· drafted in 1.6 s</em></div>`);
  app.append(toast);
  show(toast, T.send + 0.2, T.auto + 0.2);
  ft(toast, { opacity: 0, y: -30, scale: 0.8, z: 60 }, { opacity: 1, y: 0, scale: 1, z: 60, duration: 0.35, ease: "back.out(2)" }, T.send + 0.2);
  ft(toast, { opacity: 1 }, { opacity: 0, y: -20, duration: 0.2 }, T.auto - 0.05);
  bump(1, T.send + 0.3);

  // ── automation: a rule switches on, and runs ───────────────────────────
  const steps = [
    [icon.finance, "Invoice<br>arrives"],
    [icon.check, "Filed to<br>Finance"],
    [icon.reply, "Replies<br>“received”"],
    [icon.file, "Logged<br>to Drive"],
  ];
  const rule = html(`<div class="rule">
    <div class="rt">${icon.sparkle}Automation · Invoices<div class="tog"><div class="bg"></div><i></i></div></div>
    <div class="flow">${steps.map(([ic, l], i) => `<div class="fnode" style="left:${i * 175}px">${ic}<span>${l}</span></div>`).join("")}
      ${[0, 1, 2].map((i) => `<div class="fline" style="left:${i * 175 + 140}px;width:35px"></div>`).join("")}
      <div class="fdot"></div></div>
    <div class="runs">312 INVOICES / MONTH · HANDLED AUTOMATICALLY</div>
  </div>`);
  app.append(rule);
  show(rule, T.auto, T.wow + 0.3);
  ft(rule, { rotationY: 70, z: -500, opacity: 0, x: -100 }, { rotationY: 0, z: 70, opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }, T.auto);
  cue("whoosh", T.auto - 0.05, 0.4);
  const knob = rule.querySelector<HTMLElement>(".tog i")!;
  ft(knob, { x: 0 }, { x: 36, duration: 0.18, ease: "power3.out" }, T.auto + 0.3);
  ft(rule.querySelector(".tog .bg"), { opacity: 0 }, { opacity: 1, duration: 0.18 }, T.auto + 0.3);
  cue("click", T.auto + 0.3);
  const nodes = [...rule.querySelectorAll<HTMLElement>(".fnode")];
  ft(nodes, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.07, ease: "back.out(2)" }, T.auto + 0.35);
  ft(rule.querySelectorAll(".fline"), { scaleX: 0 }, { scaleX: 1, duration: 0.12, stagger: 0.12, ease: "none" }, T.auto + 0.5);
  const fdot = rule.querySelector<HTMLElement>(".fdot")!;
  onFrame((t) => {
    const k = P(t, T.auto + 0.45, T.wow - 0.05);
    fdot.style.left = `${70 + k * 525}px`;
    fdot.style.opacity = k > 0 && k < 1 ? "1" : "0";
    nodes.forEach((n, i) => n.style.setProperty("box-shadow", k * 3 >= i - 0.05 && k > 0 ? "inset 0 0 0 2px #9fd8ff, 0 0 26px rgba(90,170,255,.8)" : ""));
  });
  ft(rule.querySelector(".runs"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.auto + 0.6);
  bump(2, T.wow - 0.12);
  // the interface collapses into a point of light; the wow begins
  ft(app, { scale: 1, z: 0, opacity: 1 }, { scale: 0.04, z: -300, opacity: 0, duration: 0.28, ease: "power4.in" }, T.wow);
  flash(T.wow + 0.28, 0.9, 0.06, 0.5);
  cue("hit", T.wow + 0.28, undefined, 0.8);

  // ── the words ──────────────────────────────────────────────────────────
  const caption = (markup: string, a: number, b: number, cls = "cap") => {
    const el = html(`<div class="${cls}">${markup}</div>`);
    front.append(el);
    const em = el.querySelector("em");
    const chars = em ? [...splitChars(el)] : splitChars(el);
    if (em) {
      // keep the accent colour after splitting
      const hot = markup.slice(markup.indexOf("<em>") + 4, markup.indexOf("</em>"));
      const plain = markup.replace(/<\/?em>/g, "");
      const s0 = plain.indexOf(hot);
      chars.forEach((c, i) => i >= s0 && i < s0 + hot.length && (c.style.color = "#8fd0ff"));
    }
    show(el, a, b);
    ft(chars, { opacity: 0, y: 34, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.016, ease: "power3.out" }, a);
    ft(chars, { opacity: 1, filter: "blur(0px)" }, { opacity: 0, y: -24, filter: "blur(12px)", duration: 0.3, stagger: 0.008, ease: "power2.in" }, b - 0.35);
    return el;
  };
  caption("Astrya <em>sees</em> it.", 9.7, 10.55);
  caption("<em>Understands</em> it.", 10.6, 11.85);
  caption("<em>Organizes</em> it.", 11.95, 12.72);
  caption("<em>Acts</em> on it.", 15.0, 16.3);

  // ── WOW: inbox overload → shockwave → sorted → tunnel ─────────────────
  const over = html(`<div class="overload">INBOX OVERLOAD.</div>`);
  front.append(over);
  const oc = splitChars(over);
  show(over, T.overload, T.core + 0.1);
  const R = rng(4);
  const blow = oc.map(() => [(R() - 0.5) * 1600, (R() - 0.5) * 900, (R() - 0.5) * 70]);
  ft(oc, { opacity: 0, scale: 3.2, filter: "blur(30px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, stagger: { each: 0.03, from: "random" }, ease: "expo.out" }, T.overload);
  oc.forEach((c, i) => ft(c, { x: 0, y: 0, rotation: 0, opacity: 1 }, { x: blow[i][0], y: blow[i][1], rotation: blow[i][2], opacity: 0, duration: 0.35, ease: "power3.in" }, T.core - 0.3));
  onFrame((t) => {
    if (t < T.overload || t > T.core) return;
    const f = Math.floor(t * 60);
    const amp = 2 + smooth(P(t, T.overload + 0.6, T.core - 0.3)) * 10;
    const r = rng(f);
    over.style.transform = `translate(${(r() - 0.5) * amp}px, ${(r() - 0.5) * amp * 0.6}px)`;
    over.style.textShadow = `${(r() - 0.5) * amp * 1.5}px 0 rgba(90,220,255,0.75), ${(r() - 0.5) * amp * 1.5}px 0 rgba(47,90,255,0.75), 0 0 40px rgba(90,150,255,0.8), 0 0 120px rgba(47,107,255,0.6)`;
  });
  cue("hit", T.overload, undefined, 0.9);
  cue("riser", T.overload + 0.3, T.wave - T.overload - 0.3, 1.2);
  const uc = html(`<div class="unreadc"></div>`);
  front.append(uc);
  show(uc, T.overload + 0.2, T.core);
  onFrame((t) => {
    const k = P(t, T.overload + 0.2, T.core - 0.4);
    uc.textContent = `UNREAD  ${fmt(2184 * (k * k * 0.3 + k * 0.7))}`;
    uc.style.opacity = (P(t, T.overload + 0.2, T.overload + 0.5) * (1 - P(t, T.core - 0.3, T.core))).toFixed(3);
  });
  flash(T.wave, 1, 0.12, 0.8);
  cue("hit", T.wave, undefined, 1.4);
  cue("sweep", T.wave + 0.05, 1.2);
  cue("whoosh", T.sort, 1.0);
  // lane names, pinned to the lanes
  const counts = [52, 364, 260, 312, 1196];
  const ltags = LANES.map((l, k) => {
    const c = `rgb(${l.c.map((v) => Math.round(v * 255)).join(",")})`;
    const el = html(`<div class="lanetag" style="--c:${c}"><i></i>${l.name}<em></em></div>`);
    front.append(el);
    return { el, n: el.querySelector("em")!, k };
  });
  onFrame((t) => {
    ltags.forEach(({ el, n, k }) => {
      const a = T.sort + 0.5 + k * 0.08;
      const on = t >= a && t < T.tunnel + 0.35 && hud.lanes[k] && hud.lanes[k].z < 1;
      el.style.visibility = on ? "visible" : "hidden";
      if (!on) return;
      const p = hud.lanes[k];
      const o = eOut(P(t, a, a + 0.3)) * (1 - P(t, T.tunnel, T.tunnel + 0.35));
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate(-50%, -50%) scale(${lerp(0.7, 1, eOut(P(t, a, a + 0.3)))})`;
      n.textContent = fmt(counts[k] * eOut(P(t, a, a + 0.9)));
    });
  });
  caption("2,184 emails. <em>Sorted in 0.8 s.</em>", T.sort + 0.55, T.tunnel + 0.25, "sorted");
  cue("riser", T.tunnel, T.dash - T.tunnel, 1.1);
  flash(T.dash, 1, 0.15, 0.6);
  cue("hit", T.dash, undefined, 1.1);

  // ── the dashboard: the morning after ───────────────────────────────────
  const rig2 = html(`<div class="rig"></div>`);
  world.append(rig2);
  const chartPts = [120, 180, 150, 260, 230, 330, 420, 390, 520, 610, 560, 700, 820, 760];
  const cx = (i: number) => (i / (chartPts.length - 1)) * 764;
  const cy = (v: number) => 290 - (v / 900) * 270;
  const line = chartPts.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`).join(" ");
  const dash = html(`<div class="dash glass">
    <div class="hi">${ringMark("")}<div><h2>Good morning, Ziyad.</h2><p>Astrya handled <b>2,184 emails</b> while you slept.</p></div></div>
    <div class="tiles">
      <div class="tile hot"><small>UNREAD</small><b data-c="u">0</b></div>
      <div class="tile"><small>REPLIES SENT</small><b data-c="r">0</b></div>
      <div class="tile"><small>TIME SAVED</small><b data-c="h">0</b></div>
      <div class="tile"><small>MEETINGS BOOKED</small><b data-c="m">0</b></div>
    </div>
    <div class="chart"><small>EMAILS HANDLED · 14 DAYS</small>
      <svg viewBox="0 0 764 300"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d8dff" stop-opacity="0.55"/><stop offset="1" stop-color="#4d8dff" stop-opacity="0"/></linearGradient></defs>
        ${[0, 1, 2, 3].map((i) => `<path d="M0 ${20 + i * 90}H764" stroke="rgba(150,190,255,0.12)" stroke-width="1"/>`).join("")}
        <path class="area" d="${line} L764 300 L0 300Z" fill="url(#ag)"/>
        <path class="ln" d="${line}" fill="none" stroke="#9fd8ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 8px #4d8dff)"/>
        <circle class="pt" cx="${cx(chartPts.length - 1)}" cy="${cy(chartPts[chartPts.length - 1])}" r="9" fill="#fff" style="filter:drop-shadow(0 0 10px #7fd0ff)"/>
      </svg></div>
    <div class="feed"><small>ASTRYA ACTIVITY</small>
      ${[
        [icon.reply, "Replied to Luka — renewal confirmed", "06:12"],
        [icon.finance, "Filed 312 invoices to Finance", "06:30"],
        [icon.calendar, "Booked kickoff · Thu 10:00", "06:41"],
        [icon.bell, "Muted 41 newsletters", "07:02"],
        [icon.shield, "Flagged 1 contract for review", "07:15"],
      ]
        .map(([ic, l, tm]) => `<div class="fi">${ic}${l}<em>${tm}</em></div>`)
        .join("")}
    </div>
  </div>`);
  rig2.append(dash);
  show(rig2, T.dash - 0.05, T.back + 0.05);
  ft(dash, { z: -1600, opacity: 0, rotationX: 30 }, { z: 0, opacity: 1, rotationX: 0, duration: 0.8, ease: "expo.out" }, T.dash);
  onFrame((t) => {
    if (t < T.dash || t > T.back) return;
    const k = P(t, T.dash, T.back);
    const rx = lerp(16, 5, smooth(k));
    const ry = lerp(-15, 11, smooth(k));
    const z = lerp(-60, 60, k);
    rig2.style.transform = `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  const hi = dash.querySelector<HTMLElement>(".hi")!;
  ft(hi, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, T.dash + 0.25);
  const tiles = [...dash.querySelectorAll<HTMLElement>(".tile")];
  ft(tiles, { opacity: 0, y: 40, z: 0 }, { opacity: 1, y: 0, z: 30, duration: 0.5, stagger: 0.08, ease: "back.out(1.6)" }, T.dash + 0.4);
  const C = (k: string) => dash.querySelector<HTMLElement>(`[data-c="${k}"]`)!;
  const cu = C("u");
  const cr = C("r");
  const ch = C("h");
  const cm = C("m");
  onFrame((t) => {
    if (t < T.dash || t > T.back) return;
    const k = eOut(P(t, T.dash + 0.5, T.dash + 1.9));
    cu.textContent = fmt(2184 * (1 - k));
    cr.textContent = fmt(58 * k);
    ch.innerHTML = `${(11.4 * k).toFixed(1)}<sup>h</sup>`;
    cm.textContent = fmt(3 * eOut(P(t, T.dash + 0.9, T.dash + 1.9)));
  });
  for (let i = 0; i < 14; i++) cue("tick", T.dash + 0.55 + i * 0.09, undefined, 0.3);
  cue("chime", T.dash + 1.9);
  ft(dash.querySelector(".ln"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.3, ease: "power2.inOut" }, T.dash + 0.8);
  ft(dash.querySelector(".area"), { opacity: 0 }, { opacity: 1, duration: 0.8 }, T.dash + 1.3);
  ft(dash.querySelector(".pt"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, T.dash + 2.05);
  ft([dash.querySelector(".chart"), dash.querySelector(".feed")], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out" }, T.dash + 0.6);
  const fis = [...dash.querySelectorAll<HTMLElement>(".fi")];
  fis.forEach((f, i) => {
    const at = T.dash + 1.2 + i * 0.32;
    ft(f, { opacity: 0, x: 30, color: "#7fe0ff" }, { opacity: 1, x: 0, color: "#e7efff", duration: 0.35, ease: "power3.out" }, at);
    cue("click", at, undefined, 0.5);
  });
  // collapse into a point of light
  ft(dash, { scale: 1, opacity: 1 }, { scale: 0.02, opacity: 0, duration: 0.32, ease: "power4.in" }, T.back - 0.32);
  cue("whoosh", T.back - 0.35, 0.4);
  flash(T.back, 1, 0.08, 0.4);
  cue("hit", T.back, undefined, 0.9);

  // ── finale: the planet, connected; the name; the line ─────────────────
  cue("soft", T.back + 0.3, 4);
  cue("sweep", T.net, 1.6);
  const logo = html(`<div class="logo">${ringMark("")}<div class="wordmark">ASTRYA</div></div>`);
  front.append(logo);
  show(logo, T.logo - 0.05, T.end + 1);
  const svg = logo.querySelector("svg")!;
  const reveal = svg.querySelector(".ring-reveal");
  const glint = svg.querySelector(".ring-glint");
  ft(reveal, { drawSVG: "62% 62%" }, { drawSVG: "0% 100%", duration: 1.0, ease: "cineInOut" }, T.logo);
  ft(glint, { drawSVG: "62% 62%", opacity: 0 }, { drawSVG: "0% 100%", opacity: 1, duration: 1.0, ease: "cineInOut" }, T.logo);
  ft(glint, { opacity: 1 }, { opacity: 0, duration: 0.8 }, T.logo + 1.0);
  ft(svg, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: "cine" }, T.logo);
  const wm = logo.querySelector<HTMLElement>(".wordmark")!;
  const wc = splitChars(wm);
  ft(wc, { opacity: 0, x: (i) => (i - 2.5) * 40, filter: "blur(16px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.05, ease: "cine" }, T.logo + 0.25);
  cue("hit", T.logo, undefined, 0.7);
  cue("chime", T.logo + 0.3);
  const tagl = caption("Your inbox. <em>Reimagined.</em>", T.tag, T.card, "tag");
  void tagl;
  const tag2 = html(`<div class="tag2">AI-POWERED EMAIL INTELLIGENCE.</div>`);
  front.append(tag2);
  const t2 = splitChars(tag2);
  show(tag2, T.card, T.end + 1);
  ft(t2, { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.6, stagger: 0.02, ease: "power2.out" }, T.card + 0.05);
  ft(logo, { y: 0 }, { y: -30, duration: 2.5, ease: "cine" }, T.card);
  cue("chime", T.tag);
  cue("soft", T.card, 2.5);
}

function splitWords(el: HTMLElement) {
  const words = (el.textContent ?? "").trim().split(/\s+/);
  el.textContent = "";
  return words.map((w) => {
    const s = document.createElement("span");
    s.className = "wd";
    s.textContent = w;
    el.appendChild(s);
    return s;
  });
}
