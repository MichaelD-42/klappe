import { code, type CodeHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { BUG_LINE, FIXED, RETRY, SLOT, title } from "../section";

interface Refs {
  h: HTMLElement;
  says: HTMLElement;
  c: CodeHandle;
}

const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, ctx.doc!.title);
    // Under the title, in the free left column: what the diff changes.
    const says = ctx.html.appendChild(document.createElement("p"));
    says.textContent = "One character: <= becomes <.";
    Object.assign(says.style, { maxWidth: "640px", opacity: "0", visibility: "hidden" });
    return { h, says, c: code(ctx, { src: RETRY, lang: "js", ...SLOT }) };
  },
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.c.show(tl);
      r.c.focus([BUG_LINE])(tl);
    },
    (tl, r: Refs) => {
      r.c.diff(FIXED)(tl);
      r.c.focus([BUG_LINE])(tl);
      tl.to(r.says, { autoAlpha: 1, duration: 0.6 });
    },
  ],
};
export default scene;
