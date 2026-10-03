import { onFilmFrame } from "./film";
import { $, stage, viewport, html, W, H } from "./stage";
import { SHORT_CUTS } from "../timing";

/**
 * Cut transitions of the 30-second film. They live in FILM time (the master
 * timeline jumps at a cut), so they can straddle the join: the picture is
 * carried away into light on one side and lands out of it on the other.
 *
 *   whip     a lateral whip-pan: motion smear, a cyan → violet leak across
 *   punch    a zoom punch into white light and out of it, on the new scene
 *   flash    a hard flash with an anamorphic streak, a breath of scale
 *   implode  the frame collapses inwards into a violet bloom, then reopens
 *
 * Pure function of film time → seekable, identical live and in the render.
 */
const PRE = 0.28;
const POST = 0.42;

const sm = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function initTransitions() {
  const fx = $<HTMLCanvasElement>("#fx");
  const layer = html(`<div class="tx">
    <div class="tx-leak"></div>
    <div class="tx-flash"></div>
    <div class="tx-streak"></div>
  </div>`);
  stage.appendChild(layer);
  const leak = layer.querySelector(".tx-leak") as HTMLElement;
  const flash = layer.querySelector(".tx-flash") as HTMLElement;
  const streak = layer.querySelector(".tx-streak") as HTMLElement;
  let active = false;

  onFilmFrame((f) => {
    const c = SHORT_CUTS.find((x) => f > x.t - PRE && f < x.t + POST);
    if (!c) {
      if (active) {
        for (const el of [viewport, fx]) {
          el.style.transform = "";
          el.style.filter = "";
        }
        layer.style.visibility = "hidden";
      }
      active = false;
      return;
    }
    active = true;
    layer.style.visibility = "visible";
    const p = f - c.t; // seconds from the cut
    const a = p < 0 ? sm(1 + p / PRE) : 0; // 0 → 1 approaching the cut
    const b = p >= 0 ? 1 - sm(p / POST) : 0; // 1 → 0 leaving it
    const inA = a * a * a; // accelerate into the cut
    const outB = b * b; // decelerate out of it
    let tx = 0;
    let sc = 1;
    let blur = 0;
    let fl = 0;
    let st = 0;
    let leakX = -1;
    let tint = "205,225,255";
    switch (c.kind) {
      case "whip":
        tx = -W * 0.16 * inA + W * 0.16 * outB;
        blur = 16 * Math.max(inA, outB);
        fl = 0.45 * Math.max(inA, outB * 0.8);
        leakX = p < 0 ? 0.5 * a : 0.5 + 0.5 * (1 - b);
        tint = "150,215,255";
        break;
      case "punch":
        sc = p < 0 ? 1 + 0.22 * inA : 0.86 + 0.14 * (1 - outB);
        blur = 12 * Math.max(inA, outB);
        fl = Math.max(inA, outB) * 0.95;
        leakX = p < 0 ? 0.3 * a : 0.3 + 0.7 * (1 - b);
        break;
      case "flash":
        sc = p < 0 ? 1 + 0.05 * inA : 1.06 - 0.06 * (1 - outB);
        blur = 6 * Math.max(inA, outB);
        fl = Math.max(a * a, outB) * 0.85;
        st = Math.max(a * a, outB);
        leakX = p < 0 ? 0.4 * a : 0.4 + 0.6 * (1 - b);
        tint = "225,235,255";
        break;
      case "implode":
        sc = p < 0 ? 1 - 0.16 * inA : 1.12 - 0.12 * (1 - outB);
        blur = 12 * Math.max(inA, outB);
        fl = Math.max(inA, outB) * 0.8;
        st = Math.max(inA, outB) * 0.8;
        leakX = p < 0 ? 0.5 * a : 0.5 + 0.5 * (1 - b);
        tint = "196,170,255";
        break;
    }
    const tr = `translate3d(${tx}px,0,0) scale(${sc})`;
    for (const el of [viewport, fx]) {
      el.style.transform = tr;
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
    }
    flash.style.opacity = fl.toFixed(3);
    flash.style.background = `radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.95), rgba(${tint},0.55) 38%, rgba(70,110,255,0.18) 70%, rgba(40,60,200,0) 100%)`;
    streak.style.opacity = st.toFixed(3);
    streak.style.transform = `translate3d(0, ${H / 2 - 2}px, 0) scaleX(${(0.3 + 0.9 * st).toFixed(3)})`;
    const lk = Math.max(a, b);
    leak.style.opacity = (0.85 * lk).toFixed(3);
    leak.style.transform = `translate3d(${((leakX * 2 - 1) * W * 0.9).toFixed(1)}px,0,0) skewX(-18deg)`;
  });
}
