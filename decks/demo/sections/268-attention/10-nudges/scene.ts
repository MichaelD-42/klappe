import { flow, glow, pulse, shake, type FlowHandle, type GlowHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  f: FlowHandle;
  g: GlowHandle;
  p: StepAdder;
  s: StepAdder;
}

export default captioned("glow(ctx, el) — on, breathe, off; pulse(ctx, el) and shake(el) — one-step nudges", {
  build: (ctx): Refs => {
    const f = flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 700, cols: 3, rows: 1 },
      nodes: [
        { id: "web", label: "Web app", col: 0, row: 0, icon: "monitor" },
        { id: "api", label: "API", col: 1, row: 0, icon: "server" },
        { id: "db", label: "Database", col: 2, row: 0, icon: "database" },
      ],
      edges: [{ from: "web", to: "api" }, { from: "api", to: "db" }],
    });
    return { f, g: glow(ctx, f.node("api")), p: pulse(ctx, f.node("web")), s: shake(f.node("db")) };
  },
  steps: [
    (tl, r: Refs) => r.f.show()(tl),
    (tl, r: Refs) => r.g.on(tl),
    (tl, r: Refs) => r.g.breathe(tl),
    (tl, r: Refs) => r.p(tl),
    (tl, r: Refs) => r.s(tl),
    (tl, r: Refs) => r.g.off(tl),
  ],
});
