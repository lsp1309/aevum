import { gsap } from "../../core/gsap";
import { onFrame, clamp, smooth, cue } from "../../core/clock";
import { html, $ } from "../../promo/stage";
import { T, WORDS } from "../timing";
import { ICON } from "../faces";
import { markSvg } from "../mark";
import { bcam, brig } from "./bento";

/**
 * ACT IV — ONE SYSTEM. The studio goes dark. The camera climbs and turns
 * the bento into a map seen from above; on each word of the voice a module
 * rises out of it as a tower — mail, calendar, finance, documents — then all
 * of them with the Astrya core at the centre. Cobalt circuits run between
 * them along the streets, pulses travel, and on "together" every roof
 * lights at once. Then the towers sink back into the ground.
 */
const C = { x: 540, y: 2620 }; // centre of the city, in bento coordinates
const SP = 300;
const TOWERS = [
  { k: "mail", gx: -1, gy: -1, h: 300, t: "MAIL", s: "2 need you", at: WORDS.mail },
  { k: "cal", gx: 0, gy: -1, h: 380, t: "CALENDAR", s: "week solved", at: WORDS.calendar },
  { k: "card", gx: 1, gy: -1, h: 260, t: "FINANCE", s: "INV-4821 ✓", at: WORDS.finance },
  { k: "doc", gx: 1, gy: 0, h: 330, t: "DOCS", s: "brief ready", at: WORDS.documents },
  { k: "truck", gx: 1, gy: 1, h: 220, t: "LOGISTICS", s: "via Basel", at: WORDS.one },
  { k: "check", gx: 0, gy: 1, h: 280, t: "TASKS", s: "4 due Fri", at: WORDS.one + 0.08 },
  { k: "chat", gx: -1, gy: 1, h: 240, t: "REPLIES", s: "3 drafted", at: WORDS.one + 0.16 },
  { k: "bell", gx: -1, gy: 0, h: 300, t: "AGENTS", s: "3/3 done", at: WORDS.one + 0.24 },
  { k: "core", gx: 0, gy: 0, h: 520, t: "", s: "", at: WORDS.one + 0.1 },
] as const;

export function buildSkyline(tl: gsap.core.Timeline) {
  const city = html(`<div class="city" style="visibility:hidden"></div>`);
  brig.appendChild(city);
  // ground glow + circuits (orthogonal, along the streets)
  city.appendChild(html(`<div class="ground" style="left:${C.x - 1100}px;top:${C.y - 1100}px;width:2200px;height:2200px"></div>`));
  const paths: string[] = [];
  for (const t of TOWERS) {
    if (t.k === "core") continue;
    const x = C.x + t.gx * SP;
    const y = C.y + t.gy * SP;
    // leave the tower, take the street, enter the core
    if (t.gx && t.gy) paths.push(`M${x - t.gx * 100} ${y} H${C.x + t.gx * 150} V${C.y + t.gy * 50} H${C.x + t.gx * 100}`);
    else if (t.gx) paths.push(`M${x - t.gx * 100} ${y} H${C.x + t.gx * 100}`);
    else paths.push(`M${x} ${y - t.gy * 100} V${C.y + t.gy * 100}`);
  }
  // an outer ring road
  paths.push(`M${C.x - 450} ${C.y - 450} H${C.x + 450} V${C.y + 450} H${C.x - 450} Z`);
  const circ = html(`<svg class="circuit" viewBox="0 0 1080 ${C.y + 1200}" width="1080" height="${C.y + 1200}" style="left:0;top:0">
    ${paths.map((d) => `<path d="${d}" stroke="#3552ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`).join("")}
    ${paths.map(() => `<rect class="pulse" x="-9" y="-9" width="18" height="18" rx="4" fill="#ffffff"/>`).join("")}
    <circle class="ripple" cx="${C.x}" cy="${C.y}" r="10" stroke="#ffffff" stroke-width="4" fill="none" opacity="0"/>
  </svg>`);
  city.appendChild(circ);
  const lines = Array.from(circ.querySelectorAll<SVGPathElement>("path"));
  const pulses = Array.from(circ.querySelectorAll<SVGRectElement>(".pulse"));
  const ripple = circ.querySelector<SVGCircleElement>(".ripple")!;
  const lens = lines.map((l) => l.getTotalLength());

  // towers
  const towers = TOWERS.map((t) => {
    const x = C.x + t.gx * SP - 100;
    const y = C.y + t.gy * SP - 100;
    const icon = t.k === "core" ? markSvg("#ffffff", 170) : ICON[t.k as keyof typeof ICON];
    const el = html(`<div class="tower${t.k === "core" ? " core" : ""}" style="left:${x}px;top:${y}px">
      <i class="sd ns" style="left:0;top:0;width:200px;transform-origin:50% 0"></i>
      <i class="sd ns" style="left:0;top:200px;width:200px;transform-origin:50% 0"></i>
      <i class="sd ew" style="left:0;top:0;height:200px;transform-origin:0 50%"></i>
      <i class="sd ew" style="left:200px;top:0;height:200px;transform-origin:0 50%"></i>
      <i class="tp">${icon}${t.t ? `<b>${t.t}</b><span>${t.s}</span>` : ""}<i class="flash"></i></i>
    </div>`);
    city.appendChild(el);
    return { el, sides: Array.from(el.querySelectorAll<HTMLElement>(".sd")), top: el.querySelector<HTMLElement>(".tp")!, flash: el.querySelector<HTMLElement>(".flash")!, H: t.h, st: { h: 0 }, at: t.at, k: t.k };
  });
  onFrame((t) => {
    if (t < T.night - 0.2 || t > T.picture + 0.6) return;
    for (const tw of towers) {
      const h = Math.max(0.01, tw.st.h);
      tw.sides.forEach((s, i) => {
        if (i < 2) {
          s.style.height = `${h}px`;
          s.style.transform = "rotateX(90deg)";
        } else {
          s.style.width = `${h}px`;
          s.style.transform = "rotateY(-90deg)";
        }
      });
      tw.top.style.transform = `translateZ(${h.toFixed(2)}px)`;
      tw.el.style.opacity = h < 0.5 ? "0" : "1";
    }
  });

  // ── night falls: the camera climbs to an orbit over the map ──────────────
  const N = T.night;
  const base = $(".st-base");
  const key = $(".st-key");
  const fill = $(".st-fill");
  const floor = $(".st-floor");
  tl.to(base, { backgroundColor: "#06070a", duration: 0.6, ease: "power2.inOut" }, N);
  tl.to(key, { opacity: 0, duration: 0.5 }, N);
  tl.to(floor, { opacity: 0, duration: 0.5 }, N);
  tl.to(fill, { opacity: 0.9, duration: 1.2, ease: "power2.out" }, N + 0.3);
  const cells = Array.from(brig.querySelectorAll<HTMLElement>(".cell, .token, .trace"));
  tl.to(cells, { opacity: 0, duration: 0.45, ease: "power2.in", stagger: 0.01 }, N);
  tl.set(city, { visibility: "visible" }, N + 0.1);
  tl.fromTo(city, { opacity: 0 }, { opacity: 1, duration: 0.6 }, N + 0.1);
  tl.to(bcam, { fx: C.x, fy: C.y - 130, s: 0.76, rx: 57, rz: -36, ry: 0, z: 0, duration: 1.3, ease: "power3.inOut" }, N);
  tl.to(bcam, { rz: -72, rx: 52, s: 0.82, duration: T.retract - N - 1.3, ease: "sine.inOut" }, N + 1.3);
  cue("whoosh", N, 1.2, 0.8);
  cue("soft", N + 0.2, undefined, 0.5);

  // ── the towers rise, word by word ──────────────────────────────────────
  towers.forEach((tw) => {
    tl.to(tw.st, { h: tw.H, duration: tw.k === "core" ? 0.9 : 0.7, ease: "back.out(1.25)" }, tw.at);
    tl.from(tw.top.children, { opacity: 0, duration: 0.4 }, tw.at + 0.25);
    cue(tw.k === "core" ? "hit" : "tick", tw.at, undefined, tw.k === "core" ? 0.9 : 1.0);
  });
  // circuits light on "one system", pulses travel
  tl.fromTo(lines, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.7, stagger: 0.04, ease: "power2.inOut" }, T.one);
  gsap.set(pulses, { opacity: 0 });
  onFrame((t) => {
    if (t < T.one + 0.4 || t > T.retract + 0.3) return;
    pulses.forEach((p, i) => {
      const u = ((t - T.one) * 0.55 + i * 0.13) % 1;
      const pt = lines[i].getPointAtLength(u * lens[i]);
      p.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      p.style.opacity = String(Math.sin(Math.PI * u) * (t > T.retract ? 0 : 1));
    });
  });
  cue("sweep", T.one, 0.8, 0.9);
  // together: every roof lights at once, a ring runs out of the core
  tl.to(towers.map((t) => t.flash), { opacity: 0.85, duration: 0.08 }, T.together);
  tl.to(towers.map((t) => t.flash), { opacity: 0, duration: 0.7, ease: "power2.out" }, T.together + 0.1);
  tl.fromTo(ripple, { attr: { r: 40 }, opacity: 0.9 }, { attr: { r: 900 }, opacity: 0, duration: 1.1, ease: "power2.out" }, T.together);
  tl.to(towers.map((t) => t.st), { h: "+=40", duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 }, T.together);
  cue("hit", T.together, undefined, 1.0);
  cue("chime", T.together, undefined, 0.9);

  // ── the towers sink back; the camera comes to look straight down ───────
  const R0 = T.retract;
  towers.forEach((tw, i) => tl.to(tw.st, { h: 0, duration: 0.45, ease: "power3.in" }, R0 + (tw.k === "core" ? 0.3 : i * 0.03)));
  tl.to(lines, { opacity: 0, duration: 0.3 }, R0);
  tl.to(bcam, { rx: 0, rz: -90, fy: C.y, s: 1.0, duration: 0.65, ease: "power3.inOut" }, R0 + 0.05);
  tl.to(city, { opacity: 0, duration: 0.25 }, T.picture - 0.15);
  cue("whoosh", R0, 0.6, 0.6);
  void clamp;
  void smooth;
}
