import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { typed } from "./crt";

export interface ChatMessage {
  from: string; // "user" sits right; anyone else left. A name other than "assistant" shows above the bubble.
  text: string;
}
export interface ChatOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  messages: ChatMessage[];
}
export interface ChatHandle {
  el: HTMLElement;
  show(tl: gsap.core.Timeline, at?: gsap.Position): void;
  // The next message: the user's lands whole; anyone else's shows typing dots, then streams in.
  next(): StepAdder;
}

// "Ana: Hi" is { from: "Ana", text: "Hi" }; a line without a "name: " prefix (up to 24 characters) is the
// assistant's. An assistant line that starts with a short "Word: " needs an "assistant: " prefix.
export function chatMessage(line: string): ChatMessage {
  const m = /^([^:\n]{1,24}):\s+([\s\S]*)$/.exec(line);
  return m ? { from: m[1].trim(), text: m[2] } : { from: "assistant", text: line };
}

const CPS = 50; // streaming speed, characters per second: an answer streams faster than a human types
const GAP = 24; // between messages
const BOUNCE = 0.2; // one dot rise or fall
const BOUNCES = 4; // rises and falls per dot: two hops

// The bubble keeps its full text as a hidden ghost, so it has its final size from build: the streamed text
// wraps at the same places and the thread never reflows while it streams.
const CSS = `
.k-chat { position: absolute; overflow: hidden; }
.k-chat-track { position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; gap: ${GAP}px; }
.k-chat-row { display: flex; flex-direction: column; align-items: flex-start; }
.k-chat-row.k-chat-user { align-items: flex-end; }
.k-chat-name { margin: 0 0 6px 4px; color: var(--k-muted); font: 600 24px/1.2 var(--k-font); }
.k-chat-hold { position: relative; max-width: 72%; }
.k-chat-bubble { position: relative; box-sizing: border-box; padding: 18px 28px; border: 3px solid var(--k-surface); border-radius: 6px;
  background: var(--k-surface); color: var(--k-fg); font: 400 32px/1.35 var(--k-font); white-space: pre-line; overflow-wrap: anywhere; }
.k-chat-user .k-chat-bubble { background: var(--k-bg); border-color: var(--k-accent); }
.k-chat-ghost { visibility: hidden; }
.k-chat-live { position: absolute; inset: 18px 28px; }
.k-chat-dots { position: absolute; left: 0; top: 0; display: flex; gap: 12px; padding: 30px 28px; border-radius: 6px; background: var(--k-surface); }
.k-chat-dots > span { width: 14px; height: 14px; border-radius: 50%; background: var(--k-muted); }
`;

function addStyle() {
  if (document.getElementById("k-chat-style")) return;
  const s = document.createElement("style");
  s.id = "k-chat-style";
  s.textContent = CSS;
  document.head.append(s);
}

const div = (parent: Element, cls: string, text?: string) =>
  parent.appendChild(Object.assign(document.createElement("div"), { className: cls, textContent: text ?? "" }));

export function chat(ctx: Ctx, opts: ChatOpts): ChatHandle {
  addStyle();
  const panel = div(ctx.html, "k-chat");
  Object.assign(panel.style, { left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, height: `${opts.h}px` });
  const track = div(panel, "k-chat-track");
  const rows = opts.messages.map((m) => {
    const user = m.from === "user";
    const row = div(track, `k-chat-row${user ? " k-chat-user" : ""}`);
    if (!user && m.from !== "assistant") div(row, "k-chat-name", m.from);
    const hold = div(row, "k-chat-hold");
    const bubble = div(hold, "k-chat-bubble");
    div(bubble, "k-chat-ghost", m.text);
    const live = div(bubble, "k-chat-live", user || ctx.reducedMotion ? m.text : "");
    live.dataset.kText = "";
    const dots = user || ctx.reducedMotion ? undefined : div(hold, "k-chat-dots");
    const dot = dots ? [0, 1, 2].map(() => dots.appendChild(document.createElement("span"))) : [];
    return { m, user, row, bubble, live, dots, dot };
  });
  gsap.set([panel, ...rows.flatMap((r) => (r.dots ? [r.row, r.dots, r.bubble] : [r.row]))], { autoAlpha: 0 });
  gsap.set([track, ...rows.flatMap((r) => r.dot)], { y: 0 }); // the start pose the scroll and the hops tween from, so a seek writes the same

  let shown = 0; // messages so far and the thread's scroll; read and moved when a step is added, in step order
  let scroll = 0;
  return {
    el: panel,
    show: (tl, at) => void tl.to(panel, { autoAlpha: 1, duration: motion.step }, at),
    next: () => (tl) => {
      const k = shown++;
      const r = rows[k];
      if (!r) return ctx.problem(`chat: next() step ${k + 1} has no message (${rows.length} messages)`);
      // Layout is done when steps are added: offsetTop is in scene units, under the stage's scale.
      const bottom = r.row.offsetTop + r.row.offsetHeight;
      if (r.row.offsetHeight > opts.h) ctx.problem(`chat: message ${k + 1} is taller than the panel (${opts.h} px)`);
      const to = Math.max(scroll, bottom - opts.h);
      const t = tl.duration();
      if (to !== scroll) {
        tl.fromTo(track, { y: -scroll }, { y: -to, duration: ctx.reducedMotion ? 0 : motion.step, ease: "power2.out", immediateRender: false }, t);
        scroll = to;
      }
      if (!r.dots) return void tl.fromTo(r.row, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, t);
      // Typing dots: two hops each, in the master timeline, so a seek lands on the same pose.
      tl.fromTo(r.dots, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, t);
      tl.set(r.row, { autoAlpha: 1, immediateRender: false }, t);
      tl.fromTo(r.dot, { y: 0 }, { y: -10, duration: BOUNCE, ease: "sine.inOut", yoyo: true, repeat: BOUNCES - 1, stagger: 0.12, immediateRender: false }, t + 0.2);
      tl.set(r.dots, { autoAlpha: 0, immediateRender: false });
      tl.set(r.bubble, { autoAlpha: 1, immediateRender: false }, "<");
      tl.to({}, {
        duration: Math.max(0.1, r.m.text.length / CPS),
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          r.live.textContent = typed(r.m.text, this.progress());
        },
      });
    },
  };
}
