import { assembleDeck } from "../assemble";
import { qr, type QrHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A link as a QR code with a label, and text too long for any QR code (the fixture's only problem).
const link: SceneModule = {
  build: (ctx) => qr(ctx, { text: "https://klappe.test/talk?id=42", x: 760, y: 200, size: 400, label: "Slides and notes" }),
  steps: [(tl, h: QrHandle) => h.show(tl)],
};

const tooLong: SceneModule = {
  build: (ctx) => qr(ctx, { text: "x".repeat(8000), x: 760, y: 200, size: 400 }),
  steps: [(tl, h: QrHandle) => h.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# QR\n",
      "sections/10-a/10-link/scene.md": "## Link\n\n- Scan for the slides.\n",
      "sections/10-a/20-too-long/scene.md": "## Too long\n\n- No code.\n",
    },
    { "sections/10-a/10-link/scene.ts": link, "sections/10-a/20-too-long/scene.ts": tooLong },
  );
