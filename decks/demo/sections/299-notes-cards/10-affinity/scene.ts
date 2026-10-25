import { stickyNotes, type StickyNotesHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("stickyNotes(ctx, { notes, groups, … }) — show(ids?), then group(groupId, ids)", {
  build: (ctx) => ({
    n: stickyNotes(ctx, {
      x: 160, y: 120, w: 1600, h: 800,
      notes: [
        { id: "setup", text: "Setup took a day" },
        { id: "search", text: "Search is fast" },
        { id: "examples", text: "More examples, please" },
        { id: "cli", text: "Love the CLI" },
        { id: "access", text: "Waited a week for access" },
        { id: "outdated", text: "Docs are out of date" },
        { id: "team", text: "Helpful team" },
        { id: "onboard", text: "No onboarding guide" },
        { id: "find", text: "Hard to find the API page" },
      ],
      groups: [
        { id: "start", label: "Getting started" },
        { id: "docs", label: "Docs" },
        { id: "like", label: "What we like" },
      ],
    }),
  }),
  steps: [
    (tl, r: { n: StickyNotesHandle }) => r.n.show()(tl),
    (tl, r) => r.n.group("start", ["setup", "access", "onboard"])(tl),
    (tl, r) => r.n.group("docs", ["examples", "outdated", "find"])(tl),
    (tl, r) => r.n.group("like", ["search", "cli", "team"])(tl),
  ],
});
