import { title, venn, type BasicHandle, type VennHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("venn(ctx, { sets, regions, … }) — light(…ids) lights exactly that region", {
  build: (ctx) => ({
    h: title(ctx),
    v: venn(ctx, {
      x: 160, y: 270, w: 1600, h: 670,
      sets: [{ id: "design", label: "Design" }, { id: "code", label: "Code" }, { id: "data", label: "Data" }],
      regions: { design: "Taste", "design+code": "Prototypes", "code+data": "Reports", "design+code+data": "Products" },
    }),
  }),
  steps: [
    (tl, r: { h: BasicHandle; v: VennHandle }) => (r.h.show(tl), r.v.show(tl)),
    (tl, r) => r.v.light("design")(tl),
    (tl, r) => r.v.light("design", "code")(tl),
    (tl, r) => r.v.light("code", "data")(tl),
    (tl, r) => r.v.light("design", "code", "data")(tl),
  ],
});
