import { gsap } from "../core/gsap";
import { onFrame, cue, clamp, smooth, lerp } from "../core/clock";
import { camera, overlay, html } from "../core/stage";
import { writeWords } from "../core/text";
import { ringMark } from "../core/icons";
import { P, show, ft, section, caption, makeCursor } from "./kit";
import { T } from "./timing";

/**
 * IV. The product, as it ships: the inbox sorted by priority, what Astrya
 * understood about one email, the reply it prepares (an « [À compléter] »
 * passage blocks the send until a person completes it), then a scheduled
 * send. Simplified interface, fictitious data — labelled as such on screen.
 */

// Window geometry (stage px)
const AX = 700;
const AY = 150;
const AW = 1100;
const AH = 780;
const SIDE = 210;
const HEAD = 128;
const ROW = 70;
const SEC = 34;

type Row = { from: string; subject: string; summary: string; cat: string; prio: "Urgent" | "Important" | "Normal" | "Faible" | "À vérifier"; time: string; hue: number; sec: number };
const SECTIONS = ["Urgent", "À traiter", "À vérifier", "Peut attendre"];
const ROWS: Row[] = [
  { from: "Marc Keller", subject: "Livraison bloquée : réponse attendue aujourd'hui", summary: "La livraison de demain n'est pas confirmée ; son chantier attend.", cat: "Client", prio: "Urgent", time: "08:14", hue: 210, sec: 0 },
  { from: "Sophie Morel", subject: "Réclamation : facture reçue en double", summary: "Demande l'annulation d'une des deux factures de septembre.", cat: "Client", prio: "Urgent", time: "08:02", hue: 330, sec: 0 },
  { from: "Julien Favre", subject: "Demande de devis pour 12 postes", summary: "Souhaite une offre avant la fin du mois.", cat: "Prospect", prio: "Important", time: "07:51", hue: 160, sec: 1 },
  { from: "Léa Martin", subject: "Rendez-vous jeudi ? Deux créneaux possibles", summary: "Propose jeudi 10 h ou 15 h.", cat: "Rendez-vous", prio: "Normal", time: "07:40", hue: 120, sec: 1 },
  { from: "Fiduciaire Rhône", subject: "Facture fournisseur F-2026-118", summary: "CHF 1'240.00, échéance le 30.11.", cat: "Facture", prio: "Normal", time: "07:22", hue: 40, sec: 1 },
  { from: "Avis bancaire", subject: "Changement de coordonnées bancaires", summary: "Sujet sensible : à vérifier avant toute action.", cat: "Administratif", prio: "À vérifier", time: "07:05", hue: 0, sec: 2 },
  { from: "Salon PME Romandie", subject: "Programme et inscriptions", summary: "Lettre d'information.", cat: "Newsletter", prio: "Faible", time: "06:30", hue: 190, sec: 3 },
];
/** Order in which the emails arrived (unsorted): index into ROWS. */
const ARRIVAL = [6, 3, 0, 4, 2, 5, 1];

const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function appShell(extraClass = "") {
  return `<div class="app ${extraClass}">
    <aside class="side">
      <div class="brandmini">${ringMark("mini-ring", -31)}<span>ASTRYA</span></div>
      <nav>
        <a class="on">Boîte de réception<i>7</i></a>
        <a>Validations<i>2</i></a>
        <a>Tâches</a>
        <a>Automatisations</a>
        <a>Finance</a>
      </nav>
      <div class="sendstate"><span class="dot"></span>Envois actifs</div>
    </aside>
    <main>
      <header class="ahead">
        <div class="ahead-t"><h3>Boîte de réception</h3><span class="sorted">Trié par Astrya</span></div>
        <div class="tabs"><span class="on">À traiter</span><span>Urgent</span><span>À vérifier</span><span>Peut attendre</span></div>
      </header>
      <div class="list"></div>
    </main>
  </div>`;
}

export function rowMarkup(r: Row, i: number) {
  return `<div class="row" data-i="${i}">
    <span class="av" style="--h:${r.hue}">${initials(r.from)}</span>
    <div class="rb"><div class="r1"><b>${r.from}</b><span>${r.subject}</span></div><div class="r2">${r.summary}</div></div>
    <div class="rc"><span class="prio p-${r.prio === "À vérifier" ? "rev" : r.prio.toLowerCase()}">${r.prio}</span><span class="cat">${r.cat}</span></div>
    <em>${r.time}</em>
  </div>`;
}

/** Final (sorted) slot of every row, with section headers in between. */
export function sortedLayout() {
  const yRow: number[] = [];
  const ySec: number[] = [];
  let y = 0;
  SECTIONS.forEach((_, s) => {
    ySec[s] = y;
    y += SEC;
    ROWS.forEach((r, i) => {
      if (r.sec === s) {
        yRow[i] = y;
        y += ROW;
      }
    });
    y += 6;
  });
  return { yRow, ySec };
}

export { ROWS, SECTIONS, AX, AY, AW, AH, SIDE, HEAD, ROW };

export function buildProduct(tl: gsap.core.Timeline) {
  const root = section(camera, "s-product", `<div class="rig">${appShell()}</div>`, T.inbox - 0.2, T.calm + 0.2);
  const rig = root.querySelector(".rig") as HTMLElement;
  const app = root.querySelector(".app") as HTMLElement;
  const list = app.querySelector(".list") as HTMLElement;
  gsap.set(app, { left: AX, top: AY, width: AW, height: AH });

  // rows + section headers
  const { yRow, ySec } = sortedLayout();
  const heads = SECTIONS.map((s) => {
    const el = html(`<div class="sec">${s}</div>`);
    list.appendChild(el);
    return el;
  });
  const rows = ROWS.map((r, i) => {
    const el = html(rowMarkup(r, i));
    list.appendChild(el);
    return el;
  });
  const beam = html(`<div class="beam"></div>`);
  list.appendChild(beam);

  // ── the window arrives out of the light ───────────────────────────────
  tl.set(rig, { transformPerspective: 2400 }, 0);
  ft(tl, app, { opacity: 0, z: -700, rotationY: -16, rotationX: 8, filter: "blur(16px)" }, { opacity: 1, z: 0, rotationY: -5, rotationX: 2, filter: "blur(0px)", duration: 1.7, ease: "cine" }, T.inbox);
  tl.to(app, { rotationY: -2, rotationX: 1, duration: T.focus - T.inbox - 1.7, ease: "sine.inOut" }, T.inbox + 1.7);
  cue("soft", T.inbox, undefined, 0.8);

  // unsorted at first: arrival order, no sections, no labels
  ARRIVAL.forEach((ri, k) => tl.set(rows[ri], { y: k * ROW }, 0));
  tl.set(heads, { opacity: 0, y: (i: number) => ySec[i] }, 0);
  tl.set(app.querySelectorAll(".rc, .r2"), { opacity: 0 }, 0);
  tl.set(app.querySelector(".sorted"), { opacity: 0, scale: 0.9 }, 0);
  // a beam reads every message, top to bottom
  ft(tl, beam, { opacity: 0, y: 0 }, { opacity: 1, duration: 0.15, ease: "none" }, T.sort - 0.75);
  tl.to(beam, { y: ARRIVAL.length * ROW, duration: 0.8, ease: "sine.inOut" }, T.sort - 0.7);
  tl.to(beam, { opacity: 0, duration: 0.2, ease: "none" }, T.sort + 0.05);
  ARRIVAL.forEach((ri, k) => {
    const at = T.sort - 0.7 + (k / ARRIVAL.length) * 0.8;
    tl.fromTo(rows[ri], { backgroundColor: "rgba(120,160,255,0)" }, { backgroundColor: "rgba(120,160,255,0.16)", duration: 0.12, ease: "none", immediateRender: false }, at);
    tl.to(rows[ri], { backgroundColor: "rgba(120,160,255,0)", duration: 0.5, ease: "sine.out" }, at + 0.12);
    tl.to(rows[ri].querySelectorAll(".rc"), { opacity: 1, duration: 0.35, ease: "sine.out" }, at + 0.05);
    cue("tick", at, undefined, 0.45);
  });
  // …then everything takes its place
  rows.forEach((el, i) => {
    tl.to(el, { y: yRow[i], duration: 0.9, ease: "glide" }, T.sort + 0.15 + i * 0.05);
    tl.to(el.querySelector(".r2"), { opacity: 1, duration: 0.5, ease: "sine.out" }, T.sort + 0.7 + i * 0.05);
  });
  heads.forEach((h, i) => tl.to(h, { opacity: 1, duration: 0.5, ease: "sine.out" }, T.sort + 0.55 + i * 0.07));
  tl.to(app.querySelector(".sorted"), { opacity: 1, scale: 1, duration: 0.6, ease: "spring" }, T.sort + 0.9);
  cue("chime", T.sort + 0.9, undefined, 0.5);

  caption(tl, overlay, "cap-l", "Chaque e-mail,<br>trié et priorisé.", T.inbox + 0.6, T.focus - 0.1);
  caption(tl, overlay, "cap-s", "Résumé, catégorie, priorité, échéance.", T.sort + 0.4, T.focus - 0.1);

  // ── V. into Marc's email: what Astrya understood ──────────────────────
  const flip = html(`<div class="flip">
    <div class="face front">
      <div class="fh"><span class="av" style="--h:210">MK</span><div><b>Marc Keller</b><span>Livraison bloquée : réponse attendue aujourd'hui</span></div><em>08:14</em></div>
      <div class="ftitle">Ce qu'Astrya a compris</div>
      <p class="summary">Le chantier de M. Keller attend la livraison prévue demain, qui n'est pas encore confirmée. Il demande une réponse aujourd'hui.</p>
      <div class="facts">
        <div><span>Catégorie</span><b>Client</b></div>
        <div><span>Priorité</span><b class="urg">Urgent</b></div>
        <div><span>Intention</span><b>Suivi de commande</b></div>
        <div><span>Échéance</span><b>Aujourd'hui</b></div>
        <div><span>Agent</span><b>Support</b></div>
      </div>
      <div class="why"><span>Pourquoi ce classement ?</span><ul><li>Client existant</li><li>Délai explicite : aujourd'hui</li><li>Livraison bloquée, impact direct sur le chantier</li></ul></div>
      <div class="ff"><button class="btn primary prep">Préparer une réponse</button></div>
    </div>
    <div class="face back">
      <div class="fh"><span class="spark">${ringMark("mini-ring", -31)}</span><div><b>Réponse préparée par Astrya</b><span>À : Marc Keller · Objet : Re: Livraison bloquée</span></div><em class="tone">Ton : chaleureux</em></div>
      <div class="body">Bonjour Monsieur Keller,<br><br>Merci pour votre message. Je comprends l'urgence pour votre chantier. Votre livraison est confirmée pour <span class="ph"><span class="pa">[À compléter : date de livraison]</span><span class="pb">jeudi 14 novembre, 8 h</span></span>. Je vous transmets le bon de livraison dès qu'il est prêt.<br><br>Meilleures salutations,<br>Camille Rochat</div>
      <div class="bf">
        <span class="hint"><span class="h1">Complétez les passages « [À compléter] » avant d'envoyer.</span><span class="h2">Prête à partir : vous validez chaque envoi.</span></span>
        <div class="btns"><button class="btn sched">Programmer</button><button class="btn primary send">Envoyer</button></div>
        <div class="pop"><b>Programmer l'envoi</b><span>Dans 1 heure</span><span class="pick">Demain · 07:30</span><span>Lundi · 08:00</span></div>
        <div class="done"><i>✓</i>Envoi programmé · demain 07:30</div>
      </div>
    </div>
  </div>`);
  root.appendChild(flip);
  const front = flip.querySelector(".front") as HTMLElement;
  const back = flip.querySelector(".back") as HTMLElement;
  const FX = 760;
  const FY = 170;
  gsap.set(flip, { left: FX, top: FY, width: 1000, height: 640, transformPerspective: 2400 });
  show(flip, T.focus - 0.05, T.calm);

  // the row lifts out of the list and opens into the card
  const r0 = rows[0];
  tl.to(r0, { backgroundColor: "rgba(120,160,255,0.2)", duration: 0.3, ease: "sine.out" }, T.focus - 0.35);
  const rowTop = AY + HEAD + yRow[0];
  ft(
    tl,
    flip,
    { opacity: 0, scaleX: (AW - SIDE - 40) / 1000, scaleY: ROW / 640, x: AX + SIDE + 20 - FX, y: rowTop - FY, transformOrigin: "0% 0%", rotationY: 0, z: 0 },
    { opacity: 1, scaleX: 1, scaleY: 1, x: 0, y: 0, duration: 0.9, ease: "cineInOut" },
    T.focus,
  );
  tl.to(app, { filter: "blur(7px) brightness(0.55)", z: -160, duration: 0.9, ease: "cineInOut" }, T.focus);
  cue("whoosh", T.focus, 0.8, 0.5);
  const fronts = front.querySelectorAll(".fh, .ftitle, .facts > div, .why, .ff");
  ft(tl, fronts, { opacity: 0, y: 12, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.06, ease: "cine" }, T.analysis);
  const sum = front.querySelector(".summary") as HTMLElement;
  tl.add(writeWords(sum, null, 0.045), T.analysis + 0.25);
  const why = front.querySelectorAll(".why li");
  ft(tl, why, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.18, ease: "cine" }, T.analysis + 1.6);
  cue("click", T.analysis + 0.3, undefined, 0.5);
  caption(tl, overlay, "cap-l", "Il comprend ce qui est urgent<br>pour votre entreprise.", T.analysis, T.draft + 0.2, "width:520px");

  // the pointer asks for a reply, the card turns
  const cur = makeCursor(overlay);
  show(cur.el, T.analysis + 1.8, T.scheduled + 0.6);
  ft(tl, cur.el, { x: 1500, y: 1000, opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, T.analysis + 1.8);
  cur.move(tl, 1600, 768, T.analysis + 1.9, 1.1);
  cur.press(tl, T.draft - 0.25);
  tl.to(front.querySelector(".prep"), { scale: 0.96, duration: 0.08 }, T.draft - 0.25);
  tl.to(front.querySelector(".prep"), { scale: 1, duration: 0.2 }, T.draft - 0.17);
  tl.set(flip, { transformOrigin: "50% 50%" }, T.draft - 0.02);
  tl.to(flip, { rotationY: 180, z: 60, duration: 0.95, ease: "cineInOut" }, T.draft);
  tl.to(flip, { z: 0, duration: 0.6, ease: "cine" }, T.draft + 0.95);
  cue("whoosh", T.draft, 0.7, 0.6);
  onFrame((t) => {
    const back180 = t >= T.draft + 0.47;
    front.style.visibility = back180 ? "hidden" : "inherit";
    back.style.visibility = back180 ? "inherit" : "hidden";
  });

  // the reply writes itself; an [À compléter] passage stays open
  const body = back.querySelector(".body") as HTMLElement;
  const ph = back.querySelector(".ph") as HTMLElement;
  const pa = back.querySelector(".pa") as HTMLElement;
  const pb = back.querySelector(".pb") as HTMLElement;
  const send = back.querySelector(".send") as HTMLElement;
  const h1 = back.querySelector(".h1") as HTMLElement;
  const h2 = back.querySelector(".h2") as HTMLElement;
  tl.set(pb, { opacity: 0, filter: "blur(6px)" }, 0);
  tl.set(h2, { opacity: 0 }, 0);
  tl.set(send, { opacity: 0.38 }, 0);
  ft(tl, back.querySelectorAll(".fh, .bf"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "cine" }, T.draft + 0.5);
  tl.add(writeWords(body, null, 0.038), T.draft + 0.65);
  for (let i = 0; i < 10; i++) cue("tick", T.draft + 0.7 + i * 0.16, undefined, 0.25);
  caption(tl, overlay, "cap-l", "Il prépare la réponse.<br>Vous validez.", T.draft + 0.3, T.schedule - 0.15);

  // the pointer tries to send: blocked until the passage is completed
  cur.move(tl, 1640, 778, T.block - 0.55, 0.6);
  cur.press(tl, T.block);
  tl.fromTo(ph, { boxShadow: "0 0 0 0 rgba(130,170,255,0)" }, { boxShadow: "0 0 0 6px rgba(130,170,255,0.28)", duration: 0.25, ease: "sine.out", immediateRender: false }, T.block);
  tl.to(ph, { boxShadow: "0 0 0 0 rgba(130,170,255,0)", duration: 0.8, ease: "sine.inOut" }, T.block + 0.3);
  tl.fromTo(h1, { color: "rgba(200,215,255,0.66)" }, { color: "rgba(235,242,255,1)", duration: 0.2, immediateRender: false }, T.block);
  tl.to(h1, { color: "rgba(200,215,255,0.66)", duration: 0.8 }, T.block + 0.4);
  cue("click", T.block, undefined, 0.6);
  // the person completes it
  const phBox = () => {
    let x = ph.offsetLeft;
    let y = ph.offsetTop;
    let n = ph.offsetParent as HTMLElement | null;
    while (n && n !== flip) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { x: FX + x + ph.offsetWidth * 0.5, y: FY + y + ph.offsetHeight * 0.6 };
  };
  const pbx = phBox();
  cur.move(tl, pbx.x, pbx.y, T.fill - 0.75, 0.6);
  cur.press(tl, T.fill - 0.1);
  tl.to(pa, { opacity: 0, filter: "blur(6px)", duration: 0.35, ease: "sine.in" }, T.fill);
  tl.to(pb, { opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "cine" }, T.fill + 0.2);
  tl.to(ph, { backgroundColor: "rgba(120,160,255,0)", borderColor: "rgba(120,160,255,0)", duration: 0.5, ease: "sine.inOut" }, T.fill + 0.3);
  cue("tick", T.fill + 0.2, undefined, 0.6);
  // ready: the person validates
  tl.to(h1, { opacity: 0, duration: 0.3 }, T.ready);
  tl.to(h2, { opacity: 1, duration: 0.4 }, T.ready + 0.2);
  tl.to(send, { opacity: 1, boxShadow: "0 0 26px rgba(90,140,255,0.55)", duration: 0.5, ease: "sine.out" }, T.ready);
  cue("chime", T.ready, undefined, 0.4);

  // …or schedules it
  const sched = back.querySelector(".sched") as HTMLElement;
  const pop = back.querySelector(".pop") as HTMLElement;
  const pick = back.querySelector(".pick") as HTMLElement;
  const done = back.querySelector(".done") as HTMLElement;
  cur.move(tl, 1495, 778, T.schedule - 0.55, 0.55);
  cur.press(tl, T.schedule);
  tl.to(sched, { scale: 0.96, duration: 0.08 }, T.schedule);
  tl.to(sched, { scale: 1, duration: 0.2 }, T.schedule + 0.08);
  ft(tl, pop, { opacity: 0, y: 12, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "cine" }, T.schedule + 0.1);
  cur.move(tl, 1480, 700, T.schedule + 0.35, 0.4);
  tl.to(pick, { backgroundColor: "rgba(110,150,255,0.28)", duration: 0.2 }, T.schedule + 0.6);
  cur.press(tl, T.scheduled - 0.25);
  tl.to(pop, { opacity: 0, y: 8, duration: 0.25, ease: "exit" }, T.scheduled - 0.12);
  ft(tl, done, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "spring" }, T.scheduled);
  tl.to(back.querySelector(".btns"), { opacity: 0.35, duration: 0.4 }, T.scheduled);
  tl.to(cur.el, { opacity: 0, duration: 0.4 }, T.scheduled + 0.2);
  cue("click", T.schedule, undefined, 0.5);
  cue("chime", T.scheduled, undefined, 0.6);
  caption(tl, overlay, "cap-l", "Envoyez maintenant,<br>ou au bon moment.", T.schedule - 0.05, T.auto + 0.1);

  // honesty label for the whole product part
  const note = html(`<div class="note">Interface simplifiée · données fictives</div>`);
  overlay.appendChild(note);
  show(note, T.inbox + 0.5, T.finale - 0.3);
  ft(tl, note, { opacity: 0 }, { opacity: 1, duration: 0.8 }, T.inbox + 0.5);
  tl.to(note, { opacity: 0, duration: 0.5 }, T.finale - 0.9);

  // the product steps back for the automation scene
  tl.to(flip, { z: -900, x: -260, rotationY: 200, opacity: 0, filter: "blur(10px)", duration: 1.1, ease: "exit" }, T.auto);
  tl.to(app, { z: -1100, opacity: 0, duration: 1.0, ease: "exit" }, T.auto);
  onFrame((t) => {
    // a slow push on the card while it is read
    if (t < T.focus || t > T.auto) return;
    const k = smooth(P(t, T.analysis, T.auto));
    flip.style.translate = `0 0 ${lerp(0, 50, k).toFixed(1)}px`;
    void clamp;
  });
}
