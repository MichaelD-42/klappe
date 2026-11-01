import type { SectionModule } from "klappe/types";

// A quiet bed under the section: it starts with a forward step into it and fades out when a step leaves it.
const section: SectionModule = { music: { href: "media/sound-bed.mp3", volume: 0.25 } };
export default section;
