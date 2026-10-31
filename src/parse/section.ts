import type { SectionDoc } from "../types";
import { blocks } from "./blocks";
import { parseFrontmatter } from "./frontmatter";
import { idFromFolder } from "./ids";

export function parseSection(md: string, folder: string): { section: SectionDoc; problems: string[] } {
  const { id, order } = idFromFolder(folder);
  const { data, body } = parseFrontmatter(md);
  const bs = blocks(body);
  const title = bs.find((b) => b.type === "h1")?.text ?? "";
  const notes = bs.filter((b) => b.type === "quote").map((b) => b.text).join("\n\n");
  const problems = title ? [] : [`${folder}/section.md: missing # title`];
  return { section: { id, order, title, notes, ...(data.appendix === true && { appendix: true }) }, problems };
}
