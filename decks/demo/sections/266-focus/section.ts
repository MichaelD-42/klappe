import type { SectionModule } from "klappe/types";

// The catalog entry for push: this section pushes the one before it off to the left.
const section: SectionModule = { transition: "push" };
export default section;
