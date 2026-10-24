# Contribution: deck helpers from a real training deck

Branch `contrib/deck-helpers`, based on `origin/main` 8ec5809 (0.3.0). Written 2026-10-24 for the klappe maintainer session.

## Where it comes from

A large real deck (a 3-day technical training plus follow-up, ~650 steps over ~70 sections, a corporate theme, an animated avatar) was built on klappe. Every gap it hit was fixed in klappe, not worked around in the deck. This branch carries those fixes, rebased onto 0.3.0. The deck itself is not public; nothing here depends on it.

## What is in it (see CHANGELOG "Unreleased" for the full list)

- New effect `mesh3d`: a self-running 3D dot-and-link mesh with moods (colour + rotation speed), `show` (form, also from a point), `hide`, `mood`, `collapse` to a single pulsing dot, `start: "dot"`, `dot`/`minAlpha` for light frames. It draws only while its canvas is active and its scene is current. Reference page and a catalog scene (340).
- `crt`: `color` (green, amber, teal or any CSS colour), `settle` (power-on without the beam, after a crt transition), typed `prompts` with `prompt(tl, i, { cps })`, `hideCursor`, `cursorAt()`, `dim`, `root`; the `crt` transition takes `transitionOptions.color`.
- Stepper: per-step `auto` advance (also across canvas transitions; never after a deep link, jump or back move; a press during the wait advances exactly once; panels cancel it).
- Deck stylesheet `decks/<id>/deck.css` (fonts and component classes, loaded after the theme).
- `timer`: `until: "HH:MM"` (wall-clock, no T) and `cycle` (one T restarts after "Time's up"); `show(tl, at?)`.
- Element refs: `image().el`, `counter().el/caption`, `icon().el`, `iconTile().el`, `agenda().el/rows`, `chart().bars`; `agenda.move(tl, row)` and `slide: false`; `terminal` `wrap` and `show(tl, at?)`; `bubble` `maxWidth`, `side` (incl. vertical tails), `show(tl, at?)`.
- Video: an offline fallback image (`?offline=1` or no network) and lazy embeds (the iframe loads when its scene becomes current).
- Overview: `overviewLabel` on scenes and sections, and `<section> · <title>` for repeated scene titles (main's overview structure kept).
- Self-test and tests: waits for web fonts and counts late `ctx.problem` calls; the walk scales with deck size (play speed 50, path memo, driver timeout 110 s + 200 ms per step); walks fail on errors the browser logs itself (third-party frames ignored); vitest fs cache off.
- Fixes: `drawOn` keeps a dashed stroke's own dash and never leaves an empty `pathLength`; fade hides the old canvas before the new one shows; chart "Sample data" label uses `--k-warn` inside the plot; `flow.highlight` with an empty list; stage offset rounded to whole pixels; the overview no longer scrolls the stage.

## State

- `npm test`: all green except `tests/unit/cli.test.ts > init refuses the klappe folder reached by another path`, which needs symlink permission (EPERM on the Windows host where this was built; it fails on `main` there too).
- `npm run build` works. The real deck runs green on this branch (its full walk, all three viewports, 0 console errors).
- No version bump: everything is under "Unreleased". All API changes add things, so the next release can be a minor (0.4.0).

## Open points for the maintainer

1. One commit message mentions "storyboard 2.6.1" (the deck's pitch round) as the reason for `timer` `cycle`. Reword if you squash.
2. `effects.md` does not list the new handle fields (`chart.bars`, `image.el`, `counter.el/caption`, `icon/iconTile.el`); they are in the CHANGELOG and the element pages only.
3. The story scene `70-process-training/40-your-turn` got a mesh3d call for the coverage lint; the catalog scene 340 now covers mesh3d, so it can go.
4. The built `dist/*/index.html` still has `<title>klappe</title>`; the deck title is set at runtime.
5. Wanted by the deck, not built: a softer crt power-on flash option; a `mesh3d` colour/brightness option (the deck uses a CSS filter for dark frames); `counter` decimals; `timer` label font/colour tokens, `hide`, and separate T groups; a `dotGrid` helper; `terminal` wrap at "/"; late `ctx.problem` also in the on-screen problems list; lazy embeds one step early.
6. Split as you like: the commits are in feature order with `-x` references to the original branch.
