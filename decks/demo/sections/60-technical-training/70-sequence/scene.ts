import { sequence, type SequenceHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { title } from "../section";

interface Refs {
  h: HTMLElement;
  s: SequenceHandle;
}

const scene: SceneModule = {
  build: (ctx): Refs => ({
    h: title(ctx, ctx.doc!.title),
    s: sequence(ctx, {
      x: 160, y: 290, w: 1600, h: 720,
      actors: [
        { id: "client", label: "Client" },
        { id: "api", label: "API" },
        { id: "queue", label: "Queue" },
        { id: "worker", label: "Worker" },
      ],
      messages: [
        { from: "client", to: "api", text: "POST /jobs" },
        { from: "api", to: "queue", text: "enqueue job" },
        { from: "api", to: "client", text: "202 Accepted", reply: true },
        { from: "queue", to: "worker", text: "deliver job" },
        { from: "worker", to: "worker", text: "retry()" },
        { from: "worker", to: "queue", text: "ack", reply: true },
      ],
    }),
  }),
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.s.actors(tl);
    },
    (tl, r: Refs) => {
      r.s.message(0)(tl);
      r.s.message(1)(tl);
    },
    (tl, r: Refs) => r.s.message(2)(tl),
    (tl, r: Refs) => {
      r.s.message(3)(tl);
      r.s.message(4)(tl);
    },
    (tl, r: Refs) => r.s.message(5)(tl),
  ],
};
export default scene;
