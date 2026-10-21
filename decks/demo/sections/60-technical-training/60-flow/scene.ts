import { callout, flow, type CalloutHandle, type FlowHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { title } from "../section";

interface Refs {
  h: HTMLElement;
  f: FlowHandle;
  note: CalloutHandle;
}

const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, "Where retry runs");
    const f = flow(ctx, {
      grid: { x: 160, y: 320, w: 1600, h: 340, cols: 4, rows: 1 },
      nodes: [
        { id: "client", label: "Client", col: 0, row: 0, icon: "monitor" },
        { id: "api", label: "API", col: 1, row: 0, icon: "server" },
        { id: "queue", label: "Queue", col: 2, row: 0, icon: "layers" },
        { id: "worker", label: "Worker", col: 3, row: 0, icon: "cpu" },
      ],
      edges: [
        { from: "client", to: "api" },
        { from: "api", to: "queue" },
        { from: "queue", to: "worker" },
      ],
    });
    return { h, f, note: callout(ctx, { target: f.node("worker"), text: "retry() runs here", side: "bottom" }) };
  },
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.f.show()(tl);
    },
    (tl, r: Refs) => r.f.send({ path: ["client", "api", "queue", "worker"], count: 3, label: "job" })(tl),
    (tl, r: Refs) => {
      r.f.highlight(["worker"])(tl);
      r.note.show(tl);
    },
  ],
};
export default scene;
