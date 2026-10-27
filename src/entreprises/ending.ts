import { gsap } from "../core/gsap";
import { onFrame, cue, smooth, lerp } from "../core/clock";
import { camera, overlay, html, atmos, CX, CY } from "../core/stage";
import { chars, titleIn } from "../core/text";
import { shockwave, burst, orbitDust } from "../core/fx";
import { ringMark, RING_TILT } from "../core/icons";
import { P, ft, section, caption, igniteRing, glintRing, flash } from "./kit";
import { appShell, rowMarkup, sortedLayout, ROWS, SECTIONS } from "./product";
import { T } from "./timing";

// ── V. l'automatisation ─────────────────────────────────────────────────
export function buildAutomation(tl: gsap.core.Timeline) {
  const cards = [
    `<div class="ac rule"><span class="k">Automatisation</span><h4>Facture reçue</h4>
      <div class="when"><i>Quand</i>Une facture est détectée</div>
      <div class="then"><i>Alors</i><ol><li>Classer comme facture</li><li>Créer une tâche de paiement</li><li>Vous prévenir</li></ol></div>
      <span class="foot">Modèle prêt à l'emploi</span></div>`,
    `<div class="ac agents"><span class="k">Agents spécialisés</span><h4>Chaque e-mail au bon agent</h4>
      <div class="chips"><span>Tri</span><span>Commercial</span><span>Support</span><span>Administratif</span><span class="fin">Finance</span><span>Planification</span></div>
      <span class="foot">Aiguillage selon l'analyse de chaque message</span></div>`,
    `<div class="ac invoice"><span class="k">Facture fournisseur</span><h4>Fiduciaire Rhône</h4>
      <dl><dt>Montant</dt><dd>CHF 1'240.00</dd><dt>Échéance</dt><dd>30.11.2026</dd><dt>Référence</dt><dd>F-2026-118</dd></dl>
      <span class="state">À valider</span></div>`,
    `<div class="ac task"><span class="k">Tâche créée</span><h4>Payer la facture F-2026-118</h4>
      <div class="meta"><span>Échéance · 30.11</span><span>Statut · À faire</span></div>
      <span class="foot">Par l'automatisation « Facture reçue »</span></div>`,
    `<div class="ac control"><span class="k">Validations</span><h4>2 réponses en attente</h4>
      <div class="vrow"><span>Réponse à Julien Favre</span><b>Approuver</b></div>
      <div class="vrow"><span>Réponse à Léa Martin</span><b>Approuver</b></div>
      <div class="pause"><span>Pause des envois</span><span class="sw"><i></i></span></div></div>`,
  ];
  const root = section(camera, "s-auto", `<div class="rig"></div>`, T.auto - 0.1, T.calm + 1.2);
  const rig = root.querySelector(".rig") as HTMLElement;
  const beats = [T.rule, T.agents, T.invoice, T.task, T.control];
  const XS = [300, 770, 1240, 1710, 2180];
  const ZS = [-60, 0, 40, 0, -60];
  const els = cards.map((m, i) => {
    const el = html(m);
    rig.appendChild(el);
    gsap.set(el, { left: XS[i] - 190, top: CY - 175 });
    return el;
  });
  // links between the cards, drawn as each step hands over to the next
  const links = html(`<svg class="links" viewBox="0 0 2400 1080" width="2400" height="1080">${XS.slice(0, -1)
    .map((x, i) => `<path d="M${x + 198} ${CY + 35} L${XS[i + 1] - 198} ${CY + 35}"/>`)
    .join("")}</svg>`);
  rig.prepend(links);
  const paths = Array.from(links.querySelectorAll("path"));

  const pan = { x: 460 };
  tl.set(pan, { x: 460 }, 0);
  tl.to(pan, { x: -680, duration: T.calm - T.auto - 0.2, ease: "cineInOut" }, T.auto + 0.1);
  els.forEach((el, i) => {
    ft(tl, el, { opacity: 0, y: 40, filter: "blur(14px)", scale: 0.94 }, { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.9, ease: "cine" }, beats[i]);
    cue(i === 2 ? "chime" : "soft", beats[i], undefined, 0.5);
    if (i > 0) {
      ft(tl, paths[i - 1], { drawSVG: "0% 0%", opacity: 0.9 }, { drawSVG: "0% 100%", duration: 0.7, ease: "cineInOut" }, beats[i] - 0.35);
    }
  });
  // the agent chips light in turn, Finance takes the invoice
  const chips = els[1].querySelectorAll(".chips span");
  chips.forEach((c, k) => {
    const at = T.agents + 0.5 + k * 0.12;
    tl.fromTo(c, { backgroundColor: "rgba(110,150,255,0.08)" }, { backgroundColor: "rgba(110,150,255,0.32)", duration: 0.12, ease: "none", immediateRender: false }, at);
    tl.to(c, { backgroundColor: "rgba(110,150,255,0.08)", duration: 0.4 }, at + 0.14);
  });
  const fin = els[1].querySelector(".fin") as HTMLElement;
  tl.to(fin, { backgroundColor: "rgba(110,150,255,0.4)", color: "#ffffff", duration: 0.3 }, T.invoice - 0.2);
  // the pause switch: always within reach
  const sw = els[4].querySelector(".sw i") as HTMLElement;
  tl.fromTo(sw, { x: 0 }, { x: 18, duration: 0.3, ease: "cine", immediateRender: false }, T.control + 1.1);
  tl.to(sw, { x: 0, duration: 0.3, ease: "cine" }, T.control + 1.9);

  onFrame((t) => {
    if (t < T.auto - 0.1 || t > T.calm + 1.2) return;
    els.forEach((el, i) => {
      const sx = XS[i] + pan.x;
      const ry = -(sx - CX) / 55;
      el.style.translate = `${pan.x.toFixed(1)}px 0 ${ZS[i]}px`;
      el.style.rotate = `y ${ry.toFixed(2)}deg`;
    });
    links.style.translate = `${pan.x.toFixed(1)}px 0`;
  });
  // the camera lifts away for the calm
  tl.to(rig, { opacity: 0, filter: "blur(12px)", scale: 0.92, duration: 1.0, ease: "exit" }, T.calm - 0.1);
  tl.to(atmos, { halo: 0.45, core: 0.1, duration: 2, ease: "sine.inOut" }, T.auto);

  caption(tl, overlay, "cap-t", "Les tâches répétitives s'organisent.", T.rule, T.task + 0.5);
  caption(tl, overlay, "cap-t", "Vous gardez le contrôle.", T.task + 0.6, T.calm - 0.1);
}

// ── VI. le résultat ─────────────────────────────────────────────────────
export function buildCalm(tl: gsap.core.Timeline) {
  const root = section(camera, "s-calm", `<div class="rig">${appShell("calm")}</div>`, T.calm - 0.2, T.finale + 0.4);
  const app = root.querySelector(".app") as HTMLElement;
  const list = app.querySelector(".list") as HTMLElement;
  const { yRow, ySec } = sortedLayout();
  const STATE = ["Réponse programmée", "Brouillon prêt", "En validation", "Brouillon prêt", "Tâche créée", "À vérifier", "Rangée"];
  SECTIONS.forEach((s, i) => {
    const h = html(`<div class="sec">${s}</div>`);
    list.appendChild(h);
    gsap.set(h, { y: ySec[i] });
  });
  ROWS.forEach((r, i) => {
    const el = html(rowMarkup(r, i));
    el.querySelector(".rc")!.innerHTML = `<span class="st ${i === 5 ? "rev" : ""}">${STATE[i]}</span>`;
    list.appendChild(el);
    gsap.set(el, { y: yRow[i] });
  });
  gsap.set(app, { left: CX - 520, top: 110, width: 1040, height: 790 });
  ft(tl, app, { opacity: 0, z: -500, filter: "blur(14px)" }, { opacity: 1, z: 0, filter: "blur(0px)", duration: 1.4, ease: "cine" }, T.calm);
  ft(tl, list.querySelectorAll(".st"), { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.09, ease: "cine" }, T.calm + 0.6);
  tl.to(app, { z: 60, duration: 2.4, ease: "sine.inOut" }, T.calm + 1.4);
  tl.to(app, { opacity: 0, z: -400, filter: "blur(16px)", duration: 0.9, ease: "exit" }, T.finale - 0.6);
  caption(tl, overlay, "cap-b", "Moins de tri. Plus de temps pour vos clients.", T.calm + 0.7, T.finale - 0.3);
  cue("soft", T.calm, 2.5, 0.6);
}

// ── VII. final ──────────────────────────────────────────────────────────
export function buildFinale(tl: gsap.core.Timeline) {
  const RY = 400;
  const root = section(
    camera,
    "s-final",
    `<div class="b-ring"><div class="b-tilt">${ringMark("brand", 0)}</div></div>
     <div class="b-word">ASTRYA</div>
     <div class="f-slogan">Moins de tâches répétitives. Plus de maîtrise.</div>
     <div class="f-cta">Réservez votre démonstration</div>`,
    T.finale - 0.1,
    T.end + 1,
  );
  const ring = root.querySelector(".b-ring") as HTMLElement;
  const tilt = root.querySelector(".b-tilt") as HTMLElement;
  const svg = ring.querySelector("svg")!;
  const word = root.querySelector(".b-word") as HTMLElement;
  const slogan = root.querySelector(".f-slogan") as HTMLElement;
  const cta = root.querySelector(".f-cta") as HTMLElement;
  gsap.set(ring, { width: 640, height: 640 });
  gsap.set([ring, word, slogan, cta], { xPercent: -50, yPercent: -50, x: CX });
  gsap.set(tilt, { rotation: RING_TILT });
  gsap.set(word, { y: 650 });
  gsap.set(slogan, { y: 738 });
  gsap.set(cta, { y: 836 });

  tl.to(atmos, { core: 0.8, halo: 0.6, leak: 0.2, duration: 0.8, ease: "sine.out" }, T.finale);
  tl.to(atmos, { core: 0.45, duration: 2.5, ease: "sine.inOut" }, T.finale + 0.8);
  tl.to(atmos, { zoom: 1.12, duration: T.end - T.finale, ease: "sine.inOut" }, T.finale);
  flash(tl, T.finale + 0.05, 0.35, 0.1, 0.8);
  ft(tl, ring, { y: CY, scale: 0.2, rotation: -40, filter: "blur(6px)", opacity: 1 }, { y: RY, scale: 1, rotation: 0, filter: "blur(0px)", duration: 2.0, ease: "cine" }, T.finale);
  igniteRing(tl, svg, T.finale + 0.05, 1.7);
  shockwave(T.finale + 0.1, 1.5, CX, CY - 40, 1000, 0.55, 2);
  burst(T.finale + 0.05, 1.4, CX, CY - 40, 110, 640, 71, 0.55);
  orbitDust(T.finale + 0.5, T.end - T.finale - 0.4, CX, RY, 400, 155, 130, 73);
  cue("hit", T.finale + 0.05, undefined, 0.9);
  cue("chime", T.finale + 0.35, undefined, 0.5);

  const cs = chars(word);
  ft(tl, cs, { opacity: 0, filter: "blur(14px)", y: (i: number) => (i % 2 ? 20 : -20), scaleY: 1.5 }, { opacity: 1, filter: "blur(0px)", y: 0, scaleY: 1, duration: 1.7, ease: "cine", stagger: { each: 0.075, from: "center" } }, T.fword);
  ft(tl, word, { letterSpacing: "1.6em", paddingLeft: "1.6em" }, { letterSpacing: "0.9em", paddingLeft: "0.9em", duration: 2.3, ease: "cine" }, T.fword);
  tl.add(titleIn(slogan, { stagger: 0.07, dur: 1.2, blur: 12, y: 16 }), T.slogan);
  ft(tl, cta, { opacity: 0, y: 856, filter: "blur(8px)" }, { opacity: 1, y: 836, filter: "blur(0px)", duration: 1.0, ease: "cine" }, T.cta);
  glintRing(tl, svg, T.cta + 0.6);
  glintRing(tl, svg, T.end - 2.0);
  cue("sweep", T.cta + 0.6, 1.6, 0.3);
  cue("soft", T.cta, 3.0, 0.5);
  onFrame((t) => {
    if (t < T.finale) return;
    // the halo floats, barely
    const k = smooth(P(t, T.finale + 2, T.end));
    tilt.style.translate = `0 ${lerp(0, -8, k).toFixed(2)}px`;
  });
}
