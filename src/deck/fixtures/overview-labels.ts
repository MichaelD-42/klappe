import { assembleDeck } from "../assemble";

// Three sections whose agenda scenes share the title "Today", one with an overview label, and a scene with its own.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-intro/section.md": "# Intro\n",
      "sections/10-intro/10-today/scene.md": "## Today\n\n- Step 1.\n",
      "sections/10-intro/20-why/scene.md": "## Why\n\n- Step 1.\n",
      "sections/20-lab/section.md": "# Lab\n",
      "sections/20-lab/10-today/scene.md": "## Today\n\n- Step 1.\n",
      "sections/20-lab/20-setup/scene.md": "## Setup\n\n- Step 1.\n",
      "sections/30-wrap/section.md": "# Wrap-up and next steps\n",
      "sections/30-wrap/10-today/scene.md": "## Today\n\n- Step 1.\n",
      "sections/30-wrap/20-end/scene.md": "## Thanks\n\n- Step 1.\n",
    },
    {
      "sections/30-wrap/section.ts": { overviewLabel: "Wrap-up" },
      "sections/30-wrap/20-end/scene.ts": { overviewLabel: "Thanks and questions" },
    },
  );
