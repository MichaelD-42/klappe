import { gsap } from "gsap";
import { text } from "klappe/fx";
import type { OverlayModule } from "klappe/types";

// What stays on screen while the camera moves: a brand bar and a chapter label. The demo shows it in the overlay
// section only; a deck's own overlay would show on every scene and leave the title section bare.
const overlay: OverlayModule = {
  build: (ctx) => {
    const bar = ctx.html.appendChild(document.createElement("div"));
    Object.assign(bar.style, { position: "absolute", left: "64px", right: "64px", bottom: "40px", height: "4px", background: "var(--k-accent)" });
    const chapter = text(ctx, { text: "", x: 64, y: 980, w: 1200, size: 24, color: "--k-muted" }).el;
    gsap.set(bar, { autoAlpha: 0 });
    return { bar, chapter };
  },
  update: (at, r: { bar: HTMLElement; chapter: HTMLElement }) => {
    const on = at.section === "overlay";
    r.chapter.textContent = `${at.sectionTitle} · ${at.sceneTitle}`;
    gsap.set([r.bar, r.chapter], { autoAlpha: on ? 1 : 0 });
  },
};
export default overlay;
