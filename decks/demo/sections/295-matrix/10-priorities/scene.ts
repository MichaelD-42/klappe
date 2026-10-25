import { matrix, type MatrixHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("matrix(ctx, { axes, quadrants, items, … }) — place(id, quadrant); again, it moves", {
  build: (ctx) => ({
    m: matrix(ctx, {
      x: 160, y: 140, w: 1600, h: 760,
      axes: { x: "Effort", y: "Impact" },
      quadrants: { tl: "Quick wins", tr: "Big bets", bl: "Fill-ins", br: "Money pits" },
      items: [
        { id: "sso", label: "Single sign-on" },
        { id: "dark", label: "Dark mode" },
        { id: "audit", label: "Audit log" },
        { id: "pdf", label: "PDF export" },
      ],
    }),
  }),
  steps: [
    (tl, r: { m: MatrixHandle }) => r.m.show(tl),
    (tl, r) => r.m.place("sso", "tr")(tl),
    (tl, r) => r.m.place("dark", "bl")(tl),
    (tl, r) => r.m.place("audit", "tl")(tl),
    (tl, r) => r.m.place("pdf", "br")(tl),
    (tl, r) => r.m.place("sso", "tl")(tl),
  ],
});
