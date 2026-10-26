import { progress, waffle, type StatHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const SOURCE = "klappe demo sample";

export default captioned("waffle() and progress(), then to(value): a year later the share falls and the ring closes", {
  build: (ctx): StatHandle[] => [
    waffle(ctx, { x: 200, y: 160, size: 520, value: 37, label: "of releases needed a rollback", source: SOURCE }),
    progress(ctx, { x: 1100, y: 160, size: 520, value: 72, target: 100, label: "Services moved to the new platform", source: SOURCE }),
  ],
  steps: [(tl, s: StatHandle[]) => s.forEach((h) => h.show(tl)), (tl, [w, p]: StatHandle[]) => (w.to(12)(tl), p.to(100)(tl))],
});
