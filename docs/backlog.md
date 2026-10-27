# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Demo deck

- Rework the story before the gallery (`10-opening` to `70-process-training`: 6 sections, 20 scenes). It is too long and shows one effect per scene. Make it shorter, with fewer sections that each combine several effects in one scene, so it reads as a talk, not a list. Leave charts out of it: the gallery shows them from `110-chart` on. Keep every rule the catalog teaches, and check the acceptance tests and deep links that name story scenes before you move them.

## Effects

- `annotate`: no `bracket` (a curly brace beside a run of lines) and no `cross` (an X over a box), and the colour is fixed to `--k-accent`; a `color` token (`--k-bad` for a cross) would cover "wrong".
- `checklist`: done or not only. `fail(i)`: a cross in `--k-bad`, for a pre-mortem or an audit.
- `pyramid`: once built, a layer cannot be lit again. `light(id)` for "we are weak here", and `shape: "inverted"` for a funnel-shaped stack.
- `stickyNotes`: dot voting. `vote(id, n)` drops `n` dots on a note, so a workshop deck can show the result of a vote after the affinity map.
- `sequence`: no activation bars, notes or `alt`/`loop` frames, the three things readers expect after arrows.
- `semanticZoom`: no lines between boxes; the reference says to draw them with `arrow`. `links: [{ from, to }]` per level, shown with the level.
- `gitGraph`: no tags, cherry-pick or squash. Tags and cherry-pick are the two that come up in a git training.
- `matrix`: quadrants only. `place(id, { x, y })` with 0 to 1 positions, for a scored effort and impact map rather than a sorted one.
- `pointer`: no drag. `drag(from, to)` for moving a card, a slider or a file, the most common UI action after click and type.
- `image`: no credit line. `credit: "Photo: …"`, small in a corner over the scrim, since stock and press photos need it.
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
