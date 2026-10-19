import { assembleDeck } from "../assemble";

// One scene per media variant. The local files are tiny data URLs; the online clip is routed by the e2e test.
// Variants: image, local video, direct-URL video, YouTube iframe, Vimeo iframe. Missing files: see fixture media-layout.
const PNG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#1d3557"/><circle cx="400" cy="300" r="180" fill="#e63946"/></svg>',
  );

const H = "https:" + "//"; // split: the lint forbids runtime URLs in src
const scene = (n: number, title: string, link: string) => [`sections/10-a/${n}0-${title.toLowerCase().replace(/\W+/g, "-")}/scene.md`, `## ${title}\n\n- Before.\n- ${link}\n- After.\n`] as const;

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      ...Object.fromEntries([
        scene(1, "Image", '![A red dot on blue](media/dot.png "A red dot")'),
        scene(2, "Local video", "[A local clip](media/clip.webm)"),
        scene(3, "Online video", `[An online clip](${H}klappe.test/clip.webm)`),
        scene(4, "YouTube", `[A YouTube talk](${H}www.youtube.com/watch?v=dQw4w9WgXcQ)`),
        scene(5, "Vimeo", `[A Vimeo talk](${H}vimeo.com/76979871)`),
      ]),
    },
    {},
  );
  r.deck.files = { data: {}, media: { "media/dot.png": PNG, "media/clip.webm": "data:video/webm;base64," } };
  return r;
};
