import { gsap } from "gsap";
import { image } from "../../fx/media";
import { assembleDeck } from "../assemble";

// Full-frame pictures. Section A: cover, cover with Ken Burns, cover with a scrim and text on top,
// a missing cover. Section B (its own canvas): a background with a scrim behind its scenes, so the
// camera flies over it and the deck crosses a canvas transition into it. The second scene has its own
// background; the third has a missing one with alt text.
// The pictures are inline SVG data URLs with an intrinsic 1920x1080 size, so tests need no photos.
// busy: white dots over the whole picture, the worst case for text on a scrim.
const picture = (sky: string, glow: string, ridge: string, near: string, busy = false) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">` +
      `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${glow}"/></linearGradient>` +
      `<radialGradient id="g"><stop offset="0" stop-color="#fff6d0"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>` +
      `<pattern id="d" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="7" fill="#fff"/></pattern></defs>` +
      `<rect width="1920" height="1080" fill="url(#s)"/><circle cx="1320" cy="640" r="420" fill="url(#g)"/><circle cx="1320" cy="640" r="110" fill="#fff6d0"/>` +
      `<path d="M0 760 L260 600 L480 700 L760 520 L1040 690 L1300 560 L1600 720 L1920 600 V1080 H0 Z" fill="${ridge}"/>` +
      `<path d="M0 880 L340 760 L700 860 L1080 740 L1460 870 L1920 780 V1080 H0 Z" fill="${near}"/>` +
      (busy ? `<rect width="1920" height="1080" fill="url(#d)"/>` : "") +
      `</svg>`,
  );
const DAWN = picture("#1b2a4a", "#f08a4b", "#3a2f4f", "#1a1726");
const DAWN_BUSY = picture("#1b2a4a", "#f08a4b", "#3a2f4f", "#1a1726", true);
const DUSK_BUSY = picture("#0d2238", "#3fa7a0", "#163a44", "#0a1a22", true);
const SCRIM = 0.6; // README's value for text on a picture

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
      "sections/20-b/20-second/scene.md": `## Its own sky\n\n- This scene's background replaces the section's.\n`,
      "sections/20-b/30-no-sky/scene.md": `## No sky yet\n\n- The background file is missing.\n`,
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
          img: image(ctx, { href: "media/dawn-busy.svg", alt: "A dawn sky over two ridges", fit: "cover", scrim: SCRIM }),
          text: caption(ctx, "Text over a scrim", "The dark layer keeps this line readable on a bright sky."),
        }),
        steps: [(tl: gsap.core.Timeline, r: any) => (r.img.show(tl), fadeIn(tl, r.text))],
      },
      "sections/10-a/40-missing/scene.ts": {
        build: (ctx: any) => image(ctx, { href: "media/sunrise.png", alt: "A sunrise over a mountain ridge", fit: "cover" }),
        steps: [(tl: gsap.core.Timeline, i: any) => i.show(tl)],
      },
      "sections/20-b/section.ts": { background: { href: "media/dusk-busy.svg", scrim: SCRIM, kenBurns: true } },
      "sections/20-b/20-second/scene.ts": { background: { href: "media/dawn.svg", scrim: SCRIM, kenBurns: true } },
      "sections/20-b/30-no-sky/scene.ts": { background: { href: "media/harbour.png", alt: "A harbour at night" } },
    },
  );
  r.deck.files = { data: {}, media: { "media/dawn.svg": DAWN, "media/dawn-busy.svg": DAWN_BUSY, "media/dusk-busy.svg": DUSK_BUSY } };
  return r;
};
