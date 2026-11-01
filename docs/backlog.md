# Backlog

Open work only, ranked, most important first. All of it is in scope for 1.0.0, which is the last entry; the first entries change the deck format, the API or the look, so they come before anything builds on them. CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

- Named layouts on non-landscape frames: `thirds`, `full-bleed` and `big-number` assume a landscape frame with hard-coded 160 and 140 padding; derive it from the frame, or report a deck problem on a portrait one.
- Video export scene filter: `klappe video --only <section>[/<scene>]`, as `test` has.
- Shape-token lint by use, not by file: the allow list exempts whole files, and `setAttribute("stroke-width")` is not linted.
- Agent instructions say `npm test -- --only <section>/<scene>`, which fails in the klappe repo (`npm test` is plain `vitest run`); `node bin/klappe.mjs test --only …` works. Make the agent files (`.claude/agents/klappe-builder.md`, `klappe-review-tech.md`, `klappe-review-look.md`) give a command that works in both the klappe repo and deck repos.
- Release 1.0.0 once every entry above is done: the deck format, the `scene.ts` API and the CLI are then stable.
