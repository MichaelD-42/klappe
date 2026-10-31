import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Camera pacing: 'far' is entered by a whip from 'home', 'slow' by a 3 s linear flight, 'odd' names an ease GSAP lacks.
const at = (x: number, camera?: SceneModule["camera"]): SceneModule => ({ place: () => ({ x, y: 0, w: 1920, h: 1080 }), ...(camera && { camera }) });

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-home/scene.md": "## Home\n\n- Start.\n",
      "sections/10-a/20-far/scene.md": "## Far\n\n- A whip.\n",
      "sections/10-a/30-slow/scene.md": "## Slow\n\n- A slow push.\n",
      "sections/10-a/40-odd/scene.md": "## Odd\n\n- An odd ease.\n",
    },
    {
      "sections/10-a/10-home/scene.ts": at(0),
      "sections/10-a/20-far/scene.ts": at(9600, { whip: true }),
      "sections/10-a/30-slow/scene.ts": at(11520, { duration: 3, ease: "none" }),
      "sections/10-a/40-odd/scene.ts": at(13440, { ease: "wobbly" }),
    },
  );
