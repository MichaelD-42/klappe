import { iconTile, text } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { gsap } from "gsap";

// One gallery card per transition: the kind (the scene title) large, the section.ts line that asks for it, what it
// does (step 1 of scene.md), and a tile on the other side, so each frame has a shape the transition visibly moves.
// `call` replaces the section.ts line, for a transition that is no name.
// The name carries one data-k-match key on every card: the magicMove card flies it from the card before.
export function transitionCard(icon: string, side: "left" | "right", call?: string): SceneModule {
  const x = side === "left" ? 160 : 760;
  return {
    build(ctx) {
      const kind = ctx.doc!.title;
      const name = ctx.html.appendChild(document.createElement("div"));
      name.textContent = kind;
      name.dataset.kMatch = "transition-name";
      Object.assign(name.style, { position: "absolute", left: `${x}px`, top: "300px", font: "700 140px/1 var(--k-font)", color: "var(--k-accent)" });
      gsap.set(name, { autoAlpha: 0 });
      return {
        name,
        call: text(ctx, { text: call ?? `section.ts: { transition: "${kind}" }`, x, y: 480, w: 1000, size: 40, weight: 600 }),
        what: text(ctx, { text: ctx.doc!.steps[0].text, x, y: 560, w: 1000, size: 40, color: "--k-muted" }),
        tile: iconTile(ctx, icon, { x: side === "left" ? 1500 : 420, y: 540, size: 260, tone: "accent" }),
      };
    },
    steps: [
      (tl, r) => {
        tl.to(r.name, { autoAlpha: 1, duration: 0.4 });
        r.call.show(tl);
        r.what.show(tl);
        r.tile.draw(tl, "<");
      },
    ],
  };
}
