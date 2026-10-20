import type { SectionModule } from "klappe/types";

// A dark, empty stage behind the opening. The scrim keeps it near black, so the hold after the
// slide falls away still reads as a black screen. No Ken Burns: the opening holds still.
const section: SectionModule = {
  background: { href: "media/opening-backdrop.png", alt: "An empty, dark theatre stage under a single spotlight", scrim: 0.6 },
};
export default section;
