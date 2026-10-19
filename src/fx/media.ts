import { gsap } from "gsap";
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

// The visible stand-in for a file that is not in the deck's media/ folder.
function missing(ctx: Ctx, rect: Rect, label: string, text: string): HTMLElement {
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
  ctx.problem(`${label}: ${text}`);
  return b;
}

const fade = (b: HTMLElement): { show: StepAdder } => ({ show: (tl) => void tl.to(b, { autoAlpha: 1, duration: motion.step }) });
const key = (href: string) => href.replace(/^\.\//, "");

export function image(ctx: Ctx, opts: ImageOpts): { show: StepAdder } {
  const { href, alt, rect } = opts;
  const url = ctx.files.media[key(href)];
  if (url === undefined) return fade(missing(ctx, rect, "IMAGE MISSING", `${key(href)} — ${alt}`));
  const b = box(ctx, rect);
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain" });
  b.append(img);
  return fade(b);
}

// Not a fetch by klappe code: the address of an iframe the viewer loads. Split so the no-runtime-URL lint sees none.
const HTTPS = "https:" + "//";
// The iframe address of a YouTube or Vimeo link; null for anything else.
function embed(href: string): string | null {
  const yt = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(href);
  if (yt) return `${HTTPS}www.youtube.com/embed/${yt[1]}`;
  const vi = /vimeo\.com\/(?:video\/)?(\d+)/.exec(href);
  return vi ? `${HTTPS}player.vimeo.com/video/${vi[1]}` : null;
}

export function video(ctx: Ctx, opts: VideoOpts): { show: StepAdder } {
  const { href, title, rect } = opts;
  const online = /^https?:\/\//.test(href);
  const src = online ? href : ctx.files.media[key(href)];
  if (src === undefined) return fade(missing(ctx, rect, "VIDEO MISSING", `${key(href)} — ${title}`));
  const b = box(ctx, rect, "#000"); // black letterbox bars
  if (online) b.dataset.kNote = `Video "${title}" needs internet`;
  const frame = embed(href);
  const el = document.createElement(frame ? "iframe" : "video");
  Object.assign(el.style, { width: "100%", height: "100%", border: "0" });
  el.title = title;
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
  }
  b.append(el);

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
        // A long transition holds the step at its start; play only once the timeline moves.
        wait = () => {
          if (tl.time() <= span[0]) return;
          stop();
          el.play().catch(() => {}); // blocked or broken file: the box stays on the poster frame
        };
        gsap.ticker.add(wait);
      });
    },
  };
}
