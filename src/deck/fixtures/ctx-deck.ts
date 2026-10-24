import { gsap } from "gsap";
import { counter, shout, type ShoutHandle } from "klappe/fx";
import { assembleDeck } from "../assemble";

// A German, bold deck: the scene reads its text from ctx.doc, the counter groups digits the German way,
// and a shout-out without an intensity takes the deck's.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\nlang: de\nintensity: bold\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## Aus der Datei\n\n- Zählen.\n- Rufen.\n",
    },
    {
      "sections/10-a/10-b/scene.ts": {
        build(ctx: any) {
          const h = ctx.html.appendChild(document.createElement("h2"));
          h.textContent = `${ctx.doc.title}|${ctx.doc.steps.map((s: any) => s.text).join(",")}`;
          h.dataset.kProbe = "";
          gsap.set(h, { autoAlpha: 0 });
          return { h, c: counter(ctx, { x: 400, y: 600, from: 0, to: 2000, label: "Dokumente" }), s: shout(ctx, { question: "Wer?", answer: "Wir." }) };
        },
        steps: [
          (tl: gsap.core.Timeline, r: { h: HTMLElement; c: ReturnType<typeof counter> }) => (tl.to(r.h, { autoAlpha: 1, duration: 0.6 }), r.c.run(tl)),
          (tl: gsap.core.Timeline, r: { s: ShoutHandle }) => r.s.enter(tl),
        ],
      },
    },
  );
