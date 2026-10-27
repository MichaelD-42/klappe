# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

State on 2026-10-27: branch `release-0.6.0`, rebased onto `origin/release-0.6.0` (PRs #11 to #13), ahead of it and not pushed. `npm test` is green except the flaky review test under Tooling. The demo story rework is done (12 scenes in 5 sections). The Effects polish below is being worked top down, one commit each, test first, with a catalog scene, a reference entry and a CHANGELOG line; the next is `handwrite` several lines (not started). New demo scenes need ids unique across the whole deck (`phases` and `markdown` are taken by the chart catalog).

## Effects

- `handwrite`: one line only. Lines from the list item's source lines, as `reveal` reads them.
- `worldMap`: no region fill. `region(tl, iso)` fills a country in `--k-accent` at `MARKER_MIX`, for "where we sell".
- `figure`: no seated pose, so meeting-room figures read as seated only by the table in front of them.
- `swimlanes`: `walk` to a task with no link moves the token straight and reports nothing; report it as `flow.send` does.
- Small options: `spotlight` `shape: "circle"`; `wipe` `direction: "vertical"`; `loupe` `to(x, y, { zoom })` per stop; `shape` and `arrow` `dash` and `width`; `pulse` `color` token.

## New effects

- Device frame: a screenshot in a browser window or a phone, for product decks. Pairs with `pointer`, `loupe` and `spotlight`; today each deck draws its own frame.
- Process steps: a row of numbered chevrons with the current one lit, the "step 2 of 5" bar of process trainings. Check first whether it is a `flow` layout or an `agenda` mode.
- `chart` type `radar`: a few dimensions round a circle, one or two series, for skill and option profiles.
- Mind map: a centre topic and branches that grow out one per step. A radial layout; check whether `decisionTree`'s layout bends to it.
- Fishbone (Ishikawa): an effect line with cause bones that build one per step, for root-cause training. Fits beside `cycle` and `vModel`.
- `chart` type `heatmap`: a grid of cells shaded by value (day by hour, team by month), with one row or cell lit per step.
- `chart` type `treemap`: shares of a whole that has more than six parts or two levels, past what `donut` holds.
- Kanban board: cards that move across To do, Doing and Done per step, with a WIP limit that turns `--k-warn`. Check first whether it is a `stickyNotes` mode (groups as columns).
- Org chart: people boxes with a portrait and a role, top-down. Check first whether `decisionTree` with an image per node does it.
- Formula: a typeset equation that builds term by term, for technical trainings. Needs KaTeX or MathJax, a new dependency: a user decision.

## Tooling

- `tests/e2e/review.e2e.test.ts` fails under a full `npm test` run (seen 2026-10-26 and 2026-10-27: "stepping in either window moves both…" expected 'Say it shorter.', and "a field focused before a step…") and passes alone every time. A wait on a save or a window sync is timed, not awaited; find it and wait on the condition.
- `klappe test` writes `data/TODO.md` and `media/TODO.md`, which the `@deck/**/*.md` glob in `src/deck/load.ts` takes in, so a `klappe test` run reloads an open deck. Leave them out of the glob, as `review.md` is.
