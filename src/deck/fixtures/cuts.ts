import { assembleDeck } from "../assemble";

// Three sections, a cut "short" of two (b left out) with its own 10 minutes and an appendix section between them in folder order, which plays last.
// c enters through a blackout, so the cut shows that the entered section's transition plays.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\nduration: 30\ncuts: { short: { sections: [a, c], duration: 10 } }\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- First.\n- Second.\n",
      "sections/15-x/section.md": "---\nappendix: true\n---\n# Backup\n",
      "sections/15-x/10-spare/scene.md": "## Spare\n\n- Backup one.\n- Backup two.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- Left out of the cut.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-three/scene.md": "## Three\n\n- Last of the talk.\n",
    },
    { "sections/30-c/section.ts": { transition: "blackout" } },
  );
