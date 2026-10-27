import { gsap } from "gsap";
import { callout, flow, sequence, type CalloutHandle, type FlowHandle, type SequenceHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { layer, title } from "../section";

const PARTS = [
  { id: "client", label: "Client", icon: "monitor" },
  { id: "api", label: "API", icon: "server" },
  { id: "queue", label: "Queue", icon: "layers" },
  { id: "worker", label: "Worker", icon: "cpu" },
];

interface Refs {
  h: HTMLElement;
  f: FlowHandle;
  note: CalloutHandle;
  space: Element[];
  s: SequenceHandle;
}

// The same four parts twice: as a system (flow), then as one request in time (sequence), which takes the frame.
const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, ctx.doc!.title);
    const space = layer(ctx);
    const f = flow(space.ctx, {
      grid: { x: 160, y: 320, w: 1600, h: 340, cols: 4, rows: 1 },
      nodes: PARTS.map((p, col) => ({ ...p, col, row: 0 })),
      edges: [
        { from: "client", to: "api" },
        { from: "api", to: "queue" },
        { from: "queue", to: "worker" },
      ],
    });
    const note = callout(space.ctx, { target: f.node("worker"), text: "retry() runs here", side: "bottom" });
    const s = sequence(ctx, {
      x: 160, y: 290, w: 1600, h: 720,
      actors: PARTS.map(({ id, label }) => ({ id, label })),
      messages: [
        { from: "client", to: "api", text: "POST /jobs" },
        { from: "api", to: "queue", text: "enqueue job" },
        { from: "api", to: "client", text: "202 Accepted", reply: true },
        { from: "queue", to: "worker", text: "deliver job" },
        { from: "worker", to: "worker", text: "retry()" },
        { from: "worker", to: "queue", text: "ack", reply: true },
      ],
    });
    gsap.set(space.els, { autoAlpha: 1 }); // written at load, as a seek back to the start leaves it
    return { h, f, note, space: space.els, s };
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
    // The system leaves before the timeline takes its place.
    (tl, r: Refs) => {
      tl.to(r.space, { autoAlpha: 0, duration: 0.5 });
      r.s.actors(tl);
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
