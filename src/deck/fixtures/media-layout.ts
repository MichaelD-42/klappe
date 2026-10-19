import { assembleDeck } from "../assemble";

// A plain-Markdown scene with an image, a video, a chart and a broken data file: text left, media slot right.
// The media files do not exist; each slot shows its effect or a visible placeholder.
export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-media/scene.md": [
        "## Media",
        "",
        "- A plain step without media.",
        '- ![An engineer at a desk](media/desk.png "A line drawing of an engineer at a desk")',
        "- [A short clip](media/clip.mp4)",
        "- [Sample data](data/sales.csv)",
        "- [Broken data](data/broken.json)",
        "",
      ].join("\n"),
    },
    {},
  );
  r.deck.files = { data: { "data/broken.json": "{ not json" }, media: {} };
  return r;
};
