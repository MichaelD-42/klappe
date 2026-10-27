import { gsap } from "gsap";
import { callout, code, icon, terminal, type CalloutHandle, type CodeHandle, type IconHandle, type TerminalHandle } from "klappe/fx";
import type { SceneModule, StepFn } from "klappe/types";
import { title } from "../section";

const RETRY = `// Runs task until it succeeds or the attempts run out.
const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function retry(task, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const delay = opts.delay ?? 200;
  let lastError;

  for (let i = 0; i <= attempts; i++) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      console.warn(\`attempt \${i + 1} failed\`);
      await sleep(delay * 2 ** i);
    }
  }
  throw lastError;
}`;
const BUG_LINE = RETRY.split("\n").findIndex((l) => l.includes("i <= attempts")) + 1;
const FIXED = RETRY.replace("i <= attempts", "i < attempts");
// The walkthrough's groups, one step each.
const GROUPS = [[2, 3], [5, 6, 7, 8], [10, 11, 12], [13, 14, 15, 16, 17], [19]];
// Made up: a sample run, labelled on screen.
const RUN = [
  "$ npm test", " ✓ returns the first success", " ✓ waits longer after each failure", " ✓ stops after 3 attempts", " 3 passed",
  "$ git diff --stat", " retry.js | 2 +-", " 1 file changed, 1 insertion(+), 1 deletion(-)",
];

interface Refs {
  h: HTMLElement;
  bug: IconHandle;
  c: CodeHandle;
  note: CalloutHandle;
  says: HTMLElement;
  sample: HTMLElement;
  term: TerminalHandle;
}

// The code holds the right column throughout; the left column takes the callout, then the fix and the test run.
const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, ctx.doc!.title);
    const bug = icon(ctx, "bug", { x: 830, y: 194, size: 80, color: "var(--k-accent)" });
    const c = code(ctx, { src: RETRY, lang: "js", x: 960, y: 140, w: 806, h: 799 });
    const note = callout(ctx, { target: c.line(BUG_LINE), text: "<= makes one attempt too many", side: "left" });
    const says = ctx.html.appendChild(document.createElement("p"));
    says.textContent = "One character: <= becomes <.";
    Object.assign(says.style, { maxWidth: "640px" });
    const sample = ctx.html.appendChild(document.createElement("div"));
    sample.textContent = "Sample data";
    Object.assign(sample.style, { position: "absolute", left: "160px", top: "470px", fontSize: "24px", color: "var(--k-muted)" });
    const term = terminal(ctx, { lines: RUN, x: 160, y: 510, w: 740, h: 400, wrap: true });
    gsap.set([says, sample], { autoAlpha: 0 });
    return { h, bug, c, note, says, sample, term };
  },
  steps: [
    ...GROUPS.map((lines, i): StepFn => (tl, r: Refs) => {
      if (!i) {
        tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
        r.c.show(tl);
      }
      r.c.focus(lines)(tl);
    }),
    (tl, r: Refs) => {
      r.bug.draw(tl);
      r.c.focus([BUG_LINE])(tl);
    },
    (tl, r: Refs) => r.note.show(tl),
    (tl, r: Refs) => {
      r.note.hide(tl);
      r.c.diff(FIXED)(tl);
      r.c.focus([BUG_LINE])(tl);
      tl.to(r.says, { autoAlpha: 1, duration: 0.6 });
    },
    (tl, r: Refs) => {
      tl.to(r.sample, { autoAlpha: 1, duration: 0.4 });
      r.term.show(tl, "<");
      r.term.run(0)(tl);
    },
    (tl, r: Refs) => r.term.run(1)(tl),
  ],
};
export default scene;
