import { gsap } from "gsap";
import { callout, code, type CalloutHandle, type CodeHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { heading, stageFrame } from "../section";

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

interface Refs {
  h: HTMLElement;
  c: CodeHandle;
  note: CalloutHandle;
  says: HTMLElement;
}

// Stages sit 1100 apart, so a frame centred on Design would show Clarification's title and answer at its left. This
// frame drops below the band instead: the stage's tile and box along its top, the code under them on the right,
// the title, the callout and what changed in the left column.
const DROP = 700;
const scene: SceneModule = {
  place: () => ({ ...stageFrame("design"), y: stageFrame("design").y + DROP }),
  build(ctx): Refs {
    const h = heading(ctx, ctx.doc!.title);
    Object.assign(h.style, { position: "absolute", left: "160px", top: "390px", margin: "0" });
    const c = code(ctx, { src: RETRY, lang: "js", x: 960, y: 390, w: 806, h: 620 });
    const note = callout(ctx, { target: c.line(BUG_LINE), text: "<= makes one attempt too many", side: "left" });
    const says = ctx.html.appendChild(document.createElement("p"));
    says.textContent = "One character: <= becomes <.";
    Object.assign(says.style, { position: "absolute", left: "160px", top: "560px", maxWidth: "640px", margin: "0", fontSize: "40px" });
    gsap.set(says, { autoAlpha: 0 });
    return { h, c, note, says };
  },
  steps: [
    // Clarification's last step already lit the Design tile.
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.c.show(tl);
    },
    (tl, r: Refs) => {
      r.c.focus([BUG_LINE])(tl);
      r.note.show(tl);
    },
    (tl, r: Refs) => {
      r.note.hide(tl);
      r.c.diff(FIXED)(tl);
      r.c.focus([BUG_LINE])(tl);
      tl.to(r.says, { autoAlpha: 1, duration: 0.6 });
    },
  ],
};
export default scene;
