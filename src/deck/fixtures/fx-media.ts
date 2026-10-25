import { video } from "../../fx/media";
import { assembleDeck } from "../assemble";

// One scene per media variant. The local files are tiny data URLs; the online clip is routed by the e2e test.
// Variants: image, local video, direct-URL video, YouTube iframe, Vimeo iframe, and full-frame video() with no rect
// (an online clip and a YouTube talk), then autoplaying players: YouTube muted in a box, Vimeo asking for sound. Missing files: see fixture media-layout.
const PNG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#1d3557"/><circle cx="400" cy="300" r="180" fill="#e63946"/></svg>',
  );

const H = "https://";
const scene = (n: number, title: string, link: string) => [`sections/10-a/${n}0-${title.toLowerCase().replace(/\W+/g, "-")}/scene.md`, `## ${title}\n\n- Before.\n- ${link}\n- After.\n`] as const;

const full = (href: string, title: string, more = {}) => ({
  build: (ctx: any) => video(ctx, { href, title, ...more }),
  steps: [(tl: gsap.core.Timeline, v: ReturnType<typeof video>) => v.show(tl), null],
});

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      ...Object.fromEntries([
        scene(1, "Image", '![A red dot on blue](media/dot.png "A red dot")'),
        scene(2, "Local video", "[A local clip](media/clip.webm)"),
        scene(3, "Online video", `[An online clip](${H}klappe.test/clip.webm)`),
        scene(4, "YouTube", `[A YouTube talk](${H}www.youtube.com/watch?v=dQw4w9WgXcQ)
  ![A still](media/dot.png)`),
        scene(5, "Vimeo", `[A Vimeo talk](${H}vimeo.com/76979871)`),
      ]),
      "sections/10-a/60-full-video/scene.md": "## Full video\n\n- The clip fills the frame.\n- After.\n",
      "sections/10-a/70-full-youtube/scene.md": "## Full YouTube\n\n- The talk fills the frame.\n- After.\n",
      "sections/10-a/80-autoplay-muted/scene.md": "## Autoplay muted\n\n- The talk starts without sound.\n- After.\n",
      "sections/10-a/90-autoplay-sound/scene.md": "## Autoplay sound\n\n- The talk asks for sound.\n- After.\n",
    },
    {
      "sections/10-a/60-full-video/scene.ts": full(`${H}klappe.test/full.webm`, "A full-frame clip"),
      "sections/10-a/70-full-youtube/scene.ts": full(`${H}www.youtube.com/watch?v=dQw4w9WgXcQ`, "A full-frame talk"),
      "sections/10-a/80-autoplay-muted/scene.ts": full(`${H}www.youtube.com/watch?v=dQw4w9WgXcQ`, "A muted talk", { autoplay: true, rect: { x: 160, y: 140, w: 1600, h: 800 } }),
      "sections/10-a/90-autoplay-sound/scene.ts": full(`${H}vimeo.com/76979871`, "A talk with sound", { autoplay: true, muted: false }),
    },
  );
  r.deck.files = { data: {}, media: { "media/dot.png": PNG, "media/clip.webm": "data:video/webm;base64," } };
  return r;
};
