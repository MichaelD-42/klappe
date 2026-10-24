import { callout, flow, type CalloutHandle, type FlowHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("callout(ctx, { target: f.node(\"api\"), … }) — node(id) is the box element", {
  build: (ctx) => {
    const f = flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 760, cols: 3, rows: 2 },
      nodes: [
        { id: "web", label: "Web app", col: 0, row: 1 },
        { id: "api", label: "API", col: 1, row: 1 },
        { id: "db", label: "Database", col: 2, row: 1 },
      ],
      edges: [{ from: "web", to: "api" }, { from: "api", to: "db" }],
    });
    return { f, note: callout(ctx, { target: f.node("api"), text: "Every request passes here", side: "top", offset: 140 }) };
  },
  steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl), (tl, r: { note: CalloutHandle }) => r.note.show(tl)],
});
