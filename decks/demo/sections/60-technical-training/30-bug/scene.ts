import { callout, code, icon, type CalloutHandle, type CodeHandle, type IconHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { BUG_LINE, RETRY, SLOT, title } from "../section";

interface Refs {
  h: HTMLElement;
  bug: IconHandle;
  c: CodeHandle;
  note: CalloutHandle;
}

// The same code in the same place as the walkthrough; the callout points left, into the free column.
const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, ctx.doc!.title);
    const bug = icon(ctx, "bug", { x: 580, y: 194, size: 80, color: "var(--k-accent)" });
    const c = code(ctx, { src: RETRY, lang: "js", ...SLOT });
    return { h, bug, c, note: callout(ctx, { target: c.line(BUG_LINE), text: "<= makes one attempt too many", side: "left" }) };
  },
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.bug.draw(tl, "<");
      r.c.show(tl);
      r.c.focus([BUG_LINE])(tl);
    },
    (tl, r: Refs) => r.note.show(tl),
  ],
};
export default scene;
