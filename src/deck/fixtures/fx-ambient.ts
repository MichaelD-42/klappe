import { assembleDeck } from "../assemble";

// Animated backgrounds. Section A: a looping video background under two scenes, then a scene with an aurora
// of its own. Section B (its own canvas): an aurora background. Section C: no background, a scene with a
// missing video background, and one with neither href nor animate. Section D: a background the deck draws
// itself (animate as a function) and an animated SVG file, which also carries a script, a handler, an
// @import, an href-rewriting <set> and a foreignObject the sanitiser must drop. The video is a stand-in URL:
// tests stub play() and pause(), so no file decodes.
const ANIMATED_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" onload="window.hacked=1">` +
      `<style>@import url(https://evil.test/x.css); @keyframes spin { to { transform: rotate(360deg) } } .r { animation: spin 8s linear infinite; transform-origin: 960px 540px } .b { fill: url(https://evil.test/p.svg#x) }</style>` +
      `<script>window.hacked=2</script>` +
      `<rect width="1920" height="1080" fill="#0f1b2d"/>` +
      `<g class="r"><rect x="860" y="440" width="200" height="200" fill="#3a5a80"/></g>` +
      `<circle cx="300" cy="300" r="80" fill="#3a5a80"><animate attributeName="r" values="80;120;80" dur="4s" repeatCount="indefinite"/></circle>` +
      `<a href="#top"><set attributeName="href" to="javascript:alert(1)"/></a>` +
      `<foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>` +
      `</svg>`,
  );

// "--" inside an XML comment: the parser rejects the file.
const BAD_SVG = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><!-- a -- b --><style>@keyframes x {}</style></svg>`);

// A background the deck draws itself: one square that a CSS animation turns, played and paused by klappe.
function ownBackground(el: HTMLElement) {
  const sq = el.appendChild(document.createElement("div"));
  sq.dataset.own = "";
  Object.assign(sq.style, { position: "absolute", left: "860px", top: "440px", width: "200px", height: "200px", background: "var(--k-surface)" });
  const spin = sq.animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 8000, iterations: Infinity });
  spin.pause();
  return { play: () => spin.play(), pause: () => spin.pause() };
}
export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-loop/scene.md": "## Loop\n\n- A video plays behind this text.\n",
      "sections/10-a/20-same-loop/scene.md": "## Same loop\n\n- The camera flew here over the same video.\n",
      "sections/10-a/30-own-aurora/scene.md": "## Own aurora\n\n- This scene's aurora replaces the video.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-aurora/scene.md": "## Aurora\n\n- A slow drift in the theme's colours.\n- A second line.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-plain/scene.md": "## Plain\n\n- No background here.\n",
      "sections/30-c/20-no-loop/scene.md": "## No loop yet\n\n- The video file is missing.\n",
      "sections/30-c/30-empty/scene.md": "## Empty\n\n- A background with neither href nor animate.\n",
      "sections/40-d/section.md": "# D\n",
      "sections/40-d/10-own/scene.md": "## Own\n\n- A background the deck draws.\n",
      "sections/40-d/20-svg-loop/scene.md": "## SVG loop\n\n- An animated SVG file.\n",
      "sections/40-d/30-bad-svg/scene.md": "## Bad SVG\n\n- An animated SVG file that does not parse.\n",
    },
    {
      "sections/10-a/section.ts": { background: { href: "media/loop.mp4", alt: "Light moving on water", scrim: 0.6 } },
      "sections/10-a/30-own-aurora/scene.ts": { background: { animate: "aurora" } },
      "sections/20-b/section.ts": { background: { animate: "aurora" } },
      "sections/30-c/20-no-loop/scene.ts": { background: { href: "media/harbour.mp4", alt: "Waves in a harbour at night" } },
      "sections/30-c/30-empty/scene.ts": { background: {} },
      "sections/40-d/10-own/scene.ts": { background: { animate: ownBackground } },
      "sections/40-d/20-svg-loop/scene.ts": { background: { href: "media/loop.svg", alt: "A turning square" } },
      "sections/40-d/30-bad-svg/scene.ts": { background: { href: "media/bad.svg", alt: "A broken file" } },
    },
  );
  r.deck.files = { data: {}, media: { "media/loop.mp4": "data:video/mp4;base64,AAAA", "media/loop.svg": ANIMATED_SVG, "media/bad.svg": BAD_SVG } };
  return r;
};
