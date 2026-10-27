import type { SectionModule } from "klappe/types";

// A dark, empty stage behind the opening's slide. The scrim keeps it near black. No Ken Burns: the opening holds still.
const section: SectionModule = {
  background: { href: "media/opening-backdrop.png", alt: "An empty, dark theatre stage under a single spotlight", scrim: 0.6 },
};
export default section;
