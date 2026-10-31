import { assembleDeck } from "../assemble";
import { typeSize } from "../../fx/draw";
import type { SceneModule } from "../../types";

// Two sections on two canvases: the second is inverted (light) by its section.ts tokens. The third keeps the deck's.
const scene = (title: string) => `## ${title}\n\n- One.\n- Two.\n`;

// Records what the JS-side type scale gives a 44 px body at build time.
const probe: SceneModule = { build: (ctx) => void ctx.html.setAttribute("data-body", String(typeSize("body", 44))) };

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Section rhythm\n---\n",
      "sections/10-dark/section.md": "# Dark\n",
      "sections/10-dark/10-first/scene.md": scene("First"),
      "sections/20-light/section.md": "# Light\n",
      "sections/20-light/10-second/scene.md": scene("Second"),
      "sections/30-dark-again/section.md": "# Dark again\n",
      "sections/30-dark-again/10-third/scene.md": scene("Third"),
    },
    {
      "sections/10-dark/10-first/scene.ts": probe,
      "sections/20-light/10-second/scene.ts": probe,
      "sections/20-light/section.ts": {
        tokens: { "--k-bg": "#ffffff", "--k-fg": "#0f1b2d", "--k-muted": "#3d4a5e", "--k-surface": "#e6ebf2", "--k-line": "#6b7a90", "--k-accent": "#0b5fd0", "--k-size-body": "60px" },
      },
    },
  );
