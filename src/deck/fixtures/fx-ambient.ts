import { assembleDeck } from "../assemble";

// Animated backgrounds. Section A: a looping video background under two scenes, then a scene with an aurora
// of its own. Section B (its own canvas): an aurora background. Section C: no background, a scene with a
// missing video background, and one with neither href nor animate. The video is a stand-in URL: tests stub
// play() and pause(), so no file decodes.
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
    },
    {
      "sections/10-a/section.ts": { background: { href: "media/loop.mp4", scrim: 0.6 } },
      "sections/10-a/30-own-aurora/scene.ts": { background: { animate: "aurora" } },
      "sections/20-b/section.ts": { background: { animate: "aurora" } },
      "sections/30-c/20-no-loop/scene.ts": { background: { href: "media/harbour.mp4", alt: "Waves in a harbour at night" } },
      "sections/30-c/30-empty/scene.ts": { background: {} },
    },
  );
  r.deck.files = { data: {}, media: { "media/loop.mp4": "data:video/mp4;base64,AAAA" } };
  return r;
};
