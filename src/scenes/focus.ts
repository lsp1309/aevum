import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, share, fmt } from "../core/stage";
import { chars, words, typeChars } from "../core/text";
import { icon } from "../core/icons";
import { T } from "../timing";
import "./focus.css";

/** The draft, in stage px. */
const DOC = fmt({ x: 372, y: 236, w: 1176, h: 648 }, { x: 60, y: 520, w: 960, h: 760 });

/**
 * FOCUS. The protected focus block opens into the work it protects: a draft,
 * written by you, while ASTRYA quietly handles the inbox in the background.
 */
export function buildFocus(tl: gsap.core.Timeline) {
  const root = html(`<section class="scene" id="s-focus">
    <div class="fc-bg"><div class="fc-surface"></div><div class="fc-blue"></div></div>
    <div class="fc-doc" style="left:${DOC.x}px;top:${DOC.y}px;width:${DOC.w}px;height:${DOC.h}px">
      <div class="fc-kind mono">Draft</div>
      <h2 class="fc-title">Q4 Launch Plan</h2>
      <p class="fc-p">Northline opens in Geneva, Zurich and Milan. The first market proves the model; the next two scale it.</p>
      <p class="fc-type">Launch the first market by March, with the whole team on it.<span class="caret fc-caret"></span></p>
    </div>
    <div class="fc-toast card soft"><span class="ft-ico">${icon.sparkle}</span><span>3 new messages handled</span><span class="ft-dim">· nothing needs you</span></div>
  </section>`);
  camera.appendChild(root);
  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const at = (f: number) => T.focus + (f - 50.2); // film seconds (1:1 here)
  const bg = q(".fc-bg");
  const doc = q(".fc-doc");
  const from = share.focusRect as { x: number; y: number; w: number; h: number };
  gsap.set(bg, { left: DOC.x, top: DOC.y, width: DOC.w, height: DOC.h });
  gsap.set(root, { perspective: 1600 });

  tl.set(root, { autoAlpha: 1 }, at(50.0));
  // the focus block grows into the page
  tl.fromTo(
    bg,
    { left: from.x, top: from.y, width: from.w, height: from.h, borderRadius: 12, rotationX: 0 },
    { left: DOC.x, top: DOC.y, width: DOC.w, height: DOC.h, borderRadius: 24, duration: 0.85, ease: "cineInOut" },
    at(50.05),
  );
  tl.fromTo(q(".fc-blue"), { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "sine.inOut" }, at(50.15));
  cue("whoosh", at(50.05), 0.9, 0.4);
  tl.fromTo([bg, doc], { rotationX: 7, rotationY: -5, transformOrigin: "50% 60%" }, { rotationX: 0, rotationY: 0, duration: 1.6, ease: "cine" }, at(50.2));

  tl.fromTo(q(".fc-kind"), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6, ease: "cine" }, at(50.55));
  tl.fromTo(chars(q(".fc-title")), { opacity: 0, filter: "blur(10px)", y: 14 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.9, stagger: 0.022, ease: "cine" }, at(50.6));
  tl.fromTo(words(q(".fc-p")), { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.018, ease: "cine" }, at(50.8));

  // you write; the caret rides the line
  const caret = q(".fc-caret");
  const typed = typeChars(q(".fc-type"), caret, 0.031);
  tl.fromTo(caret, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at(51.0));
  tl.add(typed.tl, at(51.15));
  const end = at(51.15) + typed.count * 0.031;
  for (let k = 0; k < 5; k++) tl.to(caret, { opacity: k % 2 ? 1 : 0.15, duration: 0.18, ease: "none" }, end + 0.1 + k * 0.32);
  for (let k = 0; k < 9; k++) cue("click", at(51.2) + k * 0.21, undefined, 0.12);

  // meanwhile, quietly
  const toast = q(".fc-toast");
  tl.fromTo(toast, { opacity: 0, y: 18, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "cine" }, at(52.05));
  tl.fromTo(q(".ft-ico"), { scale: 0.4, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.6, ease: "spring" }, at(52.15));
  cue("chime", at(52.1), undefined, 0.4);
  tl.to(toast, { opacity: 0, y: 10, filter: "blur(6px)", duration: 0.5, ease: "sine.in" }, at(53.0));

  // a slow push while you work
  tl.fromTo(root, { scale: 1 }, { scale: 1.025, transformOrigin: "50% 50%", duration: 3.2, ease: "sine.inOut" }, at(50.4));

  // the page lets go — the halo sweeps in over it
  tl.to([bg, doc], { opacity: 0, filter: "blur(10px)", scale: 0.97, duration: 0.75, ease: "sine.in" }, at(53.35));
  tl.set(root, { autoAlpha: 0 }, at(54.2));
}
