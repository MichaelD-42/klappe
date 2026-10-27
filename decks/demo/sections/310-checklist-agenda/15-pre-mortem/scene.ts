import { checklist, type ChecklistHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const ITEMS = ["Monitoring alerts on the error rate", "Rollback tested on staging", "On-call told before the release"];

export default captioned("checklist() — tick(i) checks a box, fail(i) crosses it in --k-bad", {
  build: (ctx) => checklist(ctx, { items: ITEMS.map((text) => ({ text })), x: 160, y: 300, w: 1600 }),
  steps: [
    (tl, h: ChecklistHandle) => h.show(tl),
    (tl, h: ChecklistHandle) => h.tick(0)(tl),
    (tl, h: ChecklistHandle) => h.fail(1)(tl),
    (tl, h: ChecklistHandle) => h.tick(2)(tl),
  ],
});
