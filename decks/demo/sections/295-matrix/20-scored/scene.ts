import { gsap } from "gsap";
import { matrix, type MatrixHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { m: MatrixHandle; sample: HTMLElement };

export default captioned("matrix — place(id, { x, y }) puts an item at its scores, 0 to 1", {
  build: (ctx): R => {
    const m = matrix(ctx, {
      x: 160, y: 140, w: 1600, h: 760,
      axes: { x: "Effort", y: "Impact" },
      items: [
        { id: "sso", label: "Single sign-on" },
        { id: "dark", label: "Dark mode" },
        { id: "audit", label: "Audit log" },
      ],
    });
    // Made-up scores: say so on screen.
    const sample = ctx.html.appendChild(document.createElement("div"));
    sample.textContent = "Sample data";
    Object.assign(sample.style, { position: "absolute", right: "160px", top: "96px", fontSize: "24px", color: "var(--k-muted)" });
    gsap.set(sample, { autoAlpha: 0 });
    return { m, sample };
  },
  steps: [
    (tl, r: R) => (r.m.show(tl), void tl.to(r.sample, { autoAlpha: 1, duration: 0.4 }, "<")),
    (tl, r: R) => r.m.place("sso", { x: 0.6, y: 0.85 })(tl),
    (tl, r: R) => r.m.place("dark", { x: 0.2, y: 0.2 })(tl),
    (tl, r: R) => r.m.place("audit", { x: 0.25, y: 0.7 })(tl),
    (tl, r: R) => r.m.place("sso", { x: 0.35, y: 0.85 })(tl),
  ],
});
