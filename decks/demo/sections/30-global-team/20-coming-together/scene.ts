import { gsap } from "gsap";
import type { SceneModule } from "klappe/types";
import { FRAME, type GlobalTeam } from "../section";

const TRAVEL = 3; // seconds along one arc
const LAG = 0.15; // between one traveller and the next

// Same frame and map as Where we are (section.ts); build() hands the section refs to the steps.
const scene: SceneModule = {
  place: () => FRAME,
  build: (ctx) => ctx.canvas.refs.globalTeam,
  steps: [
    (tl, r: GlobalTeam) => {
      tl.addLabel("arcs");
      tl.to(r.titles[0], { autoAlpha: 0, duration: 0.4 }, "arcs");
      tl.to(r.titles[1], { autoAlpha: 1, duration: 0.6 }, "arcs+=0.2");
      r.map.site(tl, r.host);
      tl.to(r.hostLabel, { autoAlpha: 1, duration: 0.4 }, "<");
      // All arcs draw at once, a beat apart: each in its own child timeline, started at the same label.
      tl.addLabel("draw");
      r.sites.forEach((s, i) => {
        const arc = gsap.timeline();
        r.map.arc(arc, s.id, r.host);
        tl.add(arc, `draw+=${i * 0.2}`);
      });
    },
    (tl, r: GlobalTeam) => {
      tl.addLabel("travel");
      tl.to(r.members.map((m) => m.role), { autoAlpha: 0, duration: 0.4 }, "travel");
      r.members.forEach((m, i) => m.fig.walk(tl, m.route, { duration: TRAVEL, at: `travel+=${i * LAG}` }));
    },
    // The title and our big labels would fill the zoomed frame; the map shows the host's own label there.
    (tl, r: GlobalTeam) => {
      tl.to([r.titles[1], r.hostLabel, ...r.sites.map((s) => s.label)], { autoAlpha: 0, duration: 0.4 });
      r.map.zoomTo(tl, r.host);
    },
    (tl, r: GlobalTeam) => {
      tl.to(r.table, { autoAlpha: 1, duration: 0.5 });
      r.members.forEach((m, i) => m.fig.gather(tl, m.seat[0], m.seat[1], i ? "<" : undefined, 1.4));
    },
  ],
};
export default scene;
