import type { SectionModule } from "klappe/types";
import { title } from "../60-technical-training/section";

export { title };

// The break between the two trainings (10:30 to 10:45 on the agenda): the screen goes black for a moment.
const section: SectionModule = { transition: "blackout" };
export default section;
