import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx } from "../types";
import { MOODS } from "./mesh3d";

export interface CountdownOpts {
  x: number; // centre, scene-local
  y: number;
  until?: string; // "HH:MM", a wall-clock time today
  minutes?: number; // or N minutes from the first frame the countdown is visible
  label?: string;
  size?: number; // font size of the time, default 144
}
type At = number | string;
export interface CountdownHandle {
  show(tl: gsap.core.Timeline, at?: At): void;
  hide(tl: gsap.core.Timeline, at?: At): void;
  destroy(): void;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Time left from nowMs to target: "HH:MM" today (local time) or an end time in ms. m:ss, or h:mm:ss over 60 min.
export function remaining(nowMs: number, target: string | number): { text: string; done: boolean } {
  let end = target as number;
  if (typeof target === "string") {
    const [h, m] = target.split(":").map(Number);
    end = new Date(nowMs).setHours(h, m, 0, 0);
  }
  const s = Math.max(0, Math.ceil((end - nowMs) / 1000)); // a part second rounds up, so 0:00 means done
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const text = h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  return { text, done: s === 0 };
}

export function countdown(ctx: Ctx, opts: CountdownOpts): CountdownHandle {
  const { x, y, until, minutes, label, size = 144 } = opts;
  if ((until === undefined) === (minutes === undefined)) throw new Error("countdown: set exactly one of until or minutes");
  if (until !== undefined && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(until)) throw new Error(`countdown: until "${until}" is not HH:MM`);

  const box = document.createElement("div");
  box.setAttribute("data-k-ignore", ""); // runs on its own ticker, outside the step timeline
  Object.assign(box.style, { position: "absolute", left: `${x}px`, top: `${y}px`, textAlign: "center", width: "max-content", pointerEvents: "none" });
  const num = box.appendChild(document.createElement("div"));
  Object.assign(num.style, { fontSize: `${size}px`, fontWeight: "700", lineHeight: "1", color: "var(--k-accent)", fontVariantNumeric: "tabular-nums" });
  if (label) {
    const cap = box.appendChild(document.createElement("div"));
    cap.textContent = label;
    Object.assign(cap.style, { fontSize: `${Math.max(28, size / 4)}px`, marginTop: "12px" });
  }
  ctx.html.append(box);
  gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

  let end: string | number | undefined = until; // minutes: set on the first visible frame
  let last = "";
  // As mesh3d: shown (from show/hide tween progress, so a seek lands right) and on the active canvas; no style reads.
  let visible = false;
  const root = box.closest(".k-canvas");
  const draw = () => {
    const now = Date.now();
    const r = end === undefined ? remaining(now, now + minutes! * 60_000) : remaining(now, end);
    if (r.text === last) return;
    last = r.text;
    num.textContent = r.text;
    num.style.color = r.done ? MOODS.careful.color : "var(--k-accent)";
  };
  draw();
  const tick = () => {
    // Hidden or on another canvas: no update, and a minutes count does not start.
    if (!visible || (root && !root.hasAttribute("data-k-active"))) return;
    if (end === undefined) end = Date.now() + minutes! * 60_000;
    draw();
  };
  gsap.ticker.add(tick);

  return {
    show(tl, at) {
      tl.fromTo(box, { autoAlpha: 0 }, {
        autoAlpha: 1, duration: motion.step, immediateRender: false,
        onUpdate(this: gsap.core.Tween) {
          visible = this.progress() > 0;
        },
      }, at);
    },
    hide(tl, at) {
      tl.fromTo(box, { autoAlpha: 1 }, {
        autoAlpha: 0, duration: motion.step, immediateRender: false,
        onUpdate(this: gsap.core.Tween) {
          visible = this.progress() < 1;
        },
      }, at);
    },
    destroy() {
      gsap.ticker.remove(tick);
      box.remove();
    },
  };
}
