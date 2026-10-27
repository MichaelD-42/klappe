import { assembleDeck } from "../assemble";
import { agenda, type AgendaHandle, type AgendaRow } from "klappe/fx";
import type { SceneModule } from "../../types";

// show with the marker on a middle row, on the first row, with no marker, an unknown current row, long titles, too many rows, a marker that moves down two rows and back to the first,
// a marker that shows in place on the middle row (slide: false), then moves on, rows with icons, and an unknown icon.
const rect = { x: 160, y: 200, w: 1500, h: 600 };
const row = (from: string, to: string, title: string, current = false) => ({ from, to, title, current });
const rows = [row("09:00", "09:45", "Basics"), row("09:45", "10:30", "Practice"), row("10:30", "11:00", "Wrap-up")];
const long = [row("09:00", "10:30", "A title long enough that it has to wrap onto a second line of the agenda, then some more words"), row("10:30", "11:00", "Wrap-up")];
const many = Array.from({ length: 24 }, (_, i) => row(`${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`, "00:00", `Talk ${i + 1}`));
const md = (title: string) => `## ${title}\n\n- Step 1.\n`;

const one = (rs: AgendaRow[], extra: { current?: string } = {}): SceneModule => ({
  build: (ctx) => ({ a: agenda(ctx, { rows: rs, ...rect, ...extra }) }),
  steps: [(tl, r: { a: AgendaHandle }) => r.a.show(tl)],
});

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Agenda\n",
      "sections/10-a/10-middle/scene.md": "## Middle\n\n- 09:00–09:45 Basics\n- 09:45–10:30 Practice ←\n- 10:30–11:00 Wrap-up\n",
      "sections/10-a/20-first/scene.md": "## First\n\n- 09:00–09:45 Basics ←\n- 09:45–10:30 Practice\n",
      "sections/10-a/30-none/scene.md": "## None\n\n- 09:00–09:45 Basics\n- 09:45–10:30 Practice\n",
      "sections/10-a/40-unknown/scene.md": md("Unknown"),
      "sections/10-a/50-long/scene.md": md("Long titles"),
      "sections/10-a/60-many/scene.md": md("Too many"),
      "sections/10-a/70-move/scene.md": "## Move\n\n- Show.\n- Down to Wrap-up.\n- Back to Basics.\n",
      "sections/10-a/80-hop/scene.md": "## Hop\n\n- Show on Practice.\n- On to Wrap-up.\n",
      "sections/10-a/90-icons/scene.md": md("Icons"),
      "sections/10-a/95-bad-icon/scene.md": md("Unknown icon"),
    },
    {
      "sections/10-a/40-unknown/scene.ts": one(rows, { current: "Nope" }),
      "sections/10-a/50-long/scene.ts": one([{ ...long[0], current: true }, long[1]]),
      "sections/10-a/60-many/scene.ts": one(many),
      "sections/10-a/70-move/scene.ts": {
        build: (ctx) => ({ a: agenda(ctx, { rows: [{ ...rows[0], current: true }, rows[1], rows[2]], ...rect }) }),
        steps: [(tl, r: { a: AgendaHandle }) => r.a.show(tl), (tl, r: { a: AgendaHandle }) => r.a.move(tl, 2), (tl, r: { a: AgendaHandle }) => r.a.move(tl, 0)],
      } satisfies SceneModule,
      "sections/10-a/80-hop/scene.ts": {
        build: (ctx) => ({ a: agenda(ctx, { rows: [rows[0], { ...rows[1], current: true }, rows[2]], ...rect, slide: false }) }),
        steps: [(tl, r: { a: AgendaHandle }) => r.a.show(tl), (tl, r: { a: AgendaHandle }) => r.a.move(tl, 2)],
      } satisfies SceneModule,
      "sections/10-a/90-icons/scene.ts": one([{ ...rows[0], icon: "pencil" }, { ...rows[1], icon: "coffee", current: true }, { ...rows[2], icon: "utensils" }, row("13:00", "14:00", "No icon")]),
      "sections/10-a/95-bad-icon/scene.ts": one([{ ...rows[0], icon: "no-such-icon" }]),
    },
  );
