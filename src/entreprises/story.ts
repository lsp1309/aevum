import { gsap } from "../core/gsap";
import { onFrame, cue, rng, clamp, smooth, lerp } from "../core/clock";
import { camera, overlay, html, atmos, W, H, CX, CY } from "../core/stage";
import { chars, titleIn } from "../core/text";
import { addFx, burst, shockwave, orbitDust, flareSweep } from "../core/fx";
import { sprite } from "../core/background";
import { ringMark, RING_A, RING_B, RING_TILT } from "../core/icons";
import { P, eOut, show, ft, section, flash, caption, igniteRing, glintRing } from "./kit";
import { T } from "./timing";

/** Example inbox of the problem scene. Fictitious senders, everyday subjects. */
export const MAILS: Array<[string, string, string, number]> = [
  ["Marc Keller", "Livraison bloquée : réponse attendue aujourd'hui", "Client", 210],
  ["Sophie Morel", "Réclamation : facture reçue en double", "Client", 330],
  ["Julien Favre", "Demande de devis pour 12 postes", "Prospect", 160],
  ["Fiduciaire Rhône", "Facture fournisseur F-2026-118", "Facture", 40],
  ["Léa Martin", "Rendez-vous jeudi ? Deux créneaux possibles", "Rendez-vous", 120],
  ["Avis bancaire", "Changement de coordonnées bancaires", "À vérifier", 0],
  ["Atelier Nord", "Relance : bon de commande 4471", "Fournisseur", 260],
  ["Salon PME Romandie", "Programme et inscriptions", "Newsletter", 190],
  ["Nicolas Duval", "Question sur votre offre de maintenance", "Prospect", 300],
  ["Claire Rossi", "Annulation du rendez-vous de lundi", "Rendez-vous", 20],
  ["Comptabilité", "Rappel : clôture du mois vendredi", "Interne", 230],
  ["Transports Léman", "Retard de livraison : nouvelle date", "Fournisseur", 280],
  ["Anna Weber", "Contrat signé en pièce jointe", "Client", 140],
  ["Support logiciel", "Votre licence arrive à échéance", "Notification", 200],
  ["Thomas Girard", "Pouvez-vous me rappeler ?", "Client", 350],
  ["Ressources humaines", "Absences de la semaine prochaine", "Interne", 100],
  ["Elise Bonvin", "Demande d'informations complémentaires", "Prospect", 60],
  ["Assurance PME", "Renouvellement de votre police", "Administratif", 220],
  ["Paul Meyer", "Relance : devis du 3 octobre", "Prospect", 180],
  ["Imprimerie Centrale", "Bon à tirer à valider", "Fournisseur", 250],
  ["Laura Chevalley", "Facture 2026-311 : paiement effectué", "Facture", 80],
  ["Mairie", "Autorisation : pièces manquantes", "Administratif", 30],
  ["David Perret", "Nouveau collaborateur : accès à créer", "Interne", 320],
  ["Webinaire IA", "Invitation : jeudi 11 h", "Newsletter", 170],
];

const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function mailCard(i: number, time = "08:14") {
  const [from, subject, cat, hue] = MAILS[i % MAILS.length];
  return `<div class="mc"><span class="av" style="--h:${hue}">${initials(from)}</span><div class="mc-b"><div class="mc-t"><b>${from}</b><em>${time}</em></div><p>${subject}</p><span class="tag">${cat}</span></div></div>`;
}

// ── I. ouverture ────────────────────────────────────────────────────────
export function buildOpening(tl: gsap.core.Timeline) {
  // the dark breathes in: stars, halos, a cold core of light
  tl.set(atmos, { stars: 0, halo: 0, core: 0, leak: 0, zoom: 1, warp: 0, pull: 0 }, 0);
  tl.to(atmos, { stars: 0.85, duration: 3.2, ease: "sine.inOut" }, T.light);
  tl.to(atmos, { halo: 0.55, duration: 3.5, ease: "sine.inOut" }, T.light + 0.2);
  tl.to(atmos, { core: 0.32, duration: 2.4, ease: "sine.out" }, T.light);
  tl.to(atmos, { core: 0.12, duration: 3, ease: "sine.inOut" }, T.cards);
  tl.to(atmos, { zoom: 1.22, duration: T.freeze - T.light, ease: "none" }, T.light);
  cue("soft", 0.2, 3.5, 0.7);
  cue("chime", T.streams + 0.3, undefined, 0.4);

  // streams of information converging, as thin comets on spiral lanes
  const dot = sprite(32, "200,220,255", 0.2);
  const dotB = sprite(32, "110,150,255", 0.2);
  const R = rng(21);
  const lanes = Array.from({ length: 18 }, (_, i) => ({
    th: (i / 18) * Math.PI * 2 + R() * 0.3,
    spin: 0.9 + R() * 0.7,
    sp: 0.16 + R() * 0.1,
    ph: Array.from({ length: 7 }, () => R()),
    tint: R(),
  }));
  const end = T.through + 0.4;
  addFx(T.streams, end - T.streams, (ctx, _p, t) => {
    const fadeIn = smooth(P(t, T.streams, T.streams + 2.2));
    const fadeOut = 1 - smooth(P(t, T.cards + 1.2, T.dense));
    const a0 = fadeIn * fadeOut;
    if (a0 <= 0.002) return;
    for (const l of lanes) {
      for (const ph of l.ph) {
        const s = (t * l.sp + ph) % 1;
        for (let k = 0; k < 9; k++) {
          const sk = s - k * 0.012;
          if (sk <= 0) break;
          const r = 1250 * Math.pow(1 - sk, 1.3) + 30;
          const ang = l.th + l.spin * sk;
          const x = CX + Math.cos(ang) * r * 1.25;
          const y = CY + Math.sin(ang) * r * 0.62;
          const a = a0 * Math.sin(Math.PI * sk) * (1 - k / 9) * 0.85;
          ctx.globalAlpha = a;
          const sz = (k === 0 ? 9 : 6) * (0.6 + 0.4 * (1 - sk));
          ctx.drawImage(l.tint > 0.5 ? dot : dotB, x - sz, y - sz, sz * 2, sz * 2);
        }
      }
    }
  });

  caption(tl, overlay, "cap-c", "Chaque jour, tout arrive par e-mail.", T.line1, T.cards + 0.8, `top:${CY + 150}px`);
}

// ── II. le problème ─────────────────────────────────────────────────────
export function buildProblem(tl: gsap.core.Timeline) {
  const root = section(camera, "s-problem", `<div class="rig"></div>`, T.cards - 0.1, T.ring + 0.1);
  const rig = root.querySelector(".rig") as HTMLElement;
  const R = rng(9);
  const N = 30;
  const cards = Array.from({ length: N }, (_, i) => {
    const el = html(mailCard(i, `${String(7 + Math.floor(i / 6)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`));
    rig.appendChild(el);
    const z = -1900 + Math.pow(R(), 0.8) * 2050;
    const spread = 1 + (-z / 1900) * 0.9;
    const born = T.cards + Math.pow(i / N, 0.85) * (T.dense - T.cards + 0.4);
    return {
      el,
      x: CX + (R() - 0.5) * 1560 * spread,
      y: CY + (R() - 0.5) * 820 * spread,
      z,
      rot: (R() - 0.5) * 8,
      vx: (R() - 0.5) * 26,
      vy: (R() - 0.5) * 16,
      born,
    };
  });
  // the camera drifts in, then dives through everything
  const cam = { z: -260, sweep: 0 };
  tl.set(cam, { z: -260 }, 0);
  tl.to(cam, { z: 380, duration: T.freeze - T.cards, ease: "sine.inOut" }, T.cards);
  tl.to(cam, { z: 3400, duration: 0.95, ease: "expo.in" }, T.through);

  onFrame((t) => {
    if (t < T.cards - 0.1 || t > T.ring + 0.1) return;
    const tt = Math.min(t, T.freeze);
    const sweepX = lerp(-300, W + 300, P(t, T.sweep, T.sweep + 0.55));
    for (const c of cards) {
      const k = eOut(P(t, c.born, c.born + 0.7));
      if (k <= 0) {
        c.el.style.opacity = "0";
        continue;
      }
      const age = tt - c.born;
      const x = c.x + c.vx * age;
      const y = c.y + c.vy * age;
      const ze = c.z + cam.z - (1 - k) * 260;
      if (ze > 1450) {
        c.el.style.opacity = "0";
        continue;
      }
      // depth of field: the focus plane sits just in front of the frame
      const blur = Math.min(9, Math.abs(ze - 120) / 170);
      const far = clamp(1 - (-ze - 1200) / 900);
      const near = 1 - smooth(P(ze, 900, 1400));
      const lit = t >= T.sweep && t < T.sweep + 0.9 ? 1 + 1.3 * Math.exp(-(((x - sweepX) / 170) ** 2)) : 1;
      const frozen = smooth(P(t, T.freeze, T.freeze + 0.3));
      c.el.style.transform = `translate3d(${(x - 190).toFixed(1)}px,${(y - 44).toFixed(1)}px,${ze.toFixed(1)}px) rotate(${c.rot}deg)`;
      c.el.style.opacity = (k * far * near * (1 - 0.25 * frozen)).toFixed(3);
      c.el.style.filter = `blur(${blur.toFixed(2)}px) brightness(${lit.toFixed(2)})`;
    }
  });

  // unread counter, like an inbox header that can't keep up
  const counter = html(`<div class="counter"><span>Boîte de réception</span><b>0</b><em>non lus</em></div>`);
  overlay.appendChild(counter);
  show(counter, T.cards, T.sweep + 0.5);
  const cb = counter.querySelector("b")!;
  ft(tl, counter, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.8 }, T.cards);
  tl.to(counter, { opacity: 0, filter: "blur(8px)", duration: 0.4, ease: "exit" }, T.sweep);
  onFrame((t) => {
    const n = Math.round(3 + Math.pow(P(Math.min(t, T.freeze), T.cards, T.freeze), 1.6) * 145);
    cb.textContent = String(n);
  });
  for (let i = 0; i < 12; i++) cue("tick", T.cards + 0.2 + Math.pow(i / 12, 0.8) * 5.5, undefined, 0.5);

  // kinetic words over a soft scrim
  const scrim = html(`<div class="scrim"></div>`);
  overlay.appendChild(scrim);
  show(scrim, T.words - 0.2, T.freeze + 0.4);
  ft(tl, scrim, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "sine.out" }, T.words - 0.2);
  tl.to(scrim, { opacity: 0, duration: 0.4, ease: "sine.in" }, T.freeze);
  const beats: Array<[string, number]> = [
    ["Demandes.", T.words],
    ["Factures.", T.words + 0.52],
    ["Relances.", T.words + 1.04],
    ["Rendez-vous.", T.words + 1.56],
  ];
  beats.forEach(([w, at], i) => {
    const el = html(`<div class="kin">${w}</div>`);
    overlay.appendChild(el);
    const cs = chars(el);
    show(el, at, at + 0.62);
    ft(tl, cs, { opacity: 0, scale: 1.8, filter: "blur(18px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.34, stagger: 0.018, ease: "expo.out" }, at);
    tl.to(cs, { opacity: 0, y: -16, filter: "blur(12px)", duration: 0.2, stagger: 0.008, ease: "power2.in" }, at + 0.4);
    cue(i % 2 ? "click" : "tick", at, undefined, 0.8);
  });
  const all = html(`<div class="kin kin-l">Tout, en même temps.</div>`);
  overlay.appendChild(all);
  show(all, T.dense, T.sweep + 0.35);
  tl.add(titleIn(all, { stagger: 0.08, dur: 0.9, blur: 18, y: 18 }), T.dense);
  tl.to(all.querySelectorAll(".w"), { opacity: 0, filter: "blur(16px)", scale: 1.06, duration: 0.35, stagger: 0.02, ease: "power2.in" }, T.sweep - 0.05);
  cue("riser", T.dense - 0.4, 2.0, 0.6);
}

// ── III. ASTRYA ─────────────────────────────────────────────────────────
export function buildReveal(tl: gsap.core.Timeline) {
  // the stop, then a line of light reads the frame
  cue("hit", T.freeze, undefined, 0.6);
  flareSweep(T.sweep, 0.7, CY, true, "150,195,255");
  cue("sweep", T.sweep, 0.7, 0.6);
  tl.to(atmos, { warp: 1.1, zoom: 1.7, duration: 0.9, ease: "expo.in" }, T.through);
  tl.to(atmos, { warp: 0, duration: 0.9, ease: "cine" }, T.through + 0.95);
  tl.to(atmos, { zoom: 1.25, duration: 1.6, ease: "cine" }, T.through + 0.95);
  cue("whoosh", T.through + 0.4, 1.0, 0.9);
  flash(tl, T.ring - 0.02, 0.75, 0.08, 0.6);

  const SIZE = 720;
  const RY = 430;
  const root = section(
    camera,
    "s-reveal",
    `<div class="b-ring"><div class="b-tilt"><div class="b-squash">${ringMark("brand", 0)}</div></div></div>
     <div class="b-word">ASTRYA</div>
     <div class="b-line">L'assistant e-mail qui travaille avec vous.</div>`,
    T.ring - 0.1,
    T.inbox,
  );
  const ring = root.querySelector(".b-ring") as HTMLElement;
  const tilt = root.querySelector(".b-tilt") as HTMLElement;
  const squash = root.querySelector(".b-squash") as HTMLElement;
  const svg = ring.querySelector("svg")!;
  const word = root.querySelector(".b-word") as HTMLElement;
  const line = root.querySelector(".b-line") as HTMLElement;
  gsap.set(ring, { width: SIZE, height: SIZE });
  gsap.set([ring, word, line], { xPercent: -50, yPercent: -50, x: CX });
  gsap.set(tilt, { rotation: RING_TILT });
  gsap.set(word, { y: 690 });
  gsap.set(line, { y: 768 });

  ft(tl, ring, { y: CY, scale: 0.18, rotation: 60, filter: "blur(6px)", opacity: 1 }, { y: RY, scale: 1, rotation: 0, filter: "blur(0px)", duration: 2.0, ease: "cine" }, T.ring);
  igniteRing(tl, svg, T.ring + 0.05, 1.7);
  shockwave(T.ring + 0.1, 1.6, CX, CY - 20, 1150, 0.55, 3);
  burst(T.ring + 0.05, 1.5, CX, CY - 30, 150, 720, 61, 0.55);
  orbitDust(T.ring + 0.4, T.dive - T.ring, CX, RY, 420, 165, 150, 63);
  tl.to(atmos, { core: 0.9, duration: 0.5, ease: "sine.out" }, T.ring);
  tl.to(atmos, { core: 0.5, duration: 2.2, ease: "sine.inOut" }, T.ring + 0.6);
  tl.to(atmos, { leak: 0.22, halo: 0.6, duration: 2, ease: "sine.inOut" }, T.ring);
  cue("hit", T.ring, undefined, 1.0);
  cue("chime", T.ring + 0.3, undefined, 0.5);

  const cs = chars(word);
  ft(tl, cs, { opacity: 0, filter: "blur(14px)", y: (i: number) => (i % 2 ? 22 : -22), scaleY: 1.5 }, { opacity: 1, filter: "blur(0px)", y: 0, scaleY: 1, duration: 1.7, ease: "cine", stagger: { each: 0.075, from: "center" } }, T.word);
  ft(tl, word, { letterSpacing: "1.6em", paddingLeft: "1.6em" }, { letterSpacing: "0.9em", paddingLeft: "0.9em", duration: 2.3, ease: "cine" }, T.word);
  tl.add(titleIn(line, { stagger: 0.06, dur: 1.1, blur: 10, y: 14, glow: false }), T.tagline);
  glintRing(tl, svg, T.tagline + 0.4);
  cue("sweep", T.tagline + 0.4, 1.6, 0.3);

  // through the halo, into the product
  const z = T.dive;
  tl.to(word, { y: "+=70", opacity: 0, filter: "blur(14px)", scale: 0.92, duration: 0.7, ease: "exit" }, z - 0.1);
  tl.to(line, { y: "+=60", opacity: 0, filter: "blur(10px)", duration: 0.6, ease: "exit" }, z - 0.15);
  tl.to(tilt, { rotation: 0, duration: 0.8, ease: "cineInOut" }, z);
  tl.to(squash, { scaleY: RING_A / RING_B, duration: 0.8, ease: "cineInOut" }, z);
  tl.to(ring, { y: CY, duration: 0.8, ease: "cineInOut" }, z);
  tl.to(ring, { scale: 9, duration: 1.0, ease: "expo.in" }, z + 0.45);
  tl.to(ring, { opacity: 0, filter: "blur(10px)", duration: 0.25, ease: "sine.in" }, z + 1.2);
  tl.to(atmos, { warp: 0.9, zoom: 1.5, duration: 1.0, ease: "expo.in" }, z + 0.35);
  tl.to(atmos, { warp: 0, duration: 0.9, ease: "cine" }, z + 1.35);
  tl.to(atmos, { zoom: 1.3, core: 0.16, duration: 1.4, ease: "cine" }, z + 1.35);
  cue("riser", z + 0.1, 1.2, 0.7);
  cue("whoosh", z + 0.95, 1.0, 0.8);
  void H;
}
