import type { SectionModule } from "klappe/types";

// The background shows under every scene of this section; 40-scene-background replaces it.
const section: SectionModule = {
  transition: "fade",
  background: { href: "media/fullscreen-background.png", scrim: 0.6, kenBurns: true },
};
export default section;
