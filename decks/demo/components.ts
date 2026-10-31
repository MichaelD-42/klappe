import type { Components, Ctx, SceneModule, StepAdder } from "klappe/types";
import { captioned } from "./caption";
import { planChip } from "./shared/plan-chip";
import { speakerProfile } from "./shared/speaker-profile";

// The demo's own Markdown fences: a scene.md with ```speakerProfile or ```planChip needs no scene.ts.
// The fence body is "key: value" lines; a picture is written as in Markdown, ![alt](media/x.png).
const fields = (body: string) => body.split("\n").flatMap((l) => {
  const m = /^(\w+):\s*(.+)$/.exec(l.trim());
  return m ? [[m[1], m[2]] as const] : [];
});
const picture = (v = "") => {
  const m = /^!\[([^\]]*)\]\((\S+)\)$/.exec(v);
  return m ? { alt: m[1], href: m[2] } : undefined;
};
// A scene factory's module, built here; its steps play on scene.md's.
const run = (m: SceneModule, ctx: Ctx): StepAdder[] => {
  const refs = m.build!(ctx);
  return m.steps!.map((f) => (tl) => f?.(tl, refs, ctx));
};

export default {
  // The words come from scene.md as for the factory: the role line, the CV, the statements, the contact label.
  speakerProfile: (ctx, body) => {
    const f = fields(body);
    const get = (k: string) => f.find(([key]) => key === k)?.[1];
    return run(speakerProfile({
      photos: f.filter(([k]) => k === "photo").flatMap(([, v]) => picture(v) ?? []),
      logo: picture(get("logo")),
      linkedin: get("linkedin"),
      email: get("email"),
      web: get("web"),
      statements: ctx.doc!.steps.length - 3,
    }), ctx);
  },
  planChip: (ctx, body) => {
    const n = Object.fromEntries(fields(body).map(([k, v]) => [k, Number(v)]));
    return run(captioned("A planChip fence in scene.md: the deck's components.ts draws it, with no scene.ts", {
      build: (c) => planChip(c, n.x ?? 160, n.y ?? 200, n.size ?? 48),
      steps: [(tl, chip: HTMLElement) => tl.to(chip, { autoAlpha: 1, duration: 0.6 })],
    }), ctx);
  },
} satisfies Components;
