# klappe

Animated presentations as code: a deck folder of Markdown and TypeScript, played on one GSAP timeline per canvas. Read [docs/architecture.md](docs/architecture.md) before engine work and [docs/glossary.md](docs/glossary.md) for the terms. Deck authoring rules are in the `klappe` skill (`.claude/skills/klappe/`), not here.

## Where things are

- `src/`: the engine; `src/fx/` is everything `klappe/fx` exports. `bin/`: the CLI and its Node helpers.
- `decks/demo/`: the story, then the catalog (sections from `100-catalog` on). Agents copy catalog scenes, so the demo follows every rule it teaches.
- `docs/reference/`: the author docs. `docs/backlog.md`: open work, ranked. `DECISIONS.md`: why things are as they are. `CHANGELOG.md`: what changed, under the open version at the top.

## Commands

- `npx tsc --noEmit`, then `npm test` (unit and lint, then e2e in Playwright's Chromium), as CI does.
- `npx vitest run --project unit` for the fast part; `npx vitest run tests/e2e/<file>` for one e2e file; `node bin/klappe.mjs test --deck demo --only <section>/<scene>` walks one demo scene.
- `npm run dev`, `npm run shot -- <section>[/<scene>[/<step>]]`, `npm run outline`, `npm run pdf`: all on the demo deck.

## Rules this repo holds

- Seek must equal play (the timeline rule, [motion](docs/reference/motion.md)). `?selftest=walk` checks it; a change that breaks the walk is wrong, not the walk.
- Test first. A backlog defect whose test already passes was stale: drop the entry.
- A new `klappe/fx` export needs, or a lint fails: a heading in `docs/reference/`, a call in the demo catalog (or a place in `tests/lint/fx-internal.ts` if authors never call it), and a row in the skill's "Choose the element by intent" table. A new `--k-*` token needs a line in `docs/reference/themes.md`.
- Effects take colours only from `--k-*` tokens; the design lint (`tests/lint/design.test.ts`) lists the look rules.
- Every user-visible change gets a CHANGELOG line; a choice someone will later question gets a DECISIONS entry.
- Look at what you changed: `npm run shot` and read the PNGs. `shot` runs with reduced motion, where camera flights are cuts, so a step timed against a flight's end shows up there.
- e2e tests assert properties, never where text wraps: a deck theme can name a font CI lacks.
