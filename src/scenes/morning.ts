import { gsap } from "../core/gsap";
import { cue } from "../core/clock";
import { camera, html, atmos, share, UI_SCALE, placeUI, toStage, fmt } from "../core/stage";
import { chars, words } from "../core/text";
import { icon } from "../core/icons";
import { PEOPLE } from "../data";
import { T } from "../timing";
import "./morning.css";

/** The "Today" strip (authored px, relative to the card). */
const CARD = fmt({ x: 330, y: 590, w: 1260, h: 200 }, { x: 380, y: 508, w: 1160, h: 200 });
const BLOCKS = fmt(
  [
    { x: 148, w: 170 },
    { x: 500, w: 470 },
    { x: 1010, w: 210 },
  ],
  [
    { x: 40, w: 170 },
    { x: 236, w: 470 },
    { x: 730, w: 390 },
  ],
);
const BY = 74;
const BH = 98;

/**
 * CALM. A quiet morning: one greeting, what needs you, and a day whose focus
 * time is protected. Composition follows the original: greeting top-left of a
 * centred "Today" strip, focus block in the middle.
 */
export function buildMorning(tl: gsap.core.Timeline) {
  const Z = PEOPLE.ziyad;
  const L = PEOPLE.luka;
  const root = html(`<section class="scene" id="s-morning">
    <div class="mo-world">
      <h1 class="mo-hello">Good morning, ${Z.name}</h1>
      <p class="mo-sub"><b>2 things</b> need you today. <span class="mo-handled"><i></i>ASTRYA is handling the rest</span></p>
      <div class="mo-today card" style="left:${CARD.x}px;top:${CARD.y}px;width:${CARD.w}px;height:${CARD.h}px">
        <div class="td-label mono">Today</div>
        <div class="td-rail"></div>
        <div class="blk blk-muted" style="left:${BLOCKS[0].x}px;width:${BLOCKS[0].w}px;top:${BY}px;height:${BH}px"><b>Ops sync</b><span>09:00 – 09:30</span></div>
        <div class="blk blk-focus" style="left:${BLOCKS[1].x}px;width:${BLOCKS[1].w}px;top:${BY}px;height:${BH}px"><b>${icon.shield}Focus · Q4 launch plan</b><span>10:00 – 11:30 · protected</span><i class="blk-sheen"></i></div>
        <div class="blk blk-amber" style="left:${BLOCKS[2].x}px;width:${BLOCKS[2].w}px;top:${BY}px;height:${BH}px"><b>Pricing call · ${L.name}</b><span>14:30 – 15:30</span></div>
        <div class="td-now" style="left:${BLOCKS[1].x - 26}px"><i></i></div>
      </div>
    </div>
  </section>`);
  camera.appendChild(root);
  const sm = UI_SCALE.morning;
  placeUI(root, sm);

  const q = (s: string) => root.querySelector(s) as HTMLElement;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const world = q(".mo-world");
  const at = (f: number) => T.morning + (f - 47.4); // film seconds (1:1 here)
  gsap.set(world, { transformOrigin: "960px 560px" });

  tl.set(root, { autoAlpha: 1 }, at(47.1));
  tl.to(atmos, { halo: 0.5, leak: 0.18, core: 0.12, stars: 0.5, duration: 1.6, ease: "sine.inOut" }, at(46.9));

  // greeting — first alone near the centre, the frame then settles on the day
  const hello = q(".mo-hello");
  tl.fromTo(world, { x: fmt(190, 0), y: fmt(40, 60) }, { x: 0, y: 0, duration: 2.4, ease: "cine" }, at(47.15));
  tl.fromTo(
    chars(hello),
    { opacity: 0, filter: "blur(14px)", y: 26, rotationX: -60, transformOrigin: "50% 100% -30px" },
    { opacity: 1, filter: "blur(0px)", y: 0, rotationX: 0, duration: 1.3, ease: "cine", stagger: 0.026 },
    at(47.2),
  );
  tl.fromTo(hello, { letterSpacing: "0.01em" }, { letterSpacing: "-0.035em", duration: 2.0, ease: "cine" }, at(47.2));
  cue("soft", at(47.2), undefined, 0.4);
  tl.fromTo(words(q(".mo-sub")), { opacity: 0, filter: "blur(10px)", y: 12 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: 1.0, stagger: 0.045, ease: "cine" }, at(47.7));
  tl.fromTo(".mo-handled i", { scale: 0 }, { scale: 1, duration: 0.6, ease: "spring" }, at(48.1));

  // the day, its focus time protected
  const today = q(".mo-today");
  tl.fromTo(today, { z: -220, y: 50, rotationX: 16, opacity: 0, filter: "blur(10px)" }, { z: 0, y: 0, rotationX: 0, opacity: 1, filter: "blur(0px)", duration: 1.15, ease: "cine" }, at(48.1));
  tl.fromTo([q(".td-label"), q(".td-rail")], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.7, stagger: 0.06 }, at(48.35));
  const blocks = qa(".blk");
  tl.fromTo(blocks, { opacity: 0, scaleX: 0.4, filter: "blur(6px)", transformOrigin: "0% 50%" }, { opacity: 1, scaleX: 1, filter: "blur(0px)", duration: 0.85, ease: "cine", stagger: 0.1 }, at(48.45));
  blocks.forEach((_, i) => cue("tick", at(48.55 + i * 0.1), undefined, 0.3));
  tl.fromTo(".td-now", { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.6, ease: "spring" }, at(48.8));
  const focus = blocks[1];
  tl.fromTo(
    focus,
    { boxShadow: "inset 0 0 0 1px rgba(140,180,255,0.5), 0 0 0px rgba(80,130,255,0)" },
    { boxShadow: "inset 0 0 0 1.5px rgba(170,205,255,0.95), 0 0 44px rgba(80,130,255,0.75)", duration: 0.8, ease: "sine.inOut" },
    at(49.1),
  );
  tl.fromTo(focus.querySelector(".blk-sheen"), { xPercent: -120 }, { xPercent: 260, duration: 1.0, ease: "cineInOut", immediateRender: false }, at(49.2));
  cue("chime", at(49.2), undefined, 0.35);
  tl.to(world, { scale: 1.025, duration: 3.0, ease: "sine.inOut" }, at(47.4));

  // hand-off: the focus block opens into the work it protects
  tl.to(world, { scale: 1.07, filter: "blur(10px)", opacity: 0, duration: 0.65, ease: "sine.in" }, at(50.05));
  tl.to(focus, { opacity: 0, duration: 0.2 }, at(50.05));
  tl.set(root, { autoAlpha: 0 }, at(50.8));

  // stage-space rect of the focus block, at hand-off time (world settled, scale 1.025)
  const fx = CARD.x + BLOCKS[1].x;
  const fy = CARD.y + BY;
  const ws = 1.025;
  const wx = (v: number) => 960 + (v - 960) * ws;
  const wy = (v: number) => 560 + (v - 560) * ws;
  share.focusRect = {
    x: toStage(wx(fx), "x", sm),
    y: toStage(wy(fy), "y", sm),
    w: BLOCKS[1].w * ws * sm,
    h: BH * ws * sm,
  };
}
