import { assembleDeck } from "../assemble";

// Three scenes on one canvas over a parallax background: the picture drifts a little with each flight, and a near
// layer (depth 3) drifts three times as far. The pictures are inline SVG data URLs with a grid and a ring, so a drift
// shows in a screenshot. A second section asks for depths out of range (the fixture's two problems).
const GRID =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><pattern id="g" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="#3a5a80" stroke-width="4"/></pattern></defs><rect width="1920" height="1080" fill="#0f1b2d"/><rect width="1920" height="1080" fill="url(#g)"/></svg>`,
  );

const RING =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><circle cx="300" cy="900" r="160" fill="none" stroke="#6a8ab0" stroke-width="12"/></svg>`);

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- The first scene.\n",
      "sections/10-a/20-two/scene.md": "## Two\n\n- The middle scene.\n",
      "sections/10-a/30-three/scene.md": "## Three\n\n- The last scene.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-bad/scene.md": "## Bad depths\n\n- Out of range.\n",
    },
    {
      "sections/10-a/section.ts": { background: { href: "media/grid.svg", parallax: true, layers: [{ href: "media/ring.svg", parallax: 3 }] } },
      "sections/20-b/section.ts": { background: { href: "media/grid.svg", parallax: 9, layers: [{ href: "media/ring.svg", parallax: 0 }] } },
    },
  );
  r.deck.files = { data: {}, media: { "media/grid.svg": GRID, "media/ring.svg": RING } };
  return r;
};
