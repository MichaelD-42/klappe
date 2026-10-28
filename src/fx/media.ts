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
  scrim?: number; // 0..1: a --k-scrim layer over the picture, for text on top
  scrimSide?: ScrimSide; // the scrim is full on this side only and clears past the middle; default: flat
  credit?: string; // "Photo: …": small, in the bottom-right corner, on its own --k-bg patch
}
export type ScrimSide = "left" | "right" | "top" | "bottom";
// The scrim layer's background: flat, or full over the 45% of the frame on `side` and clear by 85%.
const OPPOSITE = { left: "right", right: "left", top: "bottom", bottom: "top" } as const;
export const scrimFill = (side?: ScrimSide) =>
  side ? `linear-gradient(to ${OPPOSITE[side]}, var(--k-scrim) 0%, var(--k-scrim) 45%, transparent 85%)` : "var(--k-scrim)";

export interface ImageHandle {
  el: HTMLElement; // the picture's box (or the IMAGE MISSING stand-in), last in ctx.html
  // A full-frame picture (fit cover, no rect) shows from its step's start, so it is there while the camera flies in.
  show(tl: gsap.core.Timeline, at?: number | string): void;
  hide(tl: gsap.core.Timeline, at?: number | string): void;
  // The Ken Burns push over `duration` seconds; show() already plays it when kenBurns is set.
  move(tl: gsap.core.Timeline, opts: { duration: number }, at?: number | string): void;
}
export interface VideoOpts {
  href: string; // a local "media/x.mp4", a direct link, or a YouTube or Vimeo link
  title: string;
  rect?: Rect; // default: the full scene frame, cropped to cover, with no frame or caption
  fallback?: string; // an image href in media/, shown instead of an online video when there is no network
  autoplay?: boolean; // a YouTube or Vimeo player starts when its step arrives (default true); false: the viewer starts it
  muted?: boolean; // a starting player has no sound (default true); false asks for sound, which a browser may block
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

// A local video file: a background plays it in a loop instead of showing it as a picture.
export const LOOP_VIDEO = /\.(?:mp4|webm)$/i;

// A full-frame video that plays muted in a loop, under data-k-ignore: playback runs on the wall clock,
// outside the timeline. The caller plays and pauses it. A missing file shows VIDEO MISSING and returns nothing.
export function loopVideo(ctx: Ctx, opts: { href: string; alt?: string }): HTMLVideoElement | undefined {
  const rect = { x: 0, y: 0, w: ctx.rect.w, h: ctx.rect.h };
  const url = ctx.files.media[key(opts.href)];
  if (url === undefined) return void missing(ctx, rect, t("videoMissing", ctx.deck.lang), [key(opts.href), opts.alt].filter(Boolean).join(" — "));
  const b = box(ctx, rect);
  b.setAttribute("data-k-ignore", "");
  const v = document.createElement("video");
  Object.assign(v, { src: url, muted: true, defaultMuted: true, loop: true, playsInline: true, preload: "auto" });
  if (opts.alt) v.setAttribute("aria-label", opts.alt);
  Object.assign(v.style, { width: "100%", height: "100%", objectFit: "cover" });
  b.append(v);
  return v;
}

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
  const { href, alt, scrim, scrimSide, kenBurns } = opts;
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
    return { el: b, show: (tl, at) => f.show(tl, at0(tl, at)), hide: f.hide, move: () => {} };
  }
  const b = box(ctx, rect);
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: cover ? "cover" : "contain" });
  b.append(img);
  if (scrim) {
    const s = document.createElement("div");
    Object.assign(s.style, { position: "absolute", inset: "0", background: scrimFill(scrimSide), opacity: String(scrim) });
    b.append(s);
  }
  if (opts.credit) {
    // On its own half-clear --k-bg patch, so it reads on any photo with or without a scrim; it does not push with Ken Burns.
    const c = b.appendChild(document.createElement("div"));
    c.dataset.kCredit = "";
    c.setAttribute("data-k-bleed", ""); // in the picture's corner on purpose, past the safe area on a full frame
    c.textContent = opts.credit;
    Object.assign(c.style, {
      position: "absolute", right: "12px", bottom: "12px", maxWidth: "calc(100% - 24px)", padding: "2px 10px", borderRadius: "4px",
      background: "color-mix(in srgb, var(--k-bg) 75%, transparent)", color: "var(--k-fg)", font: "500 20px/1.3 var(--k-font)",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    });
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
    el: b,
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

// The step still takes a beat, so a play step on a video that cannot play is not an empty step.
const beat: StepAdder = (tl) => void tl.set({}, {}, tl.duration() + 0.4);

export interface VideoHandle {
  show: StepAdder; // fades the box in; a local file, or an embed with autoplay, starts on this step
  play: StepAdder; // starts the video on this step instead of on show's: the box waits on its poster until then
}

export function video(ctx: Ctx, opts: VideoOpts): VideoHandle {
  const { href, title } = opts;
  const full = !opts.rect;
  const rect = opts.rect ?? { x: 0, y: 0, w: ctx.rect.w, h: ctx.rect.h };
  const shape = full ? rect : fit(rect);
  const online = /^https?:\/\//.test(href);
  const src = online ? href : ctx.files.media[key(href)];
  if (src === undefined) return { ...fade(missing(ctx, shape, t("videoMissing", ctx.deck.lang), `${key(href)} — ${title}`)), play: beat };
  const frame = embed(href);
  // A video host's page that is not one video (a channel, a playlist page) cannot play in a box.
  if (online && !frame && VIDEO_HOST.test(new URL(href).hostname))
    return { ...fade(missing(ctx, shape, t("videoMissing", ctx.deck.lang), `${href} has no video id; link one video — ${title}`)), play: beat };
  // A border and a caption, so the box reads as a video even when it cannot load (offline). A full frame has neither.
  const area = full ? rect : { ...rect, h: rect.h - CAPTION };
  const b = box(ctx, full ? rect : fit(area), "#000"); // black letterbox bars
  if (!full) Object.assign(b.style, { border: "2px solid color-mix(in srgb, var(--k-fg) 40%, transparent)", overflow: "visible" });
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
  // Read here, not at module load: unit tests import this file in node. No load timeout for embeds:
  // a cross-origin iframe fires load for the browser's own error page too, so "not loaded" cannot be seen.
  const offline = online && (!navigator.onLine || new URLSearchParams(location.search).get("offline") === "1");
  const still = online && opts.fallback ? ctx.files.media[key(opts.fallback)] : undefined;
  if (offline && still !== undefined) {
    const img = document.createElement("img");
    img.src = still;
    img.alt = title;
    Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain" });
    caption.textContent = t("videoOffline", ctx.deck.lang);
    b.append(img, caption);
    return { ...fade(b), play: beat };
  }
  if (offline) ctx.problem(`${t("videoOffline", ctx.deck.lang)}: ${title}` + (opts.fallback ? ` (${t("imageMissing", ctx.deck.lang)}: ${key(opts.fallback)})` : ""));
  // Muted by default: a browser may block an embed that starts with sound. A play step can start any embed.
  const autoplay = opts.autoplay !== false;
  const auto = frame ? `${frame}?autoplay=1&${frame.includes("vimeo") ? "muted" : "mute"}=${opts.muted === false ? 0 : 1}` : undefined;
  const el = document.createElement(frame ? "iframe" : "video");
  Object.assign(el.style, { width: "100%", height: "100%", border: "0" });
  el.title = title;
  el.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  el.setAttribute("data-k-ignore", ""); // playback is decoration outside the timeline
  if (el instanceof HTMLIFrameElement) {
    el.src = frame!;
    el.allow = autoplay ? "autoplay; fullscreen; picture-in-picture" : "fullscreen; picture-in-picture";
    el.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    el.setAttribute("data-k-video", "embed");
    // The fallback still (or an empty box) holds the player's place; the player replaces it, so the caption
    // keeps its index and the self-test's element paths match before and after.
    const poster = document.createElement(still !== undefined ? "img" : "div");
    if (poster instanceof HTMLImageElement) Object.assign(poster, { src: still, alt: title });
    Object.assign(poster.style, { width: "100%", height: "100%", objectFit: "contain" });
    poster.setAttribute("data-k-ignore", "");
    b.append(poster);
    if (!full) b.append(caption);
    // The player loads one step before its scene, so it is ready when the scene shows; not at deck load: a deck
    // with many embeds otherwise loads every player on start, also on a deep link to another scene.
    const load = () => !el.isConnected && poster.replaceWith(el);
    if (ctx.scene) ctx.onStep(({ scene, next }) => void ((scene === ctx.scene || next === ctx.scene) && load()));
    else load();
  } else {
    el.src = src;
    el.preload = "auto";
    el.playsInline = true;
    el.style.objectFit = full ? "cover" : "contain";
    el.setAttribute("data-k-video", "file");
    // Once the size is known, the box takes the clip's own aspect ratio.
    el.addEventListener("loadedmetadata", () => {
      if (full || !el.videoWidth) return;
      const r = fit(area, el.videoWidth / el.videoHeight);
      Object.assign(b.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    });
  }
  if (!frame) b.append(el);
  if (!frame && !full) b.append(caption);

  // When playback starts: on show's step, or on a play step's. Steps are built before any is played, so the
  // listener reads the last value.
  let start: number | undefined;
  let cued = false; // a play step owns the start
  let armed = false;
  const arm = (tl: gsap.core.Timeline) => {
    if (armed) return;
    armed = true;
    // An embed starts by loading its autoplay address and stops by loading its plain one: no player API needed.
    const halt = () => (el instanceof HTMLIFrameElement ? el.getAttribute("src") === auto && (el.src = frame!) : el.pause());
    let wait: (() => void) | undefined;
    const stop = () => {
      if (wait) gsap.ticker.remove(wait);
      wait = undefined;
    };
    ctx.onStep(({ play, span }) => {
      stop();
      halt();
      const at = start!;
      if (!play || !span || !(span[0] <= at && at < span[1])) return;
      // The step's tween starts at `at`; a long transition holds the timeline before that.
      wait = () => {
        if (tl.time() <= at) return;
        stop();
        if (el instanceof HTMLIFrameElement) el.src = auto!;
        else el.play().catch(() => {}); // blocked or broken file: the box stays on the poster frame
      };
      gsap.ticker.add(wait);
    });
  };

  return {
    show(tl) {
      const at = tl.duration(); // after the step's padding, so this step spans [at - pad, ...]
      // A full frame fades in over the camera flight, slowly at first, like a full-frame picture.
      if (full) tl.to(b, { autoAlpha: 1, duration: motion.camera, ease: "power2.in" }, tl.labels[STEP_LABEL]);
      else tl.to(b, { autoAlpha: 1, duration: motion.step });
      if (cued || (el instanceof HTMLIFrameElement && !autoplay)) return; // the viewer starts an embedded player
      start = at;
      arm(tl);
    },
    play(tl) {
      cued = true;
      start = tl.duration();
      if (el instanceof HTMLIFrameElement) el.allow = "autoplay; fullscreen; picture-in-picture";
      arm(tl);
      beat(tl);
    },
  };
}
