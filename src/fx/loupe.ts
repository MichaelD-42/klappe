import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { image } from "./media";

export interface LoupeOpts {
  href: string; // as in the Markdown link: "media/x.png"
  alt: string;
  rect?: Rect; // default: the full scene frame
  fit?: "contain" | "cover"; // as for image(); default contain
  r?: number; // the lens radius in scene units; default 140
  zoom?: number; // how much the lens enlarges; default 2.5
  at?: { x: number; y: number }; // where the lens first shows, in scene units; default the picture's centre
}
export interface LoupeHandle {
  show: StepAdder;
  to(x: number, y: number, opts?: { zoom?: number }): StepAdder; // zoom: this stop's own; default the lens's
}

// Where the enlarged copy sits inside the lens (top-left of a 2r square), so the point (x, y) of the picture
// shows at the lens centre. The copy is the picture's box scaled by zoom, so cover and contain both line up.
export function loupeOffset(p: { x: number; y: number }, rect: Rect, r: number, zoom: number) {
  return { x: r - (p.x - rect.x) * zoom, y: r - (p.y - rect.y) * zoom };
}

// A magnifying lens over a picture from media/: a circle that shows the detail under its centre enlarged,
// ringed in --k-accent. to(x, y) slides it to the next detail; with reduced motion it cuts there.
// shortcut: the copy does not follow a Ken Burns push, so the picture has none; add it if a deck needs both.
export function loupe(ctx: Ctx, opts: LoupeOpts): LoupeHandle {
  const { r = 140, zoom = 2.5, fit } = opts;
  const rect = opts.rect ?? { x: 0, y: 0, w: ctx.rect.w, h: ctx.rect.h };
  // opts.rect, not rect: with none, a cover picture keeps image()'s full-frame fade over the camera flight.
  const picture = image(ctx, { href: opts.href, alt: opts.alt, rect: opts.rect, fit });
  // A missing file: image() already shows IMAGE MISSING and reports it; no lens over the stand-in.
  if (ctx.files.media[opts.href.replace(/^\.\//, "")] === undefined)
    return { show: (tl) => picture.show(tl), to: () => (tl) => void tl.set({}, {}, tl.duration() + 0.1) };

  const lens = ctx.html.appendChild(document.createElement("div"));
  lens.setAttribute("data-k-loupe", "");
  Object.assign(lens.style, { position: "absolute", left: `${rect.x}px`, top: `${rect.y}px`, width: `${2 * r}px`, height: `${2 * r}px` });
  const clip = lens.appendChild(document.createElement("div"));
  Object.assign(clip.style, { position: "absolute", inset: "0", borderRadius: "50%", overflow: "hidden", background: "var(--k-bg)" });
  // The ring is its own layer: a border on the clip would shift the copy by its width.
  const ring = lens.appendChild(document.createElement("div"));
  Object.assign(ring.style, {
    position: "absolute",
    inset: "0",
    borderRadius: "50%",
    border: "6px solid var(--k-accent)",
    boxShadow: "0 0 0 2px var(--k-line)",
    pointerEvents: "none",
  });
  const copy = image({ ...ctx, html: clip }, { href: opts.href, alt: "", rect: { x: 0, y: 0, w: rect.w * zoom, h: rect.h * zoom }, fit });
  copy.el.setAttribute("aria-hidden", "true");
  copy.el.setAttribute("data-k-loupe-copy", "");
  gsap.set(copy.el, { autoAlpha: 1 }); // the lens fades as a whole
  gsap.set(lens, { autoAlpha: 0 });

  // The copy is built at the lens's zoom; another stop's zoom scales it from its top-left corner.
  const pose = (p: { x: number; y: number }, z = zoom) => [{ x: p.x - r - rect.x, y: p.y - r - rect.y }, { ...loupeOffset(p, rect, r, z), scale: z / zoom }] as const;
  const start = opts.at ?? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const [l0, c0] = pose(start);
  gsap.set(lens, l0);
  gsap.set(copy.el, { ...c0, transformOrigin: "0 0" });

  let cur = start; // the lens centre at the end of the steps added so far
  let curZoom = zoom;
  return {
    show(tl) {
      picture.show(tl);
      tl.to(lens, { autoAlpha: 1, duration: motion.step });
    },
    to: (x, y, o = {}) => (tl) => {
      const [la, ca] = pose(cur, curZoom);
      const [lb, cb] = pose({ x, y }, o.zoom ?? zoom);
      [cur, curZoom] = [{ x, y }, o.zoom ?? zoom];
      if (ctx.reducedMotion) {
        const t = tl.duration();
        tl.set(lens, lb, t);
        tl.set(copy.el, cb, t);
        return;
      }
      // immediateRender off: a later step's start values must not apply at load. Both share one ease, so the
      // detail under the centre stays the one the copy shows.
      const d = { duration: motion.step * 2, ease: "power2.inOut", immediateRender: false };
      tl.fromTo(lens, la, { ...lb, ...d });
      tl.fromTo(copy.el, ca, { ...cb, ...d }, "<");
    },
  };
}
