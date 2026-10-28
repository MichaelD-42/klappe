import { gsap } from "gsap";
import { pointer, type PointerHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { p: PointerHandle; view: HTMLElement; page: HTMLElement };

// A release-notes page taller than its window: the window clips it, scroll moves the page up inside it.
export default captioned("pointer — scroll(content, by): the content moves up inside the window that clips it", {
  build(ctx): R {
    const view = ctx.html.appendChild(document.createElement("div"));
    Object.assign(view.style, {
      position: "absolute", left: "460px", top: "140px", width: "1000px", height: "720px", boxSizing: "border-box", overflow: "hidden",
      border: "2px solid var(--k-line)", borderRadius: "12px", background: "var(--k-surface)",
    });
    const page = view.appendChild(document.createElement("div"));
    Object.assign(page.style, { padding: "32px 48px", font: "500 32px/1.5 var(--k-font)", color: "var(--k-fg)" });
    for (const v of ["2.4", "2.3", "2.2", "2.1", "2.0"]) {
      const h = page.appendChild(document.createElement("div"));
      h.textContent = `Version ${v}`;
      Object.assign(h.style, { font: "700 40px/1.3 var(--k-font)", margin: "24px 0 12px" });
      for (const line of ["Faster start-up", "Fixed the retry bug", "New export to PDF"]) page.appendChild(document.createElement("div")).textContent = `• ${line}`;
    }
    gsap.set(view, { autoAlpha: 0 });
    return { p: pointer(ctx, { at: { x: 1500, y: 900 } }), view, page };
  },
  steps: [
    (tl, r: R) => (tl.to(r.view, { autoAlpha: 1, duration: 0.6 }), r.p.show(tl)),
    (tl, r: R) => r.p.scroll(r.page, 500)(tl),
  ],
});
