import { assembleDeck } from "../assemble";
import { qr, type QrHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// What klappe pdf turns into links and stills: a link, an address and a Markdown link in the text (and a script link
// that stays text), shown together at the scene's
// last step, a QR code of a link, and a YouTube player with an offline still, which the PDF prints in its place.
const STILL = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#e63946"/></svg>');

const code: SceneModule = {
  build: (ctx) => qr(ctx, { text: "https://klappe.test/slides", x: 760, y: 200, size: 400 }),
  steps: [(tl, h: QrHandle) => h.show(tl)],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-links/scene.md": "---\nstack: true\n---\n## Links\n\n- Docs at https://klappe.test/docs.\n- Mail ana@klappe.test\n- Read [the guide](https://klappe.test/guide), not [this](javascript:void0).\n",
      "sections/10-a/20-code/scene.md": "## Code\n\n- Scan it.\n",
      "sections/10-a/30-clip/scene.md": "## Clip\n\n- [A talk](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n  ![A still](media/still.svg)\n",
    },
    { "sections/10-a/20-code/scene.ts": code },
  );
  r.deck.files = { data: {}, media: { "media/still.svg": STILL } };
  return r;
};
