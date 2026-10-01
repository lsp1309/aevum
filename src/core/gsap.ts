import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(CustomEase, DrawSVGPlugin, SplitText, ScrambleTextPlugin);

/**
 * Motion vocabulary of the film. Every scene speaks with these curves so the
 * whole piece feels like one continuous camera, not a collection of effects.
 */
CustomEase.create("cine", "M0,0 C0.16,1 0.3,1 1,1"); // long, soft deceleration (arrivals)
CustomEase.create("cineInOut", "M0,0 C0.7,0 0.18,1 1,1"); // camera moves: slow out, glide in
CustomEase.create("glide", "M0,0 C0.45,0 0.2,1 1,1"); // UI morphs
CustomEase.create("suck", "M0,0 C0.55,0 0.9,0.35 1,1"); // accelerating pull (exits into a point)
CustomEase.create("exit", "M0,0 C0.5,0 0.75,0.2 1,1"); // gentle accelerating departure
CustomEase.create("spring", "M0,0 C0.14,0.86 0.26,1.14 0.46,1.06 0.62,0.99 0.78,0.995 1,1"); // one soft overshoot
CustomEase.create("press", "M0,0 C0.3,0 0.2,1 1,1");
CustomEase.create("breath", "M0,0 C0.37,0 0.63,1 1,1");

gsap.defaults({ ease: "cine", duration: 1 });
// Timeline is the single source of truth: never let GSAP skip frames to "catch up".
gsap.ticker.lagSmoothing(500, 33);

export { gsap, CustomEase, SplitText };
