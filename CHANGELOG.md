# Changelog

klappe follows [semantic versioning](https://semver.org). Until 1.0.0 the deck format, the `scene.ts` API and the CLI may still change in a minor version; every such change is listed here under **Changed**. 1.0.0 comes with the deck template (M4).

## Unreleased

### Added

- `?reducedmotion=0`: full motion even when the system asks for reduced motion; README section on presenting.
- `klappe --version`.
- A `bin` entry in `package.json`.

### Changed

- Reduced motion also turns the `zoom`, `crt` and `shatter` transitions into a fade.
- The Ken Burns push starts when the picture's fade-in ends, so the step lasts the fade plus 6 s.
- `klappe:sync` replaces each `klappe*` agent and skill, so files that left klappe leave the deck repo too.
- Several notes on one step are all kept, in order; a note indented under a list item belongs to that item; a blank `>` line starts a new paragraph.
- A step that starts with `"<"` or `"-="`, and a `place()` that returns no rect, are deck problems.
- A `shared-canvas` list that mixes ids and groups is a deck problem instead of being flattened.
- The demo: the charts leave the story; the catalog keeps them.
- The single-file build is dropped (see DECISIONS).

### Fixed

- The zoom transition no longer pulls the old canvas back just before the target.
- A window with no size at load no longer breaks callouts ("has no size to measure").
- An open overview or section list closes when the speaker view, history or autoplay moves the stage.
- Router: overlapping back presses, a failed navigation, a stale hash after back.
- Autoplay started mid-play holds from the end of the play; a failing step stops it with an error.
- The speaker channel is keyed by the deck's path too, so two decks with one title stay apart.
- Frontmatter: commas inside quoted list items.
- CLI: `--deck` followed by a flag; the `init` guard on Windows; `init` says when it moves klappe to `dependencies`.
- Self-test: text in a scaled group is checked at its real size; an empty result names its cause.
- Design lint: named code fonts, `font: italic` and `oblique`, pills beyond buttons, protocol-relative URLs.

## 0.3.0 (2026-10-24)

M3: themes as CSS token files, the training elements (code, terminal, callout, flow, sequence, swimlanes, decision tree, checklist, agenda, timer), the reference docs and the `klappe` agent skill, one demo deck with a catalog of every effect, the overview as a row per section, and CI with a GitHub Pages deploy.

## 0.2.0 (2026-10-20)

M2: the effects (charts, world map, figures, line art, icons, full-frame pictures and video, shatter, shout-out, swarm, CRT, morph, bubbles, counters) and the zoom, shatter and CRT transitions.

## 0.1.0 (2026-10-16)

M0 and M1: the engine core. Decks as Markdown folders, one GSAP timeline per canvas with seekable steps, the camera, deep links, the overview, section list, speaker view, autoplay, the self-test and the CLI (`dev`, `build`, `test`, `init`).
