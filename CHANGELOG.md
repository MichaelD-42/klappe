# Changelog

klappe follows [semantic versioning](https://semver.org). Until 1.0.0 the deck format, the `scene.ts` API and the CLI may still change in a minor version; every such change is listed here under **Changed**. 1.0.0 comes with the deck template (M4).

## Unreleased

### Added

- `?reducedmotion=0`: full motion even when the system asks for reduced motion; README section on presenting.
- `klappe --version`.
- `ctx.doc` (the scene's parsed `scene.md`) and `ctx.deck` (`lang`, `intensity`) for `scene.ts` code. The demo scenes read their titles, shout-outs and agenda rows from `ctx.doc` instead of copies.
- A `bin` entry in `package.json`.
- `spotlight`: dims the scene but for a hole around a target; the next step moves the hole or lifts the dim.
- Full-screen video: `video()` with no `rect` fills the scene frame, cropped to cover, with no border or caption.
- Animated backgrounds: a `.mp4` or `.webm` `href` in `background` plays muted in a loop; `animate: "aurora"` draws a slow drift in the theme's colours with no file. Only the background on screen moves; reduced motion and the self-test keep them still.
- `icon()`, `iconTile()` and flow nodes take a Lucide icon itself as well as a name: `import { Rocket } from "klappe/fx/lucide"`.
- `worldMap` handle: `point(id)`, `arcPath(from, to)`, and an `at` position on `arc()`. `figure()`: a `strokeWidth` option and an `at` position on `appear()`.

### Changed

- Reduced motion also turns the `zoom`, `crt` and `shatter` transitions into a fade.
- The Ken Burns push starts when the picture's fade-in ends, so the step lasts the fade plus 6 s.
- `klappe:sync` replaces each `klappe*` agent and skill, so files that left klappe leave the deck repo too.
- Several notes on one step are all kept, in order; a note indented under a list item belongs to that item; a blank `>` line starts a new paragraph.
- A step that starts with `"<"` or `"-="`, and a `place()` that returns no rect, are deck problems.
- A `shared-canvas` list that mixes ids and groups is a deck problem instead of being flattened.
- The demo: the charts leave the story; the catalog keeps them.
- The single-file build is dropped (see DECISIONS).
- A timeline chart reads its start and end columns by name (`start`/`from`/`begin`, `end`/`to`/`until`) when they are named, else the first two number columns as before.
- Only the Lucide icons a deck names are bundled (the demo's JS drops from 1.19 MB to 0.77 MB). A name is found when it stands in the deck's code as a string literal; a name built at run time reports `icon: unknown Lucide name` and needs the icon itself.
- The engine loads Markdown-part effects, Shiki, the `zoom`/`shatter`/`crt` transitions, the self-test and the test fixtures only when a deck needs them. A Markdown-only deck loads 218 KB of JS at start instead of 674 KB. `code()` in a `scene.ts` needs `code` imported by name from `"klappe/fx"`, so the build sees it.
- A shout-out is three steps: enter, fade, answer. `enter` grows the question straight to its full size (1.04 calm, 1.12 bold); the `hold` step and `ShoutHandle.hold` are gone. A `scene.ts` that plays a shout drops its `hold` step, and a `### Question?` in `scene.md` makes three steps.
- `shout()` takes the deck's intensity when `intensity` is left out. Effect words and counter numbers follow the deck's `lang`.

### Fixed

- The zoom transition no longer pulls the old canvas back just before the target.
- A window with no size at load no longer breaks callouts ("has no size to measure").
- An open overview or section list closes when the speaker view, history or autoplay moves the stage.
- Router: overlapping back presses, a failed navigation, a stale hash after back.
- Autoplay started mid-play holds from the end of the play; a failing step stops it with an error.
- The speaker channel is keyed by the deck's path too, so two decks with one title stay apart.
- The speaker view's timer button is disabled on a scene without a timer, where it did nothing.
- Frontmatter: commas inside quoted list items.
- CLI: `--deck` followed by a flag; the `init` guard on Windows; `init` says when it moves klappe to `dependencies`.
- Self-test: text in a scaled group is checked at its real size; an empty result names its cause.
- `lineArt` strips animations, images and links to other files, catches `javascript:` hidden by whitespace, and leaves shapes in `defs`, `clipPath` and `mask` alone.
- `drawOn` returns where its draw starts; `icon()` no longer guesses it.
- Video: `youtube-nocookie.com` (kept privacy-enhanced) and `music.youtube.com` links play; a video host link with no video id shows VIDEO MISSING and a deck problem instead of a broken box.
- Design lint: named code fonts, `font: italic` and `oblique`, pills beyond buttons, protocol-relative URLs.

## 0.3.0 (2026-10-24)

M3: themes as CSS token files, the training elements (code, terminal, callout, flow, sequence, swimlanes, decision tree, checklist, agenda, timer), the reference docs and the `klappe` agent skill, one demo deck with a catalog of every effect, the overview as a row per section, and CI with a GitHub Pages deploy.

## 0.2.0 (2026-10-20)

M2: the effects (charts, world map, figures, line art, icons, full-frame pictures and video, shatter, shout-out, swarm, CRT, morph, bubbles, counters) and the zoom, shatter and CRT transitions.

## 0.1.0 (2026-10-16)

M0 and M1: the engine core. Decks as Markdown folders, one GSAP timeline per canvas with seekable steps, the camera, deep links, the overview, section list, speaker view, autoplay, the self-test and the CLI (`dev`, `build`, `test`, `init`).
