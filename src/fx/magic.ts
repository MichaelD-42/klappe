import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import { registry, type TransitionOpts } from "./transitions";
import type { Rect } from "../types";

const STAGE = { w: 1920, h: 1080 };
const FLY = 0.9;
const SVG = "http://www.w3.org/2000/svg";
const EASE = "power2.inOut";

export type Box = Rect;
type ScreenRect = { left: number; top: number; width: number; height: number };

// A screen rect in stage pixels. The stage's own screen rect gives the offset and the scale the window fit applied.
export function magicBox(r: ScreenRect, stage: ScreenRect): Box {
  const k = stage.width / STAGE.w || 1;
  return { x: (r.left - stage.left) / k, y: (r.top - stage.top) / k, w: r.width / k, h: r.height / k };
}

// The pose (origin top left) of a stand-in of size `base` scaled uniformly to fit inside `box`, centred on it.
// As in morph: the old look ends inside the new box, the new look starts inside the old one, and text never stretches.
export function magicFit(box: Box, base: { w: number; h: number }): { x: number; y: number; scale: number } {
  const scale = base.w > 0 && base.h > 0 ? Math.min(box.w / base.w, box.h / base.h) : 1;
  return { x: box.x + (box.w - base.w * scale) / 2, y: box.y + (box.h - base.h * scale) / 2, scale };
}

// The real elements stay untouched by inline styles (their steps own them): a rule keyed on an attribute hides them.
function hideRule() {
  if (document.querySelector("style[data-k-fly-style]")) return;
  const s = document.head.appendChild(document.createElement("style"));
  s.dataset.kFlyStyle = "";
  s.textContent = "[data-k-fly-hide] { visibility: hidden !important; }";
}

const onFrame = (b: Box) => b.w > 0 && b.h > 0 && b.x < STAGE.w && b.y < STAGE.h && b.x + b.w > 0 && b.y + b.h > 0;

// Each data-k-match key shown in the frame, with its first element in document order.
function matches(world: HTMLElement, box: (e: Element) => Box): Map<string, Element> {
  const out = new Map<string, Element>();
  for (const e of world.querySelectorAll<HTMLElement | SVGElement>("[data-k-match]")) {
    const k = e.dataset.kMatch!;
    if (!out.has(k) && e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && onFrame(box(e))) out.set(k, e);
  }
  return out;
}

// The clone carries the computed look as inline styles: out of its scene, the deck's and the theme's CSS no longer reach it.
// shortcut: copies every computed property of every node, fine for a chip or an icon; slow for a large subtree.
function copyStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const st = (dst as HTMLElement).style;
  for (let i = 0; i < cs.length; i++) st.setProperty(cs[i], cs.getPropertyValue(cs[i]));
  st.transition = st.animation = "none";
  for (let i = 0; i < src.children.length; i++) copyStyles(src.children[i], dst.children[i]);
}

// A stand-in of `e` in the layer above both canvases, hidden, with its size before any transform (stage px).
// An SVG shape goes into its own <svg>, its local box as the viewBox.
function standIn(e: Element, layer: HTMLElement, k: number): { el: HTMLElement | SVGSVGElement; base: { w: number; h: number } } {
  const c = e.cloneNode(true) as HTMLElement | SVGElement;
  copyStyles(e, c);
  for (const n of [c, ...c.querySelectorAll("*")]) ["id", "data-k-match", "data-step"].forEach((a) => n.removeAttribute(a));
  c.removeAttribute("transform");
  Object.assign(c.style, { transform: "none", translate: "none", rotate: "none", scale: "none" });
  let fly: HTMLElement | SVGSVGElement;
  if (e instanceof SVGGraphicsElement && !(e instanceof SVGSVGElement)) {
    const bb = e.getBBox();
    fly = document.createElementNS(SVG, "svg");
    fly.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
    fly.setAttribute("width", String(bb.width));
    fly.setAttribute("height", String(bb.height));
    fly.style.overflow = "visible";
    fly.append(c);
  } else fly = c as HTMLElement | SVGSVGElement;
  Object.assign(fly.style, { position: "absolute", left: "0", top: "0", right: "auto", bottom: "auto", margin: "0", zIndex: "3", pointerEvents: "none", visibility: "visible", opacity: "0" });
  fly.dataset.kFly = "";
  layer.append(fly);
  const r = fly.getBoundingClientRect();
  return { el: fly, base: { w: r.width / k, h: r.height / k } };
}

// Each element with the same data-k-match key on both canvases flies from its old place to its new one, its old look
// fading into its new look, while the rest fades as in "fade". No shared key: a plain fade.
// "reveal" when the flight lands: the new section's first step then plays under the landed stand-in, which leaves
// once that step ends, where the real element now looks the same.
// shortcut: the new element is measured at the end of the first step; a step that moves it later is not followed.
export function transitionMagicMove(from: CanvasRuntime, to: CanvasRuntime, opts: TransitionOpts): gsap.core.Timeline {
  const worlds = from.el.parentElement!;
  const stage = worlds.parentElement!;
  // Left by a run that never ended.
  worlds.querySelectorAll(":scope > [data-k-fly]").forEach((e) => e.remove());
  worlds.querySelectorAll("[data-k-fly-hide]").forEach((e) => e.removeAttribute("data-k-fly-hide"));
  const s = stage.getBoundingClientRect();
  const k = s.width / STAGE.w || 1;
  const box = (e: Element) => magicBox(e.getBoundingClientRect(), s);
  const olds = matches(from.world, box);
  // The new canvas as its first step leaves it: the next step label after now. Seek there, measure, seek back.
  const now = to.tl.time();
  const ends = Object.entries(to.tl.labels).filter(([n, t]) => n.startsWith("e:") && t > now).map(([, t]) => t);
  const end = ends.length ? Math.min(...ends) : now;
  // Events on, on purpose: effects write text from onUpdate (counters, typing), and the boxes must include it.
  to.tl.seek(end, false);
  gsap.set(to.el, { autoAlpha: 1 });
  const pairs = [...matches(to.world, box)].flatMap(([key, n]) => {
    const o = olds.get(key);
    return o ? [{ o, n, a: box(o), b: box(n), on: standIn(n, worlds, k), oo: standIn(o, worlds, k) }] : [];
  });
  gsap.set(to.el, { autoAlpha: 0 });
  to.tl.seek(now, false);
  if (!pairs.length) return registry.fade(from, to, opts);

  hideRule();
  const real = pairs.flatMap((p) => [p.o, p.n]);
  real.forEach((e) => e.setAttribute("data-k-fly-hide", ""));
  const tl = gsap
    .timeline()
    .to(from.el, { autoAlpha: 0, duration: FLY / 2 }, 0)
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: FLY / 2, immediateRender: false }, FLY / 2);
  for (const p of pairs) {
    gsap.set(p.oo.el, { ...magicFit(p.a, p.oo.base), transformOrigin: "0 0", autoAlpha: 1 });
    gsap.set(p.on.el, { ...magicFit(p.a, p.on.base), transformOrigin: "0 0", autoAlpha: 0 });
    // The new look fades in over the old one, which then fades out: one always shows strongly (morph's timing).
    tl.to(p.oo.el, { ...magicFit(p.b, p.oo.base), duration: FLY, ease: EASE }, 0)
      .to(p.on.el, { ...magicFit(p.b, p.on.base), duration: FLY, ease: EASE }, 0)
      .to(p.on.el, { autoAlpha: 1, duration: FLY * 0.45, ease: "none" }, FLY * 0.1)
      .to(p.oo.el, { autoAlpha: 0, duration: FLY * 0.45, ease: "none" }, FLY * 0.45);
  }
  // A key press ends the timeline (progress(1)), which still runs this call: nothing stays behind.
  return tl.addLabel("reveal", FLY).call(() => {
    pairs.forEach((p) => (p.oo.el.remove(), p.on.el.remove()));
    real.forEach((e) => e.removeAttribute("data-k-fly-hide"));
  }, [], FLY + (end - now));
}
