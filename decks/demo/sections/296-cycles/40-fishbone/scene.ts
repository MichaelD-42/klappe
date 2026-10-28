import { fishbone, type FishboneHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("fishbone(ctx, { effect, causes }) — next() adds a bone, light(i) the root cause", {
  build: (ctx) =>
    fishbone(ctx, {
      x: 160, y: 60, w: 1600, h: 860,
      effect: "Releases slip",
      causes: [
        { label: "People", items: ["One reviewer", "New joiners"] },
        { label: "Process", items: ["Late testing", "Big batches"] },
        { label: "Tools", items: ["Slow CI", "Manual deploys"] },
        { label: "Environment", items: ["Shared staging", "Flaky test data"] },
      ],
    }),
  steps: [
    (tl, f: FishboneHandle) => f.show(tl),
    (tl, f) => f.next()(tl),
    (tl, f) => f.next()(tl),
    (tl, f) => f.next()(tl),
    (tl, f) => f.next()(tl),
    (tl, f) => f.light(1)(tl),
  ],
});
