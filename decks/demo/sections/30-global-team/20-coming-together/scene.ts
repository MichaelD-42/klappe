import type { SceneModule } from "klappe/types";
import { ARC, FIG, FRAME, type GlobalTeam } from "../section";

const TRAVEL = 3.4; // seconds along one route
const LAG = 0.15; // between one traveller and the next
const DRAW = 1.2; // seconds for one arc to draw

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
      // All four arcs draw together, a beat apart.
      r.sites.forEach((s, i) =>
        tl.fromTo(s.arc, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DRAW, ease: "power2.inOut" }, `arcs+=${0.4 + i * 0.2}`),
      );
    },
    // The labels leave as the teams set off, so no label sits under a moving figure.
    (tl, r: GlobalTeam) => {
      tl.addLabel("travel");
      tl.to([...r.members.map((m) => m.role), ...r.sites.map((s) => s.label)], { autoAlpha: 0, duration: 0.4 }, "travel");
      r.members.forEach((m, i) => m.fig.walk(tl, m.route, { duration: TRAVEL, at: `travel+=${i * LAG}` }));
    },
    // The title and the big host label would fill the zoomed frame; a small host label replaces it.
    // Figures and arcs thin out with the zoom, so they keep about the same rendered weight.
    (tl, r: GlobalTeam) => {
      tl.to([r.titles[1], r.hostLabel], { autoAlpha: 0, duration: 0.4 });
      tl.addLabel("zoom");
      r.map.zoomTo(tl, r.host);
      tl.to(r.zoomLabel, { autoAlpha: 1, duration: 0.6 });
      tl.to(r.members.map((m) => m.body), { strokeWidth: FIG.zoomed, duration: 1.6 }, "zoom");
      tl.to(r.sites.map((s) => s.arc), { strokeWidth: ARC.zoomed, duration: 1.6 }, "zoom");
    },
    // The map steps back as the table appears.
    (tl, r: GlobalTeam) => {
      tl.addLabel("table");
      tl.to(r.mapLayer, { opacity: 0.3, duration: 0.8 }, "table");
      tl.to(r.table, { autoAlpha: 1, duration: 0.5 }, "table");
      r.members.forEach((m) => m.fig.gather(tl, m.seat[0], m.seat[1], "table+=0.2", 1.4));
    },
  ],
};
export default scene;
