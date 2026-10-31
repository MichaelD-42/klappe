import type { CanvasLayout, Deck, Rect, Section, StepAddr } from "./types";

const isRect = (r: unknown): r is Rect =>
  !!r && (["x", "y", "w", "h"] as const).every((k) => Number.isFinite((r as Rect)[k]));

export function layoutDeck(deck: Deck): { canvases: CanvasLayout[]; problems: string[] } {
  const problems: string[] = [];
  const stage = deck.meta.frame ?? { w: 1920, h: 1080 };
  const known = new Set(deck.sections.map((s) => s.id));
  const groupOf = new Map<string, string[]>(); // section id -> its (first) shared group
  for (const group of deck.meta.sharedCanvas) {
    for (const id of group) if (!known.has(id)) problems.push(`sharedCanvas: unknown section '${id}'`);
    const ids = group.filter((id) => known.has(id) && !groupOf.has(id));
    for (const id of ids) groupOf.set(id, ids);
  }

  const canvases: CanvasLayout[] = [];
  const done = new Set<string>();
  for (const s of deck.sections) {
    if (done.has(s.id)) continue;
    const ids = groupOf.get(s.id);
    // Group members in deck order, so the canvas id and scene order follow the deck.
    const members: Section[] = ids ? deck.sections.filter((x) => ids.includes(x.id)) : [s];
    members.forEach((m) => done.add(m.id));

    const rects: Record<string, Rect> = {};
    let i = 0;
    for (const sc of members.flatMap((m) => m.scenes)) {
      let rect: Rect | undefined;
      try {
        rect = sc.module?.place?.({ ...rects });
        // A typo in rects["id"] gives undefined: say so, or the scene silently lands in the next frame.
        if (sc.module?.place && !isRect(rect)) {
          problems.push(`${sc.source}: place() returned no rect {x, y, w, h}; using the next free frame`);
          rect = undefined;
        }
      } catch (e) {
        problems.push(`${sc.source}: place() ${e instanceof Error ? e.message : e}`);
      }
      rects[sc.id] = rect ?? { x: i * stage.w, y: 0, w: stage.w, h: stage.h };
      i++;
    }
    const all = Object.values(rects);
    canvases.push({
      id: members.map((m) => m.id).join("+"),
      sectionIds: members.map((m) => m.id),
      size: {
        w: Math.max(0, ...all.map((r) => r.x + r.w)),
        h: Math.max(0, ...all.map((r) => r.y + r.h)),
      },
      rects,
    });
  }
  return { canvases, problems };
}

export function buildStepList(deck: Deck, canvases: CanvasLayout[]): StepAddr[] {
  const out: StepAddr[] = [];
  for (const s of deck.sections) {
    const canvas = canvases.findIndex((c) => c.sectionIds.includes(s.id));
    for (const sc of s.scenes)
      sc.steps.forEach((_, i) =>
        out.push({ index: out.length, canvas, section: s.id, scene: sc.id, step: i + 1, auto: sc.module?.auto?.[i], ...(s.appendix && { appendix: true as const }) }),
      );
  }
  return out;
}

// The deck a talk plays: with a cut name (?cut=, --cut), only the sections deck.md cuts lists for it, in deck order, and
// every appendix section; the appendix sections always go last. linked: the section of the deep link, reported when the
// cut leaves it out. The canvases come from layoutDeck on the whole deck and keep its rects: a cut moves no scene, so
// place() and a shared canvas see the deck as written.
export function cutDeck(
  deck: Deck,
  name: string | null,
  linked?: string,
  canvases: CanvasLayout[] = [],
): { deck: Deck; canvases: CanvasLayout[]; problems: string[] } {
  const problems: string[] = [];
  const ids = name === null ? undefined : deck.meta.cuts?.[name];
  if (name !== null && !ids)
    problems.push(`cut '${name}': deck.md has no such cut (${Object.keys(deck.meta.cuts ?? {}).join(", ")}); playing the whole deck`);
  const kept = deck.sections.filter((s) => s.appendix || !ids || ids.includes(s.id));
  const has = (id: string) => kept.some((s) => s.id === id);
  if (linked && !has(linked) && deck.sections.some((s) => s.id === linked))
    problems.push(`#/${linked}: the cut '${name}' leaves section '${linked}' out; showing the cut's first step`);
  return {
    deck: { ...deck, sections: [...kept.filter((s) => !s.appendix), ...kept.filter((s) => s.appendix)] },
    canvases: canvases.filter((c) => c.sectionIds.some(has)).map((c) => ({ ...c, sectionIds: c.sectionIds.filter(has) })),
    problems,
  };
}
