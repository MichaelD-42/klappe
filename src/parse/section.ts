import type { SectionDoc } from "../types";
import { blocks } from "./blocks";
import { idFromFolder } from "./ids";

export function parseSection(md: string, folder: string): { section: SectionDoc; problems: string[] } {
  const { id, order } = idFromFolder(folder);
  const bs = blocks(md);
  const title = bs.find((b) => b.type === "h1")?.text ?? "";
  const notes = bs.find((b) => b.type === "quote")?.text ?? "";
  const problems = title ? [] : [`${folder}/section.md: missing # title`];
  return { section: { id, order, title, notes }, problems };
}
