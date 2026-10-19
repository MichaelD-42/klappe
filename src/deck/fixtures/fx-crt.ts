import type { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import { crt, type CrtHandle } from "../../fx/crt";
import type { SceneModule } from "../../types";

const BOOT = ["DEMO-OS v1.0  (c) 1986", "", "MEMORY TEST: 640K OK", "DRIVES A: B: C: ... OK"];

// Green, one step per line: power on, four lines, ready.
const green: SceneModule = {
  build: (ctx) => crt(ctx, { lines: BOOT }),
  steps: [
    (tl, h: CrtHandle) => h.powerOn(tl),
    ...BOOT.map((_, i) => (tl: gsap.core.Timeline, h: CrtHandle) => h.type(tl, i)),
    (tl, h: CrtHandle) => h.ready(tl),
  ],
};

// Amber, all lines in one step.
const amber: SceneModule = {
  build: (ctx) => crt(ctx, { color: "amber", lines: ["Loading: AI agents ............ OK", "Loading: knowledge graph ...... OK"] }),
  steps: [(tl, h: CrtHandle) => h.powerOn(tl), (tl, h: CrtHandle) => h.type(tl, "all"), (tl, h: CrtHandle) => h.ready(tl)],
};

// Three canvases: section b enters through an amber CRT transition, section c through a green one.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-green/scene.md": "## Green\n\n- Power on.\n- Banner.\n- Blank.\n- Memory.\n- Drives.\n- Ready.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-amber/scene.md": "## Amber\n\n- Power on.\n- All lines.\n- Ready.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-after/scene.md": "## After\n\n- A plain scene after a green CRT transition.\n",
    },
    {
      "sections/10-a/10-green/scene.ts": green,
      "sections/20-b/10-amber/scene.ts": amber,
      "sections/20-b/section.ts": { transition: "crt", transitionOptions: { color: "amber" } },
      "sections/30-c/section.ts": { transition: "crt" },
    },
  );
