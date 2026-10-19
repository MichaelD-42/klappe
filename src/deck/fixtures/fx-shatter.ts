import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import { shatter, type ShatterOpts } from "klappe/fx";
import type { SceneModule } from "../../types";

// A title card, shown in step 1, then cracked, cracked to the edges and shattered.
const card = (title: string, opts: Omit<ShatterOpts, "target"> = {}): SceneModule => ({
  build(ctx) {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      inset: "60px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(140deg, color-mix(in srgb, var(--k-accent) 30%, var(--k-bg)), var(--k-bg))",
    });
    const h = document.createElement("h2");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = "Fixture for the shatter effect";
    Object.assign(p.style, { color: "var(--k-accent)", margin: "0" });
    el.append(h, p);
    ctx.html.append(el);
    const fx = shatter(ctx, { target: el, ...opts });
    gsap.set(el, { autoAlpha: 0 });
    return { el, fx };
  },
  steps: [
    (tl, { el }) => void tl.to(el, { autoAlpha: 1, duration: 0.6 }),
    (tl, { fx }) => fx.crack(tl),
    (tl, { fx }) => fx.crack2(tl),
    (tl, { fx }) => fx.fall(tl),
  ],
});

const steps = "- Show the card.\n- Crack.\n- Crack to the edges.\n- Shatter.\n";

// The shards must show the live frame: a count written from onUpdate, and a line faded out by an earlier step.
const live: SceneModule = {
  build(ctx) {
    const el = document.createElement("div");
    el.className = "fx-live";
    Object.assign(el.style, { position: "absolute", inset: "60px", padding: "120px", background: "var(--k-bg)", border: "4px solid var(--k-accent)" });
    const h = document.createElement("h2");
    h.textContent = "Live frame";
    const count = document.createElement("p");
    count.dataset.kText = "";
    count.textContent = "Count 0";
    const gone = document.createElement("p");
    gone.textContent = "This line fades out before the shatter";
    el.append(h, count, gone);
    ctx.html.append(el);
    const fx = shatter(ctx, { target: el, seed: 11 });
    gsap.set(el, { autoAlpha: 0 });
    return { el, count, gone, fx };
  },
  steps: [
    (tl, { el, count }) => {
      tl.to(el, { autoAlpha: 1, duration: 0.6 });
      tl.to({}, {
        duration: 0.6,
        onUpdate() {
          count.textContent = `Count ${Math.round(this.progress() * 42)}`;
        },
      });
    },
    (tl, { gone }) => void tl.to(gone, { autoAlpha: 0, duration: 0.6 }),
    (tl, { fx }) => fx.crack(tl),
    (tl, { fx }) => fx.fall(tl),
  ],
};

// Section A: one scene per option set. Section B enters through the shatter transition.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-default/scene.md": `## Default\n\n${steps}`,
      "sections/10-a/20-options/scene.md": `## Options\n\n${steps}`,
      "sections/10-a/30-slow/scene.md": `## Slow\n\n${steps}`,
      "sections/10-a/35-live/scene.md": "## Live\n\n- Show and count.\n- Fade a line out.\n- Crack.\n- Shatter.\n",
      "sections/10-a/40-last/scene.md": "## Last\n\n- This frame shatters into section B.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-after/scene.md": "## After\n\n- After the shatter transition.\n",
    },
    {
      "sections/10-a/10-default/scene.ts": card("Default shatter"),
      "sections/10-a/20-options/scene.ts": card("Twelve shards, low impact", {
        impact: { x: 400, y: 800 },
        shards: 12,
        fall: 0.6,
        toViewer: 0.6,
        seed: 7,
      }),
      "sections/10-a/30-slow/scene.ts": card("Slow, fifty shards", { shards: 50, fall: 2, toViewer: 0 }),
      "sections/10-a/35-live/scene.ts": live,
      "sections/20-b/section.ts": { transition: "shatter", transitionOptions: { shards: 20, seed: 3 } },
    },
  );
