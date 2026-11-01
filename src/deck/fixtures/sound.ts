import { assembleDeck } from "../assemble";
import { cue } from "klappe/fx";
import type { SceneModule, SectionModule, StepAdder } from "../../types";

// deck.md sound: true. Section a has a music bed; its scene's step 2 has a cue. Section b is quiet.
// ?fixture=sound&off=1 leaves sound off in deck.md.
const hit: SceneModule = {
  build: (ctx) => cue(ctx, { href: "media/hit.mp3", volume: 0.5 }),
  steps: [null, (tl, c: StepAdder) => (tl.to({}, { duration: 0.2 }), c(tl)), null],
};
const bed: SectionModule = { music: { href: "media/bed.mp3", volume: 0.3 } };
export default () => {
  const off = new URLSearchParams(location.search).has("off");
  const r = assembleDeck(
    {
      "deck.md": `---\ntitle: Fixture\n${off ? "" : "sound: true\n"}---\n`,
      "sections/10-intro/section.md": "# Intro\n",
      "sections/10-intro/10-hello/scene.md": "## Hello\n\n- Hello.\n",
      "sections/20-a/section.md": "# A\n",
      "sections/20-a/10-one/scene.md": "## One\n\n- Quiet.\n- A hit.\n- After.\n",
      "sections/30-b/section.md": "# B\n",
      "sections/30-b/10-two/scene.md": "## Two\n\n- Quiet.\n",
    },
    { "sections/20-a/section.ts": bed, "sections/20-a/10-one/scene.ts": hit },
  );
  r.deck.files = { data: {}, media: { "media/hit.mp3": "data:audio/mpeg;base64,aGl0", "media/bed.mp3": "data:audio/mpeg;base64,YmVk" } };
  return r;
};
