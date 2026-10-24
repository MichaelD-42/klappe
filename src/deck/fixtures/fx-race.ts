import { assembleDeck } from "../assemble";
import { barRace, type BarRaceHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Five contenders over four years, three shown at once: the order changes every year, and Echo climbs in from
// below the frame. A second scene asks for a period that does not exist (the fixture's only problem).
const CSV = "# source: klappe demo sample\nyear,Alpha,Bravo,Charlie,Delta,Echo\n2021,50,40,30,20,10\n2022,55,60,35,25,30\n2023,58,62,70,26,65\n2024,60,64,72,27,90\n";

const race: SceneModule = {
  build: (ctx) => barRace(ctx, { src: "data/race.csv", rect: { x: 160, y: 80, w: 1600, h: 860 }, title: "Units by team", top: 3 }),
  steps: [
    (tl, r: BarRaceHandle) => r.show(tl),
    (tl, r: BarRaceHandle) => r.to(1)(tl),
    (tl, r: BarRaceHandle) => r.to("2023")(tl),
    (tl, r: BarRaceHandle) => r.to(3)(tl),
  ],
};

const badPeriod: SceneModule = {
  build: (ctx) => barRace(ctx, { src: "data/race.csv", rect: { x: 160, y: 80, w: 1600, h: 860 } }),
  steps: [(tl, r: BarRaceHandle) => r.show(tl), (tl, r: BarRaceHandle) => r.to("2030")(tl)],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Race\n",
      "sections/10-a/10-race/scene.md": "## Race\n\n- 2021.\n- 2022.\n- 2023.\n- 2024.\n",
      "sections/10-a/20-bad/scene.md": "## Bad period\n\n- Shown.\n- No such year.\n",
    },
    { "sections/10-a/10-race/scene.ts": race, "sections/10-a/20-bad/scene.ts": badPeriod },
  );
  r.deck.files = { data: { "data/race.csv": CSV }, media: {} };
  return r;
};
