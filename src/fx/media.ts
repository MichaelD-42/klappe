import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export interface ImageOpts {
  href: string; // as in the Markdown link: "media/x.png"
  alt: string;
  rect: Rect;
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
const LANG = "en";

// The visible stand-in for a file that is not in the deck's media/ folder.
function missing(ctx: Ctx, rect: Rect, label: string, text: string): HTMLElement {
  const b = box(ctx, fit(rect));
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
  ctx.problem(`${label}: ${text}`);
  return b;
}

const CAPTION = 48; // the row under a video box for its caption

const fade = (b: HTMLElement): { show: StepAdder } => ({ show: (tl) => void tl.to(b, { autoAlpha: 1, duration: motion.step }) });
const key = (href: string) => href.replace(/^\.\//, "");

export function image(ctx: Ctx, opts: ImageOpts): { show: StepAdder } {
  const { href, alt, rect } = opts;
  const url = ctx.files.media[key(href)];
  if (url === undefined) return fade(missing(ctx, rect, t("imageMissing", LANG), `${key(href)} — ${alt}`));
  const b = box(ctx, rect);
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain" });
  b.append(img);
  return fade(b);
}

// The iframe address of a YouTube or Vimeo link; null for anything else.
function embed(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.split("/")[1]}`;
  if (host === "youtube.com") {
    const id = u.searchParams.get("v") ?? /^\/(?:embed|shorts)\/([\w-]+)/.exec(u.pathname)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  const vi = host === "vimeo.com" ? /(\d+)\/?$/.exec(u.pathname) : null;
  return vi ? `https://player.vimeo.com/video/${vi[1]}` : null;
}

export function video(ctx: Ctx, opts: VideoOpts): { show: StepAdder } {
  const { href, title, rect } = opts;
  const online = /^https?:\/\//.test(href);
  const src = online ? href : ctx.files.media[key(href)];
  if (src === undefined) return fade(missing(ctx, rect, t("videoMissing", LANG), `${key(href)} — ${title}`));
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
  if (online) b.dataset.kNote = `${t("video", LANG)} "${title}" ${t("needsInternet", LANG)}`;
  const frame = embed(href);
  const el = document.createElement(frame ? "iframe" : "video");
  Object.assign(el.style, { width: "100%", height: "100%", border: "0" });
  el.title = title;
  el.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  el.setAttribute("data-k-ignore", ""); // playback is decoration outside the timeline
  if (el instanceof HTMLIFrameElement) {
    el.src = frame!;
    el.allow = "fullscreen; picture-in-picture";
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
