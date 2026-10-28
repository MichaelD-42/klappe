import { calendar, type CalendarHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

type R = { c: CalendarHandle; kickoff: StepAdder; sprint: StepAdder; freeze: StepAdder; release: StepAdder };

export default captioned("calendar(ctx, { month, … }) — mark(date, { label }) lights a day, span(from, to, { label }) a run of days", {
  build(ctx): R {
    const c = calendar(ctx, { month: "2026-11", x: 260, y: 90, w: 1400, h: 780 });
    return {
      c,
      kickoff: c.mark("2026-11-02", { label: "Kick-off" }),
      sprint: c.span("2026-11-04", "2026-11-17", { label: "Sprint 12" }),
      freeze: c.span("2026-11-23", "2026-11-25", { label: "Freeze" }),
      release: c.mark("2026-11-26", { label: "Release" }),
    };
  },
  steps: [(tl, r: R) => r.c.show(tl), (tl, r: R) => r.kickoff(tl), (tl, r: R) => r.sprint(tl), (tl, r: R) => r.freeze(tl), (tl, r: R) => r.release(tl)],
});
