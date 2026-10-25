import { exerciseCard, title, type BasicHandle, type ExerciseCardHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  c: ExerciseCardHandle;
}

export default captioned("exerciseCard(ctx, { title, tasks, extras, minutes, group }) — extra(i) reveals an optional item", {
  build: (ctx): Refs => ({
    h: title(ctx),
    c: exerciseCard(ctx, {
      x: 360, y: 280, w: 1200, h: 640,
      title: "Map the release steps",
      minutes: 15,
      group: "pairs",
      tasks: ["List every step from merge to production.", "Mark the steps a person does by hand.", "Pick one to automate first."],
      extras: ["Time the slowest step on your last release.", "Compare your map with the next pair's."],
    }),
  }),
  steps: [
    (tl, r: Refs) => (r.h.show(tl), r.c.show(tl)),
    (tl, r) => r.c.extra(0)(tl),
    (tl, r) => r.c.extra(1)(tl),
  ],
});
