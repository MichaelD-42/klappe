import { gsap } from "gsap";
import { image } from "../../fx/media";
import { assembleDeck } from "../assemble";

// Full-screen images. Section A: cover, cover with Ken Burns, cover with a scrim and text on top,
// a missing cover. Section B (its own canvas): a background with a scrim behind two scenes, so the
// camera flies over it and the deck crosses a canvas transition into it.
// The pictures are inline SVG data URLs with an intrinsic 1920x1080 size, so tests need no photos.
const picture = (sky: string, glow: string, ridge: string, near: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">` +
      `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${glow}"/></linearGradient>` +
      `<radialGradient id="g"><stop offset="0" stop-color="#fff6d0"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="1920" height="1080" fill="url(#s)"/><circle cx="1320" cy="640" r="420" fill="url(#g)"/><circle cx="1320" cy="640" r="110" fill="#fff6d0"/>` +
      `<path d="M0 760 L260 600 L480 700 L760 520 L1040 690 L1300 560 L1600 720 L1920 600 V1080 H0 Z" fill="${ridge}"/>` +
      `<path d="M0 880 L340 760 L700 860 L1080 740 L1460 870 L1920 780 V1080 H0 Z" fill="${near}"/></svg>`,
  );
const DAWN = picture("#1b2a4a", "#f08a4b", "#3a2f4f", "#1a1726");
const DUSK = picture("#0d2238", "#3fa7a0", "#163a44", "#0a1a22");

const steps = (n: number) => Array.from({ length: n }, (_, i) => `- Step ${i + 1}.`).join("\n");
const fadeIn = (tl: gsap.core.Timeline, e: Element) => tl.to(e, { autoAlpha: 1, duration: 0.6 }, "<");

// Text on top of the picture: built after it, positioned, so it paints above.
function caption(ctx: any, title: string, line: string) {
  const d = document.createElement("div");
  Object.assign(d.style, { position: "absolute", left: "160px", top: "640px", width: "1500px" });
  const h = document.createElement("h2");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = line;
  d.append(h, p);
  ctx.html.append(d);
  gsap.set(d, { autoAlpha: 0 });
  return d;
}

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-cover/scene.md": `## Cover\n\n${steps(1)}\n`,
      "sections/10-a/20-ken-burns/scene.md": `## Ken Burns\n\n${steps(2)}\n`,
      "sections/10-a/30-scrim/scene.md": `## Scrim\n\n${steps(1)}\n`,
      "sections/10-a/40-missing/scene.md": `## Missing\n\n${steps(1)}\n`,
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-first/scene.md": `## Over the ridge\n\n- The background shows behind this text.\n- A second line.\n`,
      "sections/20-b/20-second/scene.md": `## The same sky\n\n- The camera flies, the picture stays behind.\n`,
    },
    {
      "sections/10-a/10-cover/scene.ts": {
        build: (ctx: any) => image(ctx, { href: "media/dawn.svg", alt: "A dawn sky over two ridges", fit: "cover" }),
        steps: [(tl: gsap.core.Timeline, i: any) => i.show(tl)],
      },
      "sections/10-a/20-ken-burns/scene.ts": {
        build: (ctx: any) => image(ctx, { href: "media/dawn.svg", alt: "A dawn sky over two ridges", fit: "cover", kenBurns: true }),
        steps: [(tl: gsap.core.Timeline, i: any) => i.show(tl), (tl: gsap.core.Timeline, i: any) => i.hide(tl)],
      },
      "sections/10-a/30-scrim/scene.ts": {
        build: (ctx: any) => ({
          img: image(ctx, { href: "media/dawn.svg", alt: "A dawn sky over two ridges", fit: "cover", scrim: 0.55 }),
          text: caption(ctx, "Text over a scrim", "The dark layer keeps this line readable on a bright sky."),
        }),
        steps: [(tl: gsap.core.Timeline, r: any) => (r.img.show(tl), fadeIn(tl, r.text))],
      },
      "sections/10-a/40-missing/scene.ts": {
        build: (ctx: any) => image(ctx, { href: "media/sunrise.png", alt: "A sunrise over a mountain ridge", fit: "cover" }),
        steps: [(tl: gsap.core.Timeline, i: any) => i.show(tl)],
      },
      "sections/20-b/section.ts": { background: { href: "media/dusk.svg", scrim: 0.45, kenBurns: true } },
    },
  );
  r.deck.files = { data: {}, media: { "media/dawn.svg": DAWN, "media/dusk.svg": DUSK } };
  return r;
};
