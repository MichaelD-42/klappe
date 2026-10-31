import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { measure } from "./measure";
import { LOOP_VIDEO, missing } from "./media";

export interface BigTypeOpts {
  text: string; // one word or number: it sets on one line
  rect?: Rect; // default: the scene frame inside the default safe area
  media?: string; // "media/x.jpg" or ".mp4"/".webm": shows through the letters
  alt?: string; // required with media: it describes the picture
}
export interface BigTypeHandle {
  el: HTMLElement; // the text, or the box whose letters show the media; the IMAGE MISSING stand-in for a missing file
  show: StepAdder;
}

// The default safe area (selftest's SAFE_AREA): top 48, right 64, bottom 48, left 64.
const frame = (ctx: Ctx): Rect => ({ x: 64, y: 48, w: ctx.rect.w - 128, h: ctx.rect.h - 96 });
const PROBE = 100; // px: the size the text is measured at
let n = 0;

export function bigType(ctx: Ctx, opts: BigTypeOpts): BigTypeHandle {
  const { text, media, alt = "" } = opts;
  const rect = opts.rect ?? frame(ctx);
  const font = { fontFamily: "var(--k-font-heading)", fontWeight: "800" };
  const fade = (b: HTMLElement): BigTypeHandle => ({ el: b, show: (tl) => void tl.to(b, { autoAlpha: 1, duration: motion.step }) });
  const key = media?.replace(/^\.\//, "");
  const url = key === undefined ? undefined : ctx.files.media[key];
  if (media && !alt) ctx.problem(`bigType: media ${media} needs alt text`);
  if (media && url === undefined)
    return fade(missing(ctx, rect, t(LOOP_VIDEO.test(media) ? "videoMissing" : "imageMissing", ctx.deck.lang), [key, alt].filter(Boolean).join(" — ")));

  // Set at PROBE px, measured, then scaled to the rect's width; the rect's height caps it.
  const probe = ctx.html.appendChild(document.createElement("span"));
  probe.textContent = text; // text, never HTML
  Object.assign(probe.style, { ...font, position: "absolute", fontSize: `${PROBE}px`, lineHeight: "1", whiteSpace: "nowrap", visibility: "hidden" });
  const w = measure(ctx, probe, true)?.w;
  probe.remove();
  const size = Math.min(rect.h, w ? (rect.w / w) * PROBE : PROBE);

  const b = ctx.html.appendChild(document.createElement("div"));
  Object.assign(b.style, { position: "absolute", left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
  gsap.set(b, { autoAlpha: 0 });
  if (url === undefined) {
    Object.assign(b.style, { ...font, display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${size}px`, lineHeight: "1", whiteSpace: "nowrap", color: "var(--k-accent)" });
    b.textContent = text;
    return fade(b);
  }
  // The letters are an SVG clip path on the box, so an image and a video clip alike.
  const id = `k-bigtype-${n++}`;
  Object.assign(b.style, { clipPath: `url(#${id})`, overflow: "hidden", background: "var(--k-bg)" });
  b.setAttribute("role", "img");
  b.setAttribute("aria-label", alt);
  const svg = b.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.innerHTML = `<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><text text-anchor="middle" dominant-baseline="central"></text></clipPath>`;
  const clip = svg.querySelector("text")!;
  clip.textContent = text;
  clip.setAttribute("x", String(rect.w / 2));
  clip.setAttribute("y", String(rect.h / 2));
  Object.assign(clip.style, { ...font, fontSize: `${size}px` });
  const m = b.appendChild(document.createElement(LOOP_VIDEO.test(media!) ? "video" : "img"));
  Object.assign(m.style, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
  if (m instanceof HTMLImageElement) Object.assign(m, { src: url, alt: "" });
  else {
    // Wall clock, not the timeline: it plays while its scene is in view; reduced motion and the self-test keep its first frame.
    Object.assign(m, { src: url, muted: true, defaultMuted: true, loop: true, playsInline: true, preload: "auto" });
    m.setAttribute("data-k-ignore", "");
    const still = ctx.reducedMotion || new URLSearchParams(location.search).has("selftest");
    ctx.onStep(({ scene }) => (scene === ctx.scene && !still ? void m.play().catch(() => {}) : m.pause()));
  }
  return fade(b);
}
