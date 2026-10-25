import { text, title, type BasicHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";

export interface CheckpointOpts {
  ask: string; // the question, shown with the title
  hint: string; // shown in step 2
}

interface Refs {
  h: BasicHandle;
  ask: BasicHandle;
  hint: BasicHandle;
}

// One scene shape for many scenes: each scene.ts is `export default checkpoint({ ... })`.
// It lives outside sections/, so the loader does not take it for a scene module.
// Two steps, so every scene.md that uses it has two list items. A fresh object per call: no state shared between scenes.
export function checkpoint({ ask, hint }: CheckpointOpts): SceneModule {
  return {
    build: (ctx): Refs => ({
      h: title(ctx),
      ask: text(ctx, { text: ask, x: 160, y: 380, w: 1600, size: 56, weight: 700 }),
      hint: text(ctx, { text: hint, x: 160, y: 600, w: 1600, size: 40, color: "--k-muted" }),
    }),
    steps: [(tl, r: Refs) => (r.h.show(tl), r.ask.show(tl)), (tl, r: Refs) => r.hint.show(tl)],
  };
}
