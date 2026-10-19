import type { Deck, Scene, Section, SceneModule, SectionModule } from "../types";
import { parseFrontmatter, toDeckMeta } from "../parse/frontmatter";
import { parseScene } from "../parse/scene";
import { parseSection } from "../parse/section";

const byOrder = (a: { order: number; folder: string }, b: { order: number; folder: string }) =>
  (a.order === b.order ? 0 : a.order < b.order ? -1 : 1) || (a.folder < b.folder ? -1 : a.folder > b.folder ? 1 : 0);

// Vite glob keys carry a path prefix before the deck root. With the known root (the deck.md key minus "deck.md"),
// strip exactly that prefix, so a "sections/" folder above the deck does not matter. Without it, cut at the leftmost match.
export function toDeckRelative(key: string, root?: string): string {
  const k = key.replace(/^@deck\//, "/");
  if (root !== undefined && k.startsWith(root)) return k.slice(root.length);
  const m = /(?:^|\/)(deck\.md|sections\/.*)$/.exec(k);
  return m ? m[1] : key;
}

export function assembleDeck(
  files: Record<string, string>,
  modules: Record<string, unknown>,
): { deck: Deck; problems: string[] } {
  const { data } = parseFrontmatter(files["deck.md"] ?? "");
  const { meta, problems } = toDeckMeta(data);

  // Folder tree from every key: section folder -> scene folders.
  const tree = new Map<string, Set<string>>();
  for (const key of [...Object.keys(files), ...Object.keys(modules)]) {
    const m = /^sections\/([^/]+)\/(?:([^/]+)\/)?[^/]+$/.exec(key);
    if (!m) continue;
    if (!tree.has(m[1])) tree.set(m[1], new Set());
    if (m[2]) tree.get(m[1])!.add(m[2]);
  }

  const sections: (Section & { folder: string })[] = [];
  for (const sf of tree.keys()) {
    const sp = `sections/${sf}`;
    const parsed = parseSection(files[`${sp}/section.md`] ?? "", sf);
    problems.push(...parsed.problems);
    if (!(`${sp}/section.md` in files)) problems.push(`${sp}: missing section.md`);
    const scenes: (Scene & { folder: string })[] = [];
    for (const cf of tree.get(sf)!) {
      const cp = `${sp}/${cf}`;
      if (!(`${cp}/scene.md` in files)) {
        problems.push(`${cp}: missing scene.md`);
        continue;
      }
      const r = parseScene(files[`${cp}/scene.md`], cf);
      problems.push(...r.problems);
      const module = modules[`${cp}/scene.ts`] as SceneModule | undefined;
      if (module?.steps && module.steps.length !== r.scene.steps.length)
        problems.push(`${cp}/scene.ts: ${module.steps.length} step functions, scene.md has ${r.scene.steps.length} steps`);
      scenes.push({ ...r.scene, sectionId: parsed.section.id, module, source: `${cp}/scene.md`, folder: cf });
    }
    scenes.sort(byOrder);
    sections.push({
      ...parsed.section,
      scenes,
      module: modules[`${sp}/section.ts`] as SectionModule | undefined,
      folder: sf,
    });
  }
  sections.sort(byOrder);

  for (const [kind, ids] of [
    ["section", sections.map((s) => s.id)],
    ["scene", sections.flatMap((s) => s.scenes.map((c) => c.id))],
  ] as const) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`duplicate ${kind} id '${id}'`);
      seen.add(id);
    }
  }
  return { deck: { meta, sections }, problems };
}
