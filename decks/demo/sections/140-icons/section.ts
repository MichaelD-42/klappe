import type { IconHandle } from "klappe/fx";
import type { SectionModule } from "klappe/types";

// The whole row at once: each icon after the first starts with the one before ("<").
export const row = (tl: gsap.core.Timeline, items: IconHandle[], what: "draw" | "light") =>
  items.forEach((i, n) => i[what](tl, n ? "<" : undefined));

const section: SectionModule = { transition: "crt" };
export default section;
