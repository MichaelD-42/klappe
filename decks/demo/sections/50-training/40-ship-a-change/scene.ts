import { gsap } from "gsap";
import { decisionTree, swimlanes, type SwimlanesHandle, type TreeHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { layer, title } from "../section";

interface Refs {
  h: HTMLElement;
  lanes: Element[];
  s: SwimlanesHandle;
  t: TreeHandle;
}

// Who does what, then whether it ships: the lanes leave before the tree takes the frame.
const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, ctx.doc!.title);
    const lanes = layer(ctx);
    const s = swimlanes(lanes.ctx, {
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
    });
    const t = decisionTree(ctx, {
      x: 160, y: 290, w: 1600, h: 700,
      root: {
        label: "Tests green?",
        children: [
          {
            edge: "yes",
            node: {
              label: "Review approved?",
              children: [
                { edge: "yes", node: { label: "Ship it" } },
                { edge: "no", node: { label: "Address the comments" } },
              ],
            },
          },
          { edge: "no", node: { label: "Fix the tests" } },
        ],
      },
    });
    gsap.set(lanes.els, { autoAlpha: 1 }); // written at load, as a seek back to the start leaves it
    return { h, lanes: lanes.els, s, t };
  },
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.s.show(tl);
    },
    ...(["raise", "assess", "approve", "make", "accept"] as const).map((id) => (tl: gsap.core.Timeline, r: Refs) => r.s.walk(id)(tl)),
    (tl, r: Refs) => {
      tl.to(r.lanes, { autoAlpha: 0, duration: 0.5 });
      r.t.show(tl);
    },
    (tl, r: Refs) => r.t.path(["yes"])(tl),
    (tl, r: Refs) => r.t.path(["yes", "yes"])(tl),
  ],
};
export default scene;
