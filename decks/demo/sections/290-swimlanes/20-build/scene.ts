import { swimlanes, type SwimlanesHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("tasks(ids) — those tasks show; a link draws once both its ends are there", {
  build: (ctx) => ({
    s: swimlanes(ctx, {
      x: 160, y: 140, w: 1600, h: 760,
      lanes: [{ id: "dev", label: "Developer" }, { id: "ci", label: "CI" }, { id: "rev", label: "Reviewer" }],
      tasks: [
        { id: "push", lane: "dev", col: 0, label: "Push a branch" },
        { id: "test", lane: "ci", col: 1, label: "Run the tests" },
        { id: "review", lane: "rev", col: 2, label: "Review" },
        { id: "merge", lane: "dev", col: 3, label: "Merge" },
      ],
      links: [
        { from: "push", to: "test" },
        { from: "test", to: "review" },
        { from: "review", to: "merge" },
      ],
    }),
  }),
  steps: [
    (tl, r: { s: SwimlanesHandle }) => r.s.tasks(["push"])(tl),
    (tl, r) => r.s.tasks(["test"])(tl),
    (tl, r) => r.s.tasks(["review", "merge"])(tl),
  ],
});
