import type { SceneModule } from "klappe/types";
import { FRAME, type GlobalTeam } from "../section";

// The map, figures and titles live in section.ts: both scenes of this section use them on one frame.
// build() hands the section refs to the steps, so no default title is drawn over them.
const scene: SceneModule = {
  place: () => FRAME,
  build: (ctx) => ctx.canvas.refs.globalTeam,
  steps: [
    (tl, r: GlobalTeam) => {
      tl.to(r.titles[0], { autoAlpha: 1, duration: 0.6 });
      r.map.draw(tl);
    },
    // One site after another: the marker pops, its name shows with it.
    (tl, r: GlobalTeam) =>
      r.sites.forEach((s) => {
        r.map.site(tl, s.id);
        tl.to(s.label, { autoAlpha: 1, duration: 0.4 }, "<");
      }),
    // The team at each site, site by site, each figure with its role.
    (tl, r: GlobalTeam) =>
      r.sites.forEach((s) =>
        s.members.forEach((m) => {
          m.fig.appear(tl);
          tl.to(m.role, { autoAlpha: 1, duration: 0.5 }, "<");
        }),
      ),
  ],
};
export default scene;
