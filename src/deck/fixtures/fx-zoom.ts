import { assembleDeck } from "../assemble";

// Three canvases. B enters by zooming into A's `door` ref. C enters by zooming into the frame centre.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Before the zoom.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- After the zoom.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-three/scene.md": "## Three\n\n- After the centre zoom.\n",
    },
    {
      "sections/10-a/section.ts": {
        build(ctx: any) {
          const door = document.createElement("div");
          Object.assign(door.style, { position: "absolute", left: "1500px", top: "700px", width: "200px", height: "280px", background: "var(--k-phosphor)" });
          ctx.html.append(door);
          return { door };
        },
      },
      "sections/20-b/section.ts": { transition: "zoom", zoomTarget: "door" },
      "sections/30-c/section.ts": { transition: "zoom" },
    },
  );
