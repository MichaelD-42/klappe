import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { typed } from "./crt";

export interface TerminalOpts {
  lines: string[]; // "$ " lines are commands, the rest their output
  x: number;
  y: number;
  w: number;
  h: number;
  prompt?: string;
}
export interface TerminalHandle {
  show: StepAdder;
  run(command: number): StepAdder;
}

// The lines as commands with their output. Output before the first "$ " line is dropped (the parser reports it).
export function splitConsole(lines: string[]): { cmd: string; out: string[] }[] {
  const cmds: { cmd: string; out: string[] }[] = [];
  for (const l of lines) {
    if (l.startsWith("$ ")) cmds.push({ cmd: l.slice(2), out: [] });
    else cmds.at(-1)?.out.push(l);
  }
  return cmds;
}

const MAX_FONT = 30;
const MIN_FONT = 20; // 14.2 px at 1366, the legibility floor
const LINE_H = 1.4;
const CHAR_W = 0.6; // monospace advance in em, a little wide for safety
const PAD_X = 36;
const PAD_Y = 24;
const CPS = 34; // typing speed, characters per second (as crt)
const GAP = 0.08; // between output lines
const CURSOR = "█";

// Monospace is allowed under .k-term: a terminal is code, not a label.
const CSS = `
.k-term { position: absolute; box-sizing: border-box; overflow: hidden; border-radius: 12px;
  background: var(--k-surface); color: var(--k-fg); font-family: var(--k-font-code); }
.k-term > div { position: absolute; left: 0; right: 0; top: 0; padding-left: ${PAD_X}px; white-space: pre; overflow: hidden; }
.k-term .k-term-prompt { color: var(--k-accent); }
.k-term .k-term-more { color: var(--k-muted); font-family: var(--k-font); }
`;

function addStyle() {
  if (document.getElementById("k-term-style")) return;
  const s = document.createElement("style");
  s.id = "k-term-style";
  s.textContent = CSS;
  document.head.append(s);
}

export function terminal(ctx: Ctx, opts: TerminalOpts): TerminalHandle {
  addStyle();
  const cmds = splitConsole(opts.lines);
  const prompt = (opts.prompt ?? "$") + " ";
  const total = cmds.reduce((n, c) => n + 1 + c.out.length, 0);
  const cols = Math.max(1, ...cmds.flatMap((c) => [prompt.length + c.cmd.length, ...c.out.map((o) => o.length)]));
  const size = Math.max(
    MIN_FONT,
    Math.floor(Math.min(MAX_FONT, (opts.h - 2 * PAD_Y) / (total * LINE_H), (opts.w - PAD_X - PAD_Y) / (cols * CHAR_W))),
  );
  const lh = size * LINE_H;
  const rows = Math.floor((opts.h - 2 * PAD_Y) / lh);
  const width = Math.floor((opts.w - PAD_X - PAD_Y) / (size * CHAR_W));
  if (total > rows) ctx.problem(`terminal: ${total} lines do not fit; max ${rows}`);
  if (cols > width) ctx.problem(`terminal: lines longer than ${width} characters are clipped`);
  const vis = total > rows ? rows - 1 : total; // clipped output gives its last row to the marker

  const panel = ctx.html.appendChild(Object.assign(document.createElement("div"), { className: "k-term" }));
  Object.assign(panel.style, {
    left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, fontSize: `${size}px`, lineHeight: `${lh}px`,
    height: `${Math.min(opts.h, Math.min(total, rows) * lh + 2 * PAD_Y)}px`,
  });
  const row = (i: number) => {
    const e = panel.appendChild(document.createElement("div"));
    Object.assign(e.style, { top: `${PAD_Y + i * lh}px`, height: `${lh}px` });
    if (i >= vis) e.style.visibility = "hidden";
    return e;
  };
  let i = 0;
  const built = cmds.map((c) => {
    const head = row(i++);
    head.append(Object.assign(document.createElement("span"), { className: "k-term-prompt", textContent: prompt }));
    const text = head.appendChild(document.createElement("span"));
    text.dataset.kText = "";
    const out = c.out.map((o) => Object.assign(row(i++), { textContent: o }));
    const shown = out.filter((e) => e.style.visibility !== "hidden"); // before autoAlpha hides them all
    gsap.set(shown, { autoAlpha: 0 });
    return { cmd: c.cmd, text, out: shown };
  });
  if (total > vis) {
    const m = row(vis);
    m.style.visibility = "visible";
    m.className = "k-term-more";
    m.textContent = `+${total - vis} ${t("moreLines", ctx.deck.lang)}`;
    m.style.paddingLeft = `${PAD_X}px`;
  }
  gsap.set(panel, { autoAlpha: 0 });

  return {
    show: (tl) => tl.to(panel, { autoAlpha: 1, duration: motion.step }),
    run(k) {
      const c = built[k];
      if (!c) throw new Error(`terminal: no command ${k} (${built.length} commands)`);
      return (tl) => {
        tl.to({}, {
          duration: Math.max(0.1, c.cmd.length / CPS),
          ease: "none",
          onUpdate(this: gsap.core.Tween) {
            const p = this.progress();
            c.text.textContent = typed(c.cmd, p) + (p > 0 && p < 1 ? CURSOR : "");
          },
        });
        if (c.out.length) tl.to(c.out, { autoAlpha: 1, duration: motion.step, stagger: GAP });
      };
    },
  };
}
