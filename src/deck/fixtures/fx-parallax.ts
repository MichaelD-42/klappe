import { assembleDeck } from "../assemble";

// Three scenes on one canvas over a parallax background: the picture drifts a little with each flight.
// The picture is an inline SVG data URL with a grid, so a drift shows in a screenshot.
const GRID =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><pattern id="g" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="#3a5a80" stroke-width="4"/></pattern></defs><rect width="1920" height="1080" fill="#0f1b2d"/><rect width="1920" height="1080" fill="url(#g)"/></svg>`,
  );

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- The first scene.\n",
      "sections/10-a/20-two/scene.md": "## Two\n\n- The middle scene.\n",
      "sections/10-a/30-three/scene.md": "## Three\n\n- The last scene.\n",
    },
    { "sections/10-a/section.ts": { background: { href: "media/grid.svg", parallax: true } } },
  );
  r.deck.files = { data: {}, media: { "media/grid.svg": GRID } };
  return r;
};
