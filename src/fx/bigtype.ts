import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { LOOP_VIDEO, missing } from "./media";

export interface BigTypeOpts {
  text: string; // one word or number: it sets on one line
  rect?: Rect; // default: `ctx.safe`, the scene frame inside the deck's safe area
  media?: string; // "media/x.jpg" or ".mp4"/".webm": shows through the letters
  alt?: string; // required with media: it describes the picture
}
export interface BigTypeHandle {
  el: HTMLElement; // the text, or the box whose letters show the media; the IMAGE MISSING stand-in for a missing file
  show: StepAdder;
}

const PROBE = 100; // px: the size the text is measured at
let n = 0;

export function bigType(ctx: Ctx, opts: BigTypeOpts): BigTypeHandle {
  const { text, media, alt = "" } = opts;
  const rect = opts.rect ?? ctx.safe;
  const font = { fontFamily: "var(--k-font-heading)", fontWeight: "800" };
  const fade = (b: HTMLElement): BigTypeHandle => ({ el: b, show: (tl) => void tl.to(b, { autoAlpha: 1, duration: motion.step }) });
  const key = media?.replace(/^\.\//, "");
  const url = key === undefined ? undefined : ctx.files.media[key];
  if (media && !alt) ctx.problem(`bigType: media ${media} needs alt text`);
  if (media && url === undefined)
    return fade(missing(ctx, rect, t(LOOP_VIDEO.test(media) ? "videoMissing" : "imageMissing", ctx.deck.lang), [key, alt].filter(Boolean).join(" — ")));

  // The ink is measured at PROBE px on a canvas (the box of the glyphs, not their advance), then scaled to fill the rect
  // and placed on its centre: the rect's width or height, whichever is tighter, is reached by the ink itself.
  const probe = ctx.html.appendChild(document.createElement("span"));
  Object.assign(probe.style, { ...font, visibility: "hidden" });
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  const g = document.createElement("canvas").getContext("2d")!;
  g.font = `${font.fontWeight} ${PROBE}px ${family}`;
  const m = g.measureText(text);
  const [l, r, a, d] = [m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent];
  const k = Math.min(rect.w / (l + r), rect.h / (a + d)) || 1;
  const size = PROBE * k;

  const b = ctx.html.appendChild(document.createElement("div"));
  Object.assign(b.style, { position: "absolute", left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
  gsap.set(b, { autoAlpha: 0 });
  const svg = b.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
  svg.setAttribute("width", url === undefined ? String(rect.w) : "0"); // with media it only holds the clip path
  svg.setAttribute("height", url === undefined ? String(rect.h) : "0");
  const id = `k-bigtype-${n++}`;
  // With media the letters are a clip path on the box, so an image and a video clip alike; without, they are the fill.
  svg.innerHTML = url === undefined ? "<text></text>" : `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><text></text></clipPath>`;
  const clip = svg.querySelector("text")!;
  clip.textContent = text; // text, never HTML
  clip.setAttribute("x", String((rect.w - (l + r) * k) / 2 + l * k));
  clip.setAttribute("y", String((rect.h - (a + d) * k) / 2 + a * k));
  Object.assign(clip.style, { ...font, fontSize: `${size}px`, fill: "var(--k-accent)" });
  if (url === undefined) return fade(b);
  Object.assign(b.style, { clipPath: `url(#${id})`, overflow: "hidden", background: "var(--k-bg)" });
  b.setAttribute("role", "img");
  b.setAttribute("aria-label", alt);
  const med = b.appendChild(document.createElement(LOOP_VIDEO.test(media!) ? "video" : "img"));
  Object.assign(med.style, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
  if (med instanceof HTMLImageElement) Object.assign(med, { src: url, alt: "" });
  else {
    // Wall clock, not the timeline: it plays while its scene is in view; reduced motion and the self-test keep its first frame.
    Object.assign(med, { src: url, muted: true, defaultMuted: true, loop: true, playsInline: true, preload: "auto" });
    med.setAttribute("data-k-ignore", "");
    const still = ctx.reducedMotion || new URLSearchParams(location.search).has("selftest");
    ctx.onStep(({ scene }) => (scene === ctx.scene && !still ? void med.play().catch(() => {}) : med.pause()));
  }
  return fade(b);
}
