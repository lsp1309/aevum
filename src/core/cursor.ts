import { gsap } from "./gsap";
import { html } from "./stage";

/**
 * A soft, adaptive pointer (iPadOS-like). It glides on curved paths, and
 * when it reaches a control it morphs into a highlight that wraps the
 * control — the control is pulled a few pixels towards it (magnetism).
 */
export class Cursor {
  el: HTMLElement;
  dot: HTMLElement;
  ring: HTMLElement;
  hl: HTMLElement;
  ripple: HTMLElement;
  x = 0;
  y = 0;

  constructor(parent: HTMLElement) {
    this.el = html(`<div class="cursor" aria-hidden="true">
      <div class="cursor-hl"></div><div class="cursor-ripple"></div><div class="cursor-ring"></div><div class="cursor-dot"></div>
    </div>`);
    parent.appendChild(this.el);
    this.dot = this.el.querySelector(".cursor-dot")!;
    this.ring = this.el.querySelector(".cursor-ring")!;
    this.hl = this.el.querySelector(".cursor-hl")!;
    this.ripple = this.el.querySelector(".cursor-ripple")!;
    gsap.set([this.dot, this.ring, this.hl, this.ripple], { xPercent: -50, yPercent: -50 });
    gsap.set(this.el, { opacity: 0 });
    gsap.set(this.hl, { width: 34, height: 34, borderRadius: 17, opacity: 0 });
    gsap.set(this.ripple, { scale: 0.2, opacity: 0 });
  }

  /** Enter from a point, arriving at (x, y). */
  enter(tl: gsap.core.Timeline, at: number, from: { x: number; y: number }, to: { x: number; y: number }, dur = 1.1) {
    tl.set(this.el, { x: from.x, y: from.y }, at);
    tl.fromTo(this.el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "cine" }, at);
    this.move(tl, at, to.x, to.y, dur);
    return this;
  }

  /** Curved glide: x and y follow different curves so the path arcs naturally. */
  move(tl: gsap.core.Timeline, at: number, x: number, y: number, dur = 0.9) {
    tl.to(this.el, { x, duration: dur, ease: "cineInOut" }, at);
    tl.to(this.el, { y, duration: dur * 0.92, ease: "power2.inOut" }, at + dur * 0.04);
    this.x = x;
    this.y = y;
    return this;
  }

  /** Morph the pointer into a highlight wrapping a control. */
  wrap(tl: gsap.core.Timeline, at: number, w: number, h: number, r: number, target?: HTMLElement) {
    tl.to(this.hl, { width: w + 14, height: h + 14, borderRadius: r + 7, opacity: 1, duration: 0.45, ease: "spring" }, at);
    tl.to(this.dot, { scale: 0.35, opacity: 0.5, duration: 0.3, ease: "cine" }, at);
    tl.to(this.ring, { scale: 0.4, opacity: 0, duration: 0.3, ease: "cine" }, at);
    if (target) tl.to(target, { x: 3, y: -1, duration: 0.5, ease: "spring" }, at);
    return this;
  }

  unwrap(tl: gsap.core.Timeline, at: number, target?: HTMLElement) {
    tl.to(this.hl, { width: 34, height: 34, borderRadius: 17, opacity: 0, duration: 0.4, ease: "cine" }, at);
    tl.to(this.dot, { scale: 1, opacity: 1, duration: 0.3 }, at);
    tl.to(this.ring, { scale: 1, opacity: 1, duration: 0.3 }, at);
    if (target) tl.to(target, { x: 0, y: 0, duration: 0.5, ease: "cine" }, at);
    return this;
  }

  press(tl: gsap.core.Timeline, at: number, target?: HTMLElement) {
    tl.to([this.dot, this.hl], { scale: 0.86, duration: 0.12, ease: "press" }, at);
    tl.to([this.dot, this.hl], { scale: 1, duration: 0.5, ease: "spring" }, at + 0.12);
    tl.fromTo(this.ripple, { scale: 0.2, opacity: 0.8 }, { scale: 2.6, opacity: 0, duration: 0.8, ease: "cine" }, at + 0.05);
    if (target) {
      tl.to(target, { scale: 0.965, duration: 0.12, ease: "press" }, at);
      tl.to(target, { scale: 1, duration: 0.6, ease: "spring" }, at + 0.12);
    }
    return this;
  }

  leave(tl: gsap.core.Timeline, at: number, dx = 120, dy = 80) {
    tl.to(this.el, { x: this.x + dx, y: this.y + dy, opacity: 0, scale: 0.7, duration: 0.7, ease: "exit" }, at);
    return this;
  }
}
