import type { SectionModule } from "klappe/types";

// The background shows under every scene of this section; 40-scene-background replaces it.
const section: SectionModule = {
  transition: "fade",
  background: { href: "media/fullscreen-background.png", alt: "Blue light waves on a dark background", scrim: 0.6, kenBurns: true },
};
export default section;
