import { assembleDeck } from "../assemble";

// One scene per named layout: thirds, full-bleed and big-number (a short number and a longer one).
const PNG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#1d3557"/><circle cx="400" cy="300" r="180" fill="#e63946"/></svg>',
  );

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-thirds/scene.md": '---\nlayout: thirds\n---\n## Thirds\n\n- ![A red dot](media/dot.png "A red dot")\n',
      "sections/10-a/20-full/scene.md": '---\nlayout: full-bleed\n---\n## Full\n\n- ![A red dot](media/dot.png "A red dot")\n',
      "sections/10-a/30-big/scene.md": "---\nlayout: big-number\n---\n## Big\n\n- 42% fewer incidents\n- Measured over the third quarter.\n",
      "sections/10-a/40-long/scene.md": "---\nlayout: big-number\n---\n## Long\n\n- 1,250 users\n",
    },
    {},
  );
  r.deck.files = { data: {}, media: { "media/dot.png": PNG } };
  return r;
};
