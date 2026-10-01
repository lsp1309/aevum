import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, atmos, box, share } from "../core/stage";
import { titleIn, writeWords } from "../core/text";
import { Cursor } from "../core/cursor";
import { icon, avatar, ringMark } from "../core/icons";
import { burst } from "../core/fx";
import { inbox } from "../data";
import { T } from "../timing";
import "./inbox.css";

/** Panel geometry (stage px). */
const P = { x: 420, y: 196, w: 1080, h: 688 };
/** Panel after sorting: shorter, re-centred. */
const P2 = { y: 262, h: 556 };
const ROW_H = 64;
const ROW0 = 100;
/** Email / composer card. */
const E = { x: 330, y: 168, w: 900, h: 690 };
/** Toast after sending. */
const TOAST = { x: 960 - 200, y: 84, w: 400, h: 60 };

export function buildInbox(tl: gsap.core.Timeline) {
  const rowsHTML = inbox
    .map(
      (m) => `<div class="row" data-id="${m.id}">
        <span class="row-bar"></span>
        ${avatar(m.initials, m.hue)}
        <div class="row-text"><div class="row-from">${m.from}</div><div class="row-subj">${m.subject}</div></div>
        <span class="chip row-tag ${m.tag.tone}">${m.tag.label}</span>
        <span class="row-time">${m.time}</span>
      </div>`,
    )
    .join("");

  const root = html(`<section class="scene" id="s-inbox">
    <div class="inbox card">
      <div class="ib-head">
        <div class="ib-title">Inbox</div>
        <span class="chip ib-count">47 unread</span>
        <div class="ib-status">
          <span class="chip ai st-read">${ringMark("st", -28).replace('class="ring-mark st"', 'class="ring-mark mini-ring"')}<span class="shimmer">ASTRYA is reading</span></span>
          <span class="chip ai st-done">${icon.check}<span>Sorted by ASTRYA</span></span>
        </div>
      </div>
      <div class="ib-rows">
        <div class="ib-label lab-a section-label">Needs you · 3</div>
        <div class="ib-label lab-b section-label">Can wait · 6</div>
        ${rowsHTML}
        <div class="stack-cover">
          <div class="sc-avatars">${["HL", "SP", "AF", "MC", "NR", "LR"].map((i, k) => avatar(i, 190 + k * 14)).join("")}</div>
          <div class="sc-text"><b>6 messages can wait</b><span>Summarized · nothing needs a reply today</span></div>
          <span class="chip muted">${icon.sparkle}Digest at 17:00</span>
        </div>
        <div class="ib-foot"><span class="spark">${icon.sparkle}</span>14 newsletters archived · 2 unsubscribed · 3 replies drafted</div>
        <div class="scan"><div class="scan-line"></div></div>
      </div>
    </div>

    <div class="mail-flip">
      <div class="face front card">
        <div class="sheen"></div>
        <div class="em-crumb mono">Inbox / Operations</div>
        <div class="em-title">Contract renewal — confirmation needed</div>
        <div class="em-avatar">${avatar("EB", 228)}</div>
        <div class="em-from"><b>Eva Brunner</b><span class="chip amber">Key supplier · Alpine Supplies</span></div>
        <div class="em-addr">eva.brunner@alpinesupplies.ch</div>
        <div class="em-time">Today, 09:12</div>
        <div class="em-rule"></div>
        <div class="em-body">
          <p>Hi Ziyad,</p>
          <p>Following up: the current contract expires <span class="hl">Friday</span>. Please confirm the renewal so we can lock the Q4 allocation. Without confirmation we cannot <span class="hl">hold the Geneva warehouse slot</span>.</p>
          <p>Best regards,<br/>Eva</p>
        </div>
        <div class="em-attach chip">${icon.paperclip}Supply agreement 2026–27.pdf <span class="dim">412 KB</span></div>
      </div>
      <div class="face back card">
        <div class="sheen"></div>
        <div class="cmp">
          <div class="cmp-head"><span class="cmp-ico">${icon.reply}</span><span class="cmp-title">Reply to Eva Brunner</span>
            <span class="chip ai cmp-ai">${ringMark("cmp", -28).replace('class="ring-mark cmp"', 'class="ring-mark mini-ring"')}Prepared by ASTRYA</span></div>
          <div class="cmp-meta"><span>To</span>eva.brunner@alpinesupplies.ch</div>
          <div class="cmp-meta"><span>Re</span>Contract renewal — confirmation needed</div>
          <div class="cmp-tone"><span class="tone-ind"></span><span class="tone">Formal</span><span class="tone on">Concise</span><span class="tone">Warm</span></div>
          <div class="cmp-body"><p>Hi Eva,</p><p>Thanks for the reminder — we confirm the renewal of the 2026–27 agreement. Please hold the Geneva warehouse slot; the signed copy follows today.</p><p>Best regards,</p><span class="caret"></span></div>
          <div class="cmp-foot">
            <span class="cmp-note">${icon.sparkle}Matched to your tone in 3 earlier threads with Eva</span>
            <span class="btn">Edit</span>
            <span class="btn primary send"><span class="btn-sheen"></span><span class="send-label">Approve &amp; send</span>
              <svg class="send-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <span class="send-done"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Sent</span>
            </span>
          </div>
        </div>
        <div class="toast"><span class="toast-ico">${icon.check}</span><span class="toast-text">Sent to <b>Eva Brunner</b></span><span class="toast-time">now</span></div>
      </div>
    </div>

    <div class="ai-sum card">
      <div class="as-head">${ringMark("as", -28).replace('class="ring-mark as"', 'class="ring-mark mini-ring"')}<span class="as-name">ASTRYA</span><span class="as-kind mono">Summary</span></div>
      <ul class="as-list">
        <li><span class="as-dot"></span><span>Renewal of the 2026–27 agreement is due <b>Friday</b>.</span></li>
        <li><span class="as-dot"></span><span>The Geneva warehouse slot is at risk without it.</span></li>
        <li><span class="as-dot"></span><span>Terms unchanged vs. 2025 — safe to confirm.</span></li>
      </ul>
      <div class="as-actions"><span class="btn primary as-draft"><span class="btn-sheen"></span>${icon.sparkle}Draft reply</span><span class="btn">Snooze</span></div>
    </div>

    <div class="reply-card card">
      <div class="rc-head">${avatar("EB", 228)}<div><b>Eva Brunner</b><span>Alpine Supplies · 2 min later</span></div></div>
      <div class="rc-body">Sharing the 2026–27 agreement draft for review. Happy to <span class="intent">walk through pricing on a call</span>.</div>
      <div class="rc-detect mono">${icon.sparkle}<span class="rc-detect-t">Meeting intent detected</span></div>
    </div>
  </section>`);
  camera.appendChild(root);

  const q = <E extends Element = HTMLElement>(s: string) => root.querySelector(s) as unknown as E;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const panel = q(".inbox");
  const rows = qa(".row");
  const byId = (id: string) => rows[inbox.findIndex((m) => m.id === id)];
  const flip = q(".mail-flip");
  const front = q(".face.front");
  const back = q(".face.back");
  const sum = q(".ai-sum");
  const reply = q(".reply-card");
  const cursor = new Cursor(root);

  Object.assign(panel.style, { left: `${P.x}px`, top: `${P.y}px`, width: `${P.w}px`, height: `${P.h}px` });
  // measure every target in its final layout before any morph state is applied
  gsap.set(flip, { left: E.x, top: E.y, width: E.w, height: E.h });
  const send = q(".send");
  const sb = box(send, back);
  const draft = q(".as-draft");
  const db = box(draft, root);
  const intent = q(".reply-card .intent");
  share.intentRect = box(intent, root);
  const bodyParas = qa(".em-body p");
  gsap.set(qa(".sheen, .btn-sheen"), { xPercent: -130 });
  const caret = q(".caret");
  const writer = writeWords(q(".cmp-body"), caret, 0.052);
  const nWords = q(".cmp-body").querySelectorAll(".w").length;
  rows.forEach((r, i) => gsap.set(r, { y: ROW0 + i * ROW_H }));

  const I = T.inbox;
  tl.set(root, { autoAlpha: 1 }, I - 1.2);

  // ── arrival: the panel rises out of the halo we just flew through ──────
  // framed inside the halo's opening while the halo approaches…
  tl.fromTo(
    panel,
    { scale: 0.14, rotationX: 16, opacity: 0, filter: "blur(10px)" },
    { scale: 0.28, rotationX: 9, opacity: 1, filter: "blur(2px)", duration: 0.85, ease: "sine.out" },
    I - 1.05,
  );
  // …then it decelerates into place as we pass through
  tl.to(panel, { scale: 1, rotationX: 0, filter: "blur(0px)", duration: 1.5, ease: "cine" }, I - 0.22);
  tl.add(titleIn(q(".ib-title"), { stagger: 0, dur: 1.1, blur: 8, y: 12, glow: false }), I - 0.4);
  tl.fromTo(".ib-count", { opacity: 0, x: -10, filter: "blur(6px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.9 }, I - 0.1);
  tl.fromTo(
    rows,
    { opacity: 0, y: (i) => ROW0 + i * ROW_H + 26, filter: "blur(6px)", rotationX: -30 },
    { opacity: 1, y: (i) => ROW0 + i * ROW_H, filter: "blur(0px)", rotationX: 0, duration: 1.1, ease: "cine", stagger: 0.055 },
    I - 0.55,
  );

  // ── AI reads: a scanning beam tags each message as it passes ───────────
  const scanAt = I + 1.25;
  const scanDur = 1.7;
  const scanFrom = ROW0 - 150;
  const scanTo = P.h - 86 + 40;
  tl.fromTo(".st-read", { opacity: 0, scale: 0.85, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "spring" }, I + 0.85);
  tl.fromTo(".st-read .shimmer", { backgroundPosition: "100% 0" }, { backgroundPosition: "-100% 0", duration: 1.0, ease: "none", repeat: 2 }, I + 0.9);
  cue("sweep", scanAt, scanDur, 0.45);
  tl.fromTo(".scan", { y: scanFrom, opacity: 0 }, { y: scanTo, opacity: 1, duration: scanDur, ease: "none" }, scanAt);
  tl.to(".scan", { opacity: 0, duration: 0.3 }, scanAt + scanDur - 0.3);
  rows.forEach((r, i) => {
    const rowMid = ROW0 + i * ROW_H + ROW_H / 2;
    const at = scanAt + ((rowMid - (scanFrom + 140)) / (scanTo - scanFrom)) * scanDur;
    tl.fromTo(r.querySelector(".row-tag"), { opacity: 0, scale: 0.6, filter: "blur(4px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "spring" }, at);
    tl.fromTo(r, { backgroundColor: "rgba(110,150,255,0)" }, { backgroundColor: "rgba(110,150,255,0.10)", duration: 0.15, ease: "none" }, at - 0.05);
    tl.to(r, { backgroundColor: "rgba(110,150,255,0)", duration: 0.6, ease: "sine.out" }, at + 0.12);
  });
  tl.to(".st-read", { opacity: 0, y: -8, filter: "blur(6px)", duration: 0.4, ease: "exit" }, scanAt + scanDur + 0.05);
  tl.fromTo(".st-done", { opacity: 0, y: 8, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, ease: "spring" }, scanAt + scanDur + 0.2);
  tl.to(".ib-count", { opacity: 0.4, duration: 0.6 }, scanAt + scanDur + 0.2);

  // ── re-sort: priorities rise, the rest folds into a deck ───────────────
  const sortAt = scanAt + scanDur + 0.25;
  const pri = inbox.filter((m) => m.priority <= 2).sort((a, b) => a.priority - b.priority);
  const low = inbox.filter((m) => m.priority > 2).sort((a, b) => a.priority - b.priority);
  const STACK_Y = 396;
  pri.forEach((m, k) => {
    const r = byId(m.id);
    gsap.set(r, { zIndex: 5 - k });
    const y = 132 + k * 68;
    tl.to(r, { y, duration: 1.3, ease: "cineInOut" }, sortAt + k * 0.06);
    tl.to(r, { scale: 1.025, boxShadow: "0 20px 40px -18px rgba(0,0,0,0.9)", duration: 0.55, ease: "sine.out" }, sortAt + k * 0.06);
    tl.to(r, { scale: 1, boxShadow: "0 0px 0px 0px rgba(0,0,0,0)", duration: 0.8, ease: "cine" }, sortAt + k * 0.06 + 0.55);
    tl.to(r, { backgroundColor: "rgba(34,48,92,0.97)", duration: 0.3 }, sortAt);
    tl.to(r, { backgroundColor: "rgba(52,72,130,0.42)", duration: 0.8 }, sortAt + 1.3);
    tl.to(r.querySelector(".row-bar"), { opacity: 1, scaleY: 1, backgroundColor: m.id === "eb" ? "#ffc178" : "#7ea4ff", duration: 0.7, ease: "spring" }, sortAt + 0.8 + k * 0.08);
  });
  low.forEach((m, k) => {
    const r = byId(m.id);
    gsap.set(r, { zIndex: 1 });
    const depth = Math.min(k, 3);
    tl.to(r, { y: STACK_Y + depth * 9, scale: 1 - depth * 0.035, duration: 1.2, ease: "cineInOut" }, sortAt + 0.12 + k * 0.05);
    tl.to(r.querySelectorAll(".row-text, .row-tag, .row-time, .avatar"), { opacity: 0, filter: "blur(4px)", duration: 0.4, ease: "sine.in" }, sortAt + 0.05 + k * 0.04);
    tl.to(r, { backgroundColor: `rgba(${40 - depth * 6},${56 - depth * 6},${100 - depth * 10},${0.95 - depth * 0.08})`, duration: 0.8 }, sortAt + 0.5);
    if (k > 3) tl.to(r, { opacity: 0, duration: 0.4 }, sortAt + 1.0);
  });
  tl.fromTo(".stack-cover", { opacity: 0, y: STACK_Y + 10, filter: "blur(6px)" }, { opacity: 1, y: STACK_Y, filter: "blur(0px)", duration: 0.9, ease: "cine" }, sortAt + 1.1);
  tl.fromTo(".sc-avatars .avatar", { x: (i) => -i * 26, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "spring", stagger: 0.04 }, sortAt + 1.2);
  tl.fromTo(".lab-a", { opacity: 0, x: -12, letterSpacing: "0.5em" }, { opacity: 1, x: 0, letterSpacing: "0.2em", duration: 1, ease: "cine" }, sortAt + 0.9);
  tl.fromTo(".lab-b", { opacity: 0, x: -12, letterSpacing: "0.5em" }, { opacity: 1, x: 0, letterSpacing: "0.2em", duration: 1, ease: "cine" }, sortAt + 1.05);
  tl.to(panel, { top: P2.y, height: P2.h, duration: 1.3, ease: "cineInOut" }, sortAt + 0.4);
  tl.fromTo(".ib-foot", { opacity: 0, y: 10, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "cine" }, sortAt + 1.5);

  // ── the user opens the one message that matters ────────────────────────
  const eva = byId("eb");
  const evaY = 132;
  const rowRect = { x: P.x + 14, y: P2.y + evaY, w: P.w - 28, h: ROW_H };
  const clickAt = sortAt + 2.6;
  cursor.enter(tl, clickAt - 1.3, { x: 1460, y: 1010 }, { x: P.x + 620, y: P2.y + evaY + 34 }, 1.15);
  tl.to(eva, { backgroundColor: "rgba(120,160,255,0.14)", duration: 0.35, ease: "sine.out" }, clickAt - 0.35);
  cue("click", clickAt);
  cursor.press(tl, clickAt, eva);

  // ── T: the row lifts out of the list and becomes the email ─────────────
  const m0 = clickAt + 0.12;
  gsap.set(flip, { left: rowRect.x, top: rowRect.y, width: rowRect.w, height: rowRect.h, visibility: "hidden" });
  tl.set(flip, { visibility: "visible" }, m0);
  tl.set(eva, { opacity: 0 }, m0 + 0.02);
  tl.fromTo(front, { borderRadius: 14 }, { borderRadius: 24, duration: 1.1, ease: "glide" }, m0);
  cue("whoosh", m0, 1.1, 0.45);
  tl.to(flip, { left: E.x, top: E.y, width: E.w, height: E.h, duration: 1.15, ease: "glide" }, m0);
  tl.to(panel, { scale: 0.93, z: -260, opacity: 0, filter: "blur(12px)", duration: 1.1, ease: "cineInOut" }, m0 + 0.05);
  cursor.leave(tl, m0 + 0.1, 160, 120);

  // header elements glide from their row positions into the email layout
  tl.fromTo(".em-title", { x: 92 - 48, y: 31 - 76, scale: 16.5 / 32, transformOrigin: "0% 0%" }, { x: 0, y: 0, scale: 1, duration: 1.15, ease: "glide" }, m0);
  tl.fromTo(".em-avatar", { x: 40 - 48, y: 13 - 140, scale: 38 / 46, transformOrigin: "0% 0%" }, { x: 0, y: 0, scale: 1, duration: 1.15, ease: "glide" }, m0);
  tl.fromTo(".em-from", { x: 92 - 108, y: 12 - 140, opacity: 0.6 }, { x: 0, y: 0, opacity: 1, duration: 1.15, ease: "glide" }, m0);
  tl.fromTo(".em-from .chip", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.8 }, m0 + 0.8);
  tl.fromTo(".em-crumb, .em-addr, .em-time", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, m0 + 0.7);
  tl.fromTo(".em-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: "cine" }, m0 + 0.8);
  tl.fromTo(
    bodyParas,
    { clipPath: "inset(0% 0% 100% 0%)", y: 18, opacity: 0, filter: "blur(4px)" },
    { clipPath: "inset(0% 0% -20% 0%)", y: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "cine", stagger: 0.12 },
    m0 + 0.95,
  );
  tl.fromTo(".em-attach", { opacity: 0, y: 10, filter: "blur(4px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 }, m0 + 1.5);

  // ── AI understands: key facts light up, a summary slides from behind ───
  const hl = qa(".em-body .hl");
  tl.to(hl, { backgroundSize: "100% 100%", color: "#ffffff", duration: 0.7, ease: "cineInOut", stagger: 0.4 }, m0 + 1.9);
  const s0 = m0 + 1.8;
  tl.fromTo(sum, { x: -300, z: -220, rotationY: -38, opacity: 0, filter: "blur(10px)" }, { x: 0, z: 0, rotationY: 0, opacity: 1, filter: "blur(0px)", duration: 1.3, ease: "cine" }, s0);
  tl.fromTo(".as-list li", { opacity: 0, x: -14, filter: "blur(5px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.14, ease: "cine" }, s0 + 0.5);
  tl.fromTo(".as-dot", { scale: 0 }, { scale: 1, duration: 0.6, stagger: 0.14, ease: "spring" }, s0 + 0.5);
  tl.fromTo(".as-actions .btn", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "cine" }, s0 + 1.0);
  tl.fromTo(".as-draft .btn-sheen", { xPercent: -120 }, { xPercent: 120, duration: 1.0, ease: "cineInOut" }, s0 + 1.4);

  // cursor → "Draft reply" (magnetic)
  const c2 = s0 + 1.3;
  cursor.enter(tl, c2, { x: 1500, y: 1000 }, { x: db.cx, y: db.cy }, 0.9);
  cursor.wrap(tl, c2 + 0.75, db.w, db.h, 13, draft);
  tl.fromTo(draft, { "--mx": "10%" }, { "--mx": "60%", duration: 0.6, ease: "cine" }, c2 + 0.6);
  cue("click", c2 + 1.15);
  cursor.press(tl, c2 + 1.15, draft);
  cursor.unwrap(tl, c2 + 1.4, draft);
  cursor.leave(tl, c2 + 1.45, 140, 80);

  // ── T: the email turns over — its back is the reply ───────────────────
  const f0 = c2 + 1.45;
  tl.to(sum, { x: -260, z: -320, rotationY: -40, opacity: 0, filter: "blur(10px)", duration: 0.85, ease: "exit" }, f0 - 0.05);
  cue("whoosh", f0, 1.4, 0.6);
  tl.to(flip, { rotationY: 180, duration: 1.4, ease: "cineInOut" }, f0);
  tl.to(flip, { z: -240, rotationX: 5, duration: 0.7, ease: "sine.inOut" }, f0);
  tl.to(flip, { z: 0, rotationX: 0, duration: 0.7, ease: "sine.inOut" }, f0 + 0.7);
  tl.fromTo(front.querySelector(".sheen"), { xPercent: -130 }, { xPercent: 130, duration: 0.7, ease: "sine.in" }, f0);
  tl.fromTo(back.querySelector(".sheen"), { xPercent: -130 }, { xPercent: 130, duration: 0.8, ease: "sine.out" }, f0 + 0.65);

  // composer: tone picked, words written
  const w0 = f0 + 1.1;
  tl.fromTo(".cmp-head, .cmp-meta, .cmp-tone", { opacity: 0, y: 12, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.07 }, w0 - 0.3);
  tl.fromTo(".tone-ind", { x: 0, width: 82 }, { x: 88, width: 92, duration: 0.7, ease: "spring" }, w0 + 0.35);
  tl.fromTo(".tone.on", { color: "rgba(196,212,255,0.5)" }, { color: "#ffffff", duration: 0.4 }, w0 + 0.45);
  tl.fromTo(caret, { opacity: 0 }, { opacity: 1, duration: 0.2 }, w0 + 0.6);
  tl.add(writer, w0 + 0.7);
  const typed = w0 + 0.7 + nWords * 0.052;
  tl.to(caret, { opacity: 0, duration: 0.15, repeat: 3, yoyo: true, ease: "steps(1)" }, typed + 0.3);
  tl.fromTo(".cmp-foot", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "cine" }, w0 + 0.4);

  // cursor → "Approve & send"
  const sendCx = E.x + sb.cx;
  const sendCy = E.y + sb.cy;
  const c3 = typed + 0.2;
  cursor.enter(tl, c3, { x: 1560, y: 1040 }, { x: sendCx, y: sendCy }, 0.95);
  cursor.wrap(tl, c3 + 0.8, sb.w, sb.h, 13, send);
  tl.fromTo(send, { "--mx": "0%" }, { "--mx": "70%", duration: 0.7, ease: "cine" }, c3 + 0.6);
  const pressAt = c3 + 1.2;
  cue("click", pressAt);
  cue("chime", pressAt + 0.85, undefined, 0.7);
  cursor.press(tl, pressAt, send);
  tl.to(".send-label", { opacity: 0, y: -12, filter: "blur(4px)", duration: 0.3, ease: "exit" }, pressAt + 0.05);
  tl.fromTo(".send-spin", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3 }, pressAt + 0.15);
  tl.fromTo(".send-spin circle", { drawSVG: "0% 20%" }, { drawSVG: "60% 95%", duration: 0.6, ease: "none" }, pressAt + 0.15);
  tl.fromTo(".send-spin", { rotation: 0 }, { rotation: 540, duration: 0.7, ease: "none" }, pressAt + 0.15);
  tl.to(".send-spin", { opacity: 0, scale: 0.6, duration: 0.2 }, pressAt + 0.75);
  tl.fromTo(".send-done", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "spring" }, pressAt + 0.85);
  tl.fromTo(".send-done path", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.45, ease: "cine" }, pressAt + 0.85);
  burst(pressAt + 0.85, 0.9, sendCx, sendCy, 40, 140, 61, 0.8);
  cursor.unwrap(tl, pressAt + 0.9, send);
  cursor.leave(tl, pressAt + 1.0, 160, 90);

  // ── T: the reply condenses into a toast and floats up ─────────────────
  const k0 = pressAt + 1.45;
  tl.to(".cmp", { opacity: 0, filter: "blur(8px)", scale: 0.96, duration: 0.4, ease: "exit" }, k0);
  cue("whoosh", k0, 0.95, 0.4);
  tl.to(flip, { left: TOAST.x, top: TOAST.y, width: TOAST.w, height: TOAST.h, duration: 0.95, ease: "glide" }, k0);
  tl.to(back, { borderRadius: 30, duration: 0.95, ease: "glide" }, k0);
  tl.fromTo(".toast", { opacity: 0, filter: "blur(6px)", scale: 1.4 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.7, ease: "cine" }, k0 + 0.3);
  tl.fromTo(".toast-ico", { scale: 0.4 }, { scale: 1, duration: 0.6, ease: "spring" }, k0 + 0.5);

  // ── Eva answers — and ASTRYA hears a meeting in it ────────────────────
  const r0 = k0 + 0.75;
  tl.fromTo(reply, { x: 530, y: 60, z: -240, rotationX: 22, opacity: 0, filter: "blur(10px)" }, { y: 0, z: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", duration: 1.3, ease: "cine" }, r0);
  // the camera pans: the reply slides aside as the calendar arrives
  tl.to(reply, { x: 0, duration: 1.7, ease: "cineInOut" }, T.work - 0.7);
  cue("tick", r0 + 0.2, undefined, 0.6);
  cue("sweep", r0 + 1.0, 0.8, 0.35);
  tl.to(".reply-card .intent", { backgroundSize: "100% 100%", color: "#ffffff", duration: 0.8, ease: "cineInOut" }, r0 + 1.0);
  tl.fromTo(".rc-detect", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6 }, r0 + 1.3);
  tl.to(".rc-detect-t", { scrambleText: { text: "Meeting intent detected", chars: "01·◆", speed: 0.5 }, duration: 0.8, ease: "none" }, r0 + 1.3);
  tl.to(atmos, { halo: 0.7, duration: 3 }, r0);

  // the toast exits upward as the next scene arrives
  tl.to(flip, { y: -140, duration: 0.9, ease: "exit" }, T.work + 0.2);
  tl.to(back, { opacity: 0, filter: "blur(8px)", duration: 0.8, ease: "exit" }, T.work + 0.25);

  // handoff to WORK
  share.reply = reply;
  share.intent = intent;
  share.inboxRoot = root;
}
