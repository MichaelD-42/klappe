import type { SectionModule } from "klappe/types";

// countsAim: a rect around the "Documents read" counter, a ref from the motion section's section.ts.
const section: SectionModule = { transition: "zoom", zoomTarget: "countsAim" };
export default section;
