import type { SectionModule } from "klappe/types";

// The background drifts with each camera flight across this section's canvas.
const section: SectionModule = {
  background: { href: "media/fullscreen-background.png", alt: "Blue light waves on a dark background", scrim: 0.6, parallax: true },
};
export default section;
