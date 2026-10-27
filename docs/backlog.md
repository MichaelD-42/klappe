# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

State on 2026-10-27: branch `release-0.6.0`, rebased onto `origin/release-0.6.0` (PRs #11 to #13), pushed. `npm test` is green. The demo story is two sections, 5 scenes (opening and value stream). The Effects polish list is done. Next: New effects, top down. New demo scenes need ids unique across the whole deck (`phases` and `markdown` are taken by the chart catalog).

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

- Story scene ids are named in many places: the acceptance checks in `src/selftest.ts`, unit tests (`router`, `scene`), `docs/reference` and the demo's own docs, so moving a story scene means a repo-wide search. Keep one list of the story scenes the checks depend on, and have a lint fail when a named id is gone.
- A new effect option touches eight files: fixture, e2e test, source, catalog `scene.md` and `scene.ts`, reference row, the skill's intent table, CHANGELOG. A script that scaffolds the catalog scene and the doc rows would cut most of it; one shared fixture for small options (as `fx-options`) saves a file per option.
- Scene ids collide late, and a scene's `data-scene` sits on both its SVG group and its HTML box, so `document.querySelector('[data-scene=…]')` finds the SVG one. A command that lists taken ids, and a test helper that finds a scene's elements in both layers, would catch both up front.
