import { mindMap, type MindMapHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("mindMap(ctx, { root, x, y, w, h }) — next() grows one branch; light(i) comes back to one", {
  build: (ctx) =>
    mindMap(ctx, {
      x: 160, y: 60, w: 1600, h: 860,
      root: {
        label: "Onboarding",
        children: [
          { label: "People", children: [{ label: "Buddy" }, { label: "Team lunch" }] },
          { label: "Tools", children: [{ label: "Laptop" }, { label: "Accounts" }, { label: "VPN" }] },
          { label: "Product", children: [{ label: "Demo" }, { label: "Roadmap" }] },
          { label: "Process", children: [{ label: "Sprints" }, { label: "Reviews" }] },
        ],
      },
    }),
  steps: [
    (tl, m: MindMapHandle) => m.show(tl),
    (tl, m) => m.next()(tl),
    (tl, m) => m.next()(tl),
    (tl, m) => m.next()(tl),
    (tl, m) => m.next()(tl),
    (tl, m) => m.light(1)(tl),
  ],
});
