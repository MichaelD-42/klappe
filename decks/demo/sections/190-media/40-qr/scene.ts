import { qr, type QrHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("qr(ctx, { text, x, y, size, label }) — dark on light, so every phone reads it", {
  build: (ctx) => qr(ctx, { text: "https://github.com/MichaelD-42/klappe", x: 735, y: 180, size: 450, label: "klappe on GitHub" }),
  steps: [(tl, h: QrHandle) => h.show(tl)],
});
