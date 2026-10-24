import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

// A Ken Burns pose: scale, and a drift in scene px.
export interface KenBurnsPose {
  scale: number;
  x: number;
  y: number;
}
export interface ImageOpts {
  href: string; // as in the Markdown link: "media/x.png"
  alt: string; // "" for a decorative picture (a background)
  rect?: Rect; // default: the full scene frame
  fit?: "contain" | "cover"; // cover fills the rect and crops; default contain
  // A slow push on show(): true = 1.0 to 1.08 with a slight drift, or your own poses. Reduced motion leaves it out.
  kenBurns?: true | { from?: Partial<KenBurnsPose>; to?: Partial<KenBurnsPose> };
  scrim?: number; // 0..1: a dark layer over the picture, for text on top
}
export interface ImageHandle {
  // A full-frame picture (fit cover, no rect) shows from its step's start, so it is there while the camera flies in.
  show(tl: gsap.core.Timeline, at?: number | string): void;
  hide(tl: gsap.core.Timeline, at?: number | string): void;
  // The Ken Burns push over `duration` seconds; show() already plays it when kenBurns is set.
  move(tl: gsap.core.Timeline, opts: { duration: number }, at?: number | string): void;
}
export interface VideoOpts {
  href: string; // a local "media/x.mp4", a direct link, or a YouTube or Vimeo link
  title: string;
  rect: Rect;
}

// The largest box of aspect ratio ar (w/h) centred in rect.
function fit(rect: Rect, ar = 16 / 9): Rect {
  const w = Math.min(rect.w, rect.h * ar);
  const h = w / ar;
  return { x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h };
}

// An opaque box at rect inside the helper's wrapper: the wrapper has no backdrop of its own.
function box(ctx: Ctx, rect: Rect, background = "var(--k-bg)"): HTMLElement {
  const b = document.createElement("div");
  Object.assign(b.style, {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
    boxSizing: "border-box",
    background,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    overflow: "hidden",
  });
  ctx.html.append(b);
  gsap.set(b, { autoAlpha: 0 });
  return b;
}

// shortcut: ctx has no deck language, so effect UI words are English; pass meta.lang once ctx has it.

// The visible stand-in, at rect, for a file that is not in the deck's media/ folder.
function missing(ctx: Ctx, rect: Rect, label: string, text: string, prompt?: string): HTMLElement {
  const b = box(ctx, rect);
  Object.assign(b.style, {
    flexDirection: "column",
    gap: "24px",
    border: "4px dashed var(--k-accent)",
    color: "var(--k-accent)",
    fontSize: "48px",
    fontWeight: "700",
  });
  const t = document.createElement("div");
  t.textContent = label;
  const s = document.createElement("div");
  s.textContent = text;
  s.style.fontSize = "32px";
  b.append(t, s);
  if (prompt) {
    const p = document.createElement("div");
    p.textContent = prompt;
    Object.assign(p.style, { fontSize: "28px", fontWeight: "400", maxWidth: "80%" });
    b.append(p);
  }
  ctx.problem(`${label}: ${text}`);
  return b;
}

const CAPTION = 48; // the row under a video box for its caption

// show may take a longer fade and its own ease; hide always fades over motion.step.
const fade = (b: HTMLElement, duration = motion.step, ease?: string) => ({
  show: (tl: gsap.core.Timeline, at?: number | string) => void tl.to(b, { autoAlpha: 1, duration, ease }, at),
  hide: (tl: gsap.core.Timeline, at?: number | string) => void tl.to(b, { autoAlpha: 0, duration: motion.step }, at),
});
const key = (href: string) => href.replace(/^\.\//, "");

// world.ts moves this timeline label to the start of each step while it builds the step.
export const STEP_LABEL = "step";
// Ends a prompt made from alt text for a full-frame picture. bin/todo.mjs keeps a copy (it cannot import TS);
// tests/unit/fx-media.test.ts checks the two match.
export const FULL_FRAME_PROMPT = ", 16:9, 1920x1080, no text, no logos";

export const KEN_BURNS = 6; // seconds: the default push; show() with kenBurns plays it after the fade-in
const STILL: KenBurnsPose = { scale: 1, x: 0, y: 0 };
const PUSH: KenBurnsPose = { scale: 1.08, x: -24, y: -12 }; // 4 % overscan per side covers the drift

// Keeps the drift inside the overscan, so the picture never leaves an edge gap. It scales about its centre.
export function clampPose(p: KenBurnsPose, rect: Rect): KenBurnsPose {
  const c = (v: number, max: number) => Math.max(-max, Math.min(max, v));
  const over = Math.max(0, p.scale - 1); // below scale 1 there is no overscan, so no drift
  return { scale: p.scale, x: c(p.x, (rect.w * over) / 2), y: c(p.y, (rect.h * over) / 2) };
}

export function image(ctx: Ctx, opts: ImageOpts): ImageHandle {
  const { href, alt, scrim, kenBurns } = opts;
  const rect = opts.rect ?? { x: 0, y: 0, w: ctx.rect.w, h: ctx.rect.h };
  const cover = opts.fit === "cover";
  const fullFrame = cover && !opts.rect;
  const at0 = (tl: gsap.core.Timeline, at?: number | string) => at ?? (fullFrame ? tl.labels[STEP_LABEL] : undefined);
  // A full frame fades in over a camera flight with an ease-in, so it stays faint while its edge crosses the frame.
  const fadeTime = fullFrame ? motion.camera : motion.step;
  const fadeEase = fullFrame ? "power2.in" : undefined;
  const url = ctx.files.media[key(href)];
  const text = [key(href), alt].filter(Boolean).join(" — ");
  if (url === undefined) {
    // A prompt for an image generator, for a cover picture with alt text.
    const prompt = cover && alt ? `${alt}${FULL_FRAME_PROMPT}` : undefined;
    const b = missing(ctx, cover ? rect : fit(rect), t("imageMissing", ctx.deck.lang), text, prompt);
    const f = fade(b, fadeTime, fadeEase);
    return { show: (tl, at) => f.show(tl, at0(tl, at)), hide: f.hide, move: () => {} };
  }
  const b = box(ctx, rect);
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: cover ? "cover" : "contain" });
  b.append(img);
  if (scrim) {
    const s = document.createElement("div");
    Object.assign(s.style, { position: "absolute", inset: "0", background: "var(--k-blackout)", opacity: String(scrim) });
    b.append(s);
  }
  const kb = kenBurns === true ? {} : kenBurns;
  const from = clampPose({ ...STILL, ...kb?.from }, rect);
  const to = clampPose({ ...PUSH, ...kb?.to }, rect);
  gsap.set(img, from); // the start pose from load, so a seek back before the push matches a fresh load
  const move: ImageHandle["move"] = (tl, { duration }, at) => {
    if (ctx.reducedMotion) return;
    tl.fromTo(img, from, { ...to, duration, ease: "sine.inOut", immediateRender: false }, at);
  };
  const f = fade(b, fadeTime, fadeEase);
  return {
    show(tl, at) {
      f.show(tl, at0(tl, at));
      // After the fade: under the slow fade-in of a full frame the push would play mostly unseen.
      if (kb) move(tl, { duration: KEN_BURNS }, ">");
    },
    hide: f.hide,
    move,
  };
}

// The iframe address of a YouTube or Vimeo link; null for anything else.
const VIDEO_HOST = /(?:^|\.)(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com)$/i;

export function embed(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  const id = (s: string | null | undefined) => (s && /^[\w-]+$/.test(s) ? s : null);
  if (host === "youtu.be") {
    const v = id(u.pathname.split("/")[1]);
    return v && `https://www.youtube.com/embed/${v}`;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = id(u.searchParams.get("v") ?? /^\/(?:embed|shorts)\/([\w-]+)/.exec(u.pathname)?.[1]);
    // The privacy-enhanced host stays: the author chose it.
    return v && `https://www.${host}/embed/${v}`;
  }
  const vi = host === "vimeo.com" ? /(\d+)\/?$/.exec(u.pathname) : null;
  return vi ? `https://player.vimeo.com/video/${vi[1]}` : null;
}

export function video(ctx: Ctx, opts: VideoOpts): { show: StepAdder } {
  const { href, title, rect } = opts;
  const online = /^https?:\/\//.test(href);
  const src = online ? href : ctx.files.media[key(href)];
  if (src === undefined) return fade(missing(ctx, fit(rect), t("videoMissing", ctx.deck.lang), `${key(href)} — ${title}`));
  const frame = embed(href);
  // A video host's page that is not one video (a channel, a playlist page) cannot play in a box.
  if (online && !frame && VIDEO_HOST.test(new URL(href).hostname))
    return fade(missing(ctx, fit(rect), t("videoMissing", ctx.deck.lang), `${href} has no video id; link one video — ${title}`));
  // A border and a caption, so the box reads as a video even when it cannot load (offline).
  const area = { ...rect, h: rect.h - CAPTION };
  const b = box(ctx, fit(area), "#000"); // black letterbox bars
  Object.assign(b.style, { border: "2px solid color-mix(in srgb, var(--k-fg) 40%, transparent)", overflow: "visible" });
  const caption = document.createElement("div");
  caption.textContent = title;
  Object.assign(caption.style, {
    position: "absolute",
    left: "0",
    right: "0",
    top: "100%",
    marginTop: "8px",
    fontSize: "24px",
    color: "var(--k-fg)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });
  if (online) b.dataset.kNote = `${t("video", ctx.deck.lang)} "${title}" ${t("needsInternet", ctx.deck.lang)}`;
  const el = document.createElement(frame ? "iframe" : "video");
  Object.assign(el.style, { width: "100%", height: "100%", border: "0" });
  el.title = title;
  el.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  el.setAttribute("data-k-ignore", ""); // playback is decoration outside the timeline
  if (el instanceof HTMLIFrameElement) {
    el.src = frame!;
    el.allow = "fullscreen; picture-in-picture";
    el.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    el.setAttribute("data-k-video", "embed");
  } else {
    el.src = src;
    el.preload = "auto";
    el.playsInline = true;
    el.style.objectFit = "contain";
    el.setAttribute("data-k-video", "file");
    // Once the size is known, the box takes the clip's own aspect ratio.
    el.addEventListener("loadedmetadata", () => {
      if (!el.videoWidth) return;
      const r = fit(area, el.videoWidth / el.videoHeight);
      Object.assign(b.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    });
  }
  b.append(el, caption);

  return {
    show(tl) {
      const start = tl.duration(); // after the step's padding, so this step spans [start - pad, ...]
      tl.to(b, { autoAlpha: 1, duration: motion.step });
      if (el instanceof HTMLIFrameElement) return; // the viewer starts an embedded player
      let wait: (() => void) | undefined;
      const stop = () => {
        if (wait) gsap.ticker.remove(wait);
        wait = undefined;
      };
      ctx.onStep(({ play, span }) => {
        stop();
        el.pause();
        if (!play || !span || !(span[0] <= start && start < span[1])) return;
        // The box starts to show at `start`; a long transition holds the timeline before that.
        wait = () => {
          if (tl.time() <= start) return;
          stop();
          el.play().catch(() => {}); // blocked or broken file: the box stays on the poster frame
        };
        gsap.ticker.add(wait);
      });
    },
  };
}
