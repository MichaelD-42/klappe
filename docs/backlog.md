# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

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
