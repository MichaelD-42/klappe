import { swimlanes, type SwimlanesHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { title } from "../section";

interface Refs {
  h: HTMLElement;
  s: SwimlanesHandle;
}

const scene: SceneModule = {
  build: (ctx): Refs => ({
    h: title(ctx, "A change request"),
    s: swimlanes(ctx, {
      x: 160, y: 290, w: 1600, h: 690,
      lanes: [
        { id: "req", label: "Requester" },
        { id: "team", label: "Team" },
        { id: "review", label: "Review" },
      ],
      tasks: [
        { id: "raise", lane: "req", col: 0, label: "Raise change" },
        { id: "assess", lane: "team", col: 1, label: "Assess impact" },
        { id: "approve", lane: "review", col: 2, label: "Approve change" },
        { id: "make", lane: "team", col: 3, label: "Make the change" },
        { id: "accept", lane: "req", col: 4, label: "Accept result" },
      ],
      links: [
        { from: "raise", to: "assess" },
        { from: "assess", to: "approve" },
        { from: "approve", to: "make" },
        { from: "make", to: "accept" },
      ],
    }),
  }),
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.s.show(tl);
    },
    (tl, r: Refs) => r.s.walk("raise")(tl),
    (tl, r: Refs) => r.s.walk("assess")(tl),
    (tl, r: Refs) => r.s.walk("approve")(tl),
    (tl, r: Refs) => r.s.walk("make")(tl),
    (tl, r: Refs) => r.s.walk("accept")(tl),
  ],
};
export default scene;
