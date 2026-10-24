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
  wrap?: boolean; // long lines wrap onto rows indented by 2 characters, instead of clipping
}
export interface TerminalHandle {
  show(tl: gsap.core.Timeline, at?: gsap.Position): void;
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
const INDENT = 2; // characters before a wrapped continuation row

// Monospace is allowed under .k-term: a terminal is code, not a label.
const CSS = `
.k-term { position: absolute; box-sizing: border-box; overflow: hidden; border-radius: 12px;
  background: var(--k-surface); color: var(--k-fg); font-family: var(--k-font-code); font-variant-ligatures: none; }
.k-term > div { position: absolute; left: 0; right: 0; top: 0; padding-left: ${PAD_X}px; white-space: pre; overflow: hidden; }
.k-term .k-term-prompt { color: var(--k-accent); }
.k-term .k-term-more { color: var(--k-muted); font-family: var(--k-font); }
`;

// Where s breaks into rows of at most width characters (continuation rows lose INDENT): after the last space
// that fits, else mid-word.
function breaks(s: string, width: number): number[] {
  const out: number[] = [];
  for (let start = 0, room = width; s.length - start > room; room = Math.max(1, width - INDENT)) {
    const sp = s.lastIndexOf(" ", start + room - 1);
    start = sp >= start ? sp + 1 : start + room;
    out.push(start);
  }
  return out;
}
// The first n characters of s with a newline and the indent at each break before n.
const wrapped = (s: string, br: number[], n = s.length) =>
  [0, ...br.filter((b) => b > 0 && b < n)].map((b, i, a) => s.slice(b, a[i + 1] ?? n)).join("\n" + " ".repeat(INDENT));

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
  const texts = cmds.flatMap((c) => [prompt + c.cmd, ...c.out]);
  const cols = Math.max(1, ...texts.map((l) => l.length));
  const widthAt = (size: number) => Math.max(1, Math.floor((opts.w - PAD_X - PAD_Y) / (size * CHAR_W)));
  const breaksAt = (size: number) => texts.map((l) => (opts.wrap ? breaks(l, widthAt(size)) : []));
  const rowsAt = (size: number) => breaksAt(size).reduce((n, b) => n + 1 + b.length, 0);
  let size = Math.max(
    MIN_FONT,
    Math.floor(Math.min(MAX_FONT, (opts.h - 2 * PAD_Y) / (texts.length * LINE_H), opts.wrap ? MAX_FONT : (opts.w - PAD_X - PAD_Y) / (cols * CHAR_W))),
  );
  while (opts.wrap && size > MIN_FONT && rowsAt(size) * size * LINE_H > opts.h - 2 * PAD_Y) size--;
  const lh = size * LINE_H;
  const rows = Math.floor((opts.h - 2 * PAD_Y) / lh);
  const width = widthAt(size);
  const brk = breaksAt(size);
  const total = rowsAt(size); // screen rows: a wrapped line takes several
  if (total > rows) ctx.problem(`terminal: ${total} lines do not fit; max ${rows}`);
  if (!opts.wrap && cols > width) ctx.problem(`terminal: lines longer than ${width} characters are clipped`);
  // The first screen row of each line, and how many lines show: clipped output gives its last row to the marker.
  const starts = brk.map((_, i) => brk.slice(0, i).reduce((n, b) => n + 1 + b.length, 0));
  const room = total > rows ? rows - 1 : rows;
  const vis = brk.filter((b, i) => starts[i] + 1 + b.length <= room).length;

  const panel = ctx.html.appendChild(Object.assign(document.createElement("div"), { className: "k-term" }));
  Object.assign(panel.style, {
    left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, fontSize: `${size}px`, lineHeight: `${lh}px`,
    height: `${Math.min(opts.h, Math.min(total, rows) * lh + 2 * PAD_Y)}px`,
  });
  const row = (i: number) => {
    const e = panel.appendChild(document.createElement("div"));
    Object.assign(e.style, { top: `${PAD_Y + starts[i] * lh}px`, height: `${(1 + brk[i].length) * lh}px` });
    if (i >= vis) e.style.visibility = "hidden";
    return e;
  };
  let i = 0;
  const built = cmds.map((c) => {
    const head = row(i++);
    head.append(Object.assign(document.createElement("span"), { className: "k-term-prompt", textContent: prompt }));
    const text = head.appendChild(document.createElement("span"));
    text.dataset.kText = "";
    const br = brk[i - 1].map((b) => b - prompt.length); // the breaks in the command, after its prompt
    const out = c.out.map((o) => Object.assign(row(i), { textContent: wrapped(o, brk[i++]) }));
    const shown = out.filter((e) => e.style.visibility !== "hidden"); // before autoAlpha hides them all
    if (shown.length) gsap.set(shown, { autoAlpha: 0 }); // an empty target logs "GSAP target not found"
    return { cmd: c.cmd, br, text, out: shown };
  });
  if (vis < texts.length) {
    const m = row(vis);
    m.style.height = `${lh}px`;
    m.style.visibility = "visible";
    m.className = "k-term-more";
    m.textContent = `+${texts.length - vis} ${t("moreLines", ctx.deck.lang)}`;
    m.style.paddingLeft = `${PAD_X}px`;
  }
  gsap.set(panel, { autoAlpha: 0 });

  return {
    show: (tl, at) => void tl.to(panel, { autoAlpha: 1, duration: motion.step }, at),
    run(k) {
      const c = built[k];
      if (!c) throw new Error(`terminal: no command ${k} (${built.length} commands)`);
      return (tl) => {
        tl.to({}, {
          duration: Math.max(0.1, c.cmd.length / CPS),
          ease: "none",
          onUpdate(this: gsap.core.Tween) {
            const p = this.progress();
            c.text.textContent = wrapped(c.cmd, c.br, typed(c.cmd, p).length) + (p > 0 && p < 1 ? CURSOR : "");
          },
        });
        if (c.out.length) tl.to(c.out, { autoAlpha: 1, duration: motion.step, stagger: GAP });
      };
    },
  };
}
