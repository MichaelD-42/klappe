import { assembleDeck } from "../assemble";

// Four canvases: B enters by glitch, C by cube, D by page turn. Each scene has a title and one bullet step.
const scene = (title: string, line: string) => `## ${title}\n\n- ${line}\n`;
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": scene("One", "Before the glitch."),
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": scene("Two", "After the glitch, before the cube."),
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-three/scene.md": scene("Three", "After the cube, before the page turn."),
      "sections/40-d/section.md": "# D\n",
      "sections/40-d/10-four/scene.md": scene("Four", "After the page turn."),
    },
    {
      "sections/20-b/section.ts": { transition: "glitch", transitionOptions: { seed: 3 } },
      "sections/30-c/section.ts": { transition: "cube" },
      "sections/40-d/section.ts": { transition: "pageTurn" },
    },
  );
