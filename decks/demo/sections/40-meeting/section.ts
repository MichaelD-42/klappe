import type { SectionModule } from "klappe/types";

// The camera dives into the host table on the global-team map; the meeting room grows out of it.
const section: SectionModule = { transition: "zoom", zoomTarget: "hostSite" };
export default section;
