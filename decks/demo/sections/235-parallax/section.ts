import type { SectionModule } from "klappe/types";

// The background drifts with each camera flight across this section's canvas; the rings in front drift three times as far.
const section: SectionModule = {
  background: {
    href: "media/fullscreen-background.png",
    alt: "Blue light waves on a dark background",
    scrim: 0.6,
    parallax: true,
    layers: [{ href: "media/parallax-near.svg", alt: "Open rings at the edges of the frame", parallax: 3 }],
  },
};
export default section;
