import { image, type ImageHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const PHOTOS = [
  { href: "media/fullscreen-hero.png", alt: "A wide landscape" },
  { href: "media/fullscreen-mood.png", alt: "A moody scene" },
  { href: "media/speaker-portrait.jpeg", alt: "A speaker's portrait" },
];

export default captioned("image(ctx, { duotone: true }) draws each photo in --k-bg and --k-accent", {
  build: (ctx): ImageHandle[] => PHOTOS.map((p, i) => image(ctx, { ...p, rect: { x: 160 + i * 540, y: 260, w: 500, h: 500 }, fit: "cover", duotone: true })),
  steps: [(tl, ims: ImageHandle[]) => ims.forEach((im, i) => im.show(tl, i ? "<" : undefined))],
});
