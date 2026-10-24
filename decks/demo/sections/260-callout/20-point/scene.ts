import { callout, type CalloutHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("callout(ctx, { target: { x, y }, text, side, offset })", {
  build: (ctx) => ({ note: callout(ctx, { target: { x: 600, y: 400 }, text: "A point on the scene", side: "bottom", offset: 160 }) }),
  steps: [(tl, r: { note: CalloutHandle }) => r.note.show(tl)],
});
