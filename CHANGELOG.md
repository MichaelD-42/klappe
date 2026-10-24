# Changelog

klappe follows [semantic versioning](https://semver.org). Until 1.0.0 the deck format, the `scene.ts` API and the CLI may still change in a minor version; every such change is listed here under **Changed**. 1.0.0 comes with the deck template (M4).

## Unreleased

### Added

- `matrix`: a 2×2 with axis titles and quadrant names; `place(id, quadrant)` puts an item in a quadrant, and placing it again moves it there, in the accent colour for its step.
- `flipCard`: a card turns over in 3D to show its back (a question, then the answer; a myth, then the fact). Each `flip` turns it again; with reduced motion, and so in the PDF export, the sides crossfade.
- `annotate` kind `highlight`: a marker band with leaning ends sweeps in behind a phrase, one per line when it wraps, in a translucent `--k-accent` so the text stays readable.
- `glow`, `pulse` and `shake`: one-step nudges on any element. A glow behind it (on, a slow breathe for "live", off), a ring that pulses out once, a two-cycle shake for "this failed". `lineArt().glow` now uses the shared glow, a blurred copy of the part instead of a tweened `drop-shadow`.
- `figure`, `timer` and `checklist` handles expose `el`; a `worldMap` site's `label` is optional (no label, no text).
- `scrimSide` on `image()`, `wipe()` and backgrounds: the scrim covers one side only, so the rest of the picture keeps its light.
- `ctx.onStep` events carry `next`, the scene of the following step.
- `crt` and the `crt` transition: `flash: "soft"`, a gentler power-on that keeps the phosphor colour instead of flashing near white.
- `mesh3d`: `brightness` lightens or darkens the mood colours, for a dark frame, without a CSS filter.
- `timer`: `hide(tl, at?)` fades it out and stops it; the label carries `data-k-timer-label` for a deck's `deck.css`.
- `terminal` `wrap` also breaks after a `/`, so a long path splits between its parts; `wrapBreaks` is the helper.
- `counter`: `decimals`, how many places it shows while it counts.
- Five built-in themes: `sorbet` (dark pastel), `lavender` (light pastel), `daylight` (light, crisp), `forest` (dark green and gold) and `ink` (black and lime). Each passes the contrast floors and a colour-blind check of its chart series.
- `--k-scrim`: the colour a picture's `scrim` lays over it; white in a light theme, so dark text stays readable over a picture.
- Bundled fonts (SIL OFL, from npm, offline): Inter in calm, Space Grotesk in bold, JetBrains Mono for code and terminal in both. They load before the deck renders, so text measures the same on every machine and in the PDF. Digits are fixed-width on the stage; code has no ligatures.
- `klappe pdf` (`npm run pdf`): the deck as `dist/<id>.pdf`, one 1920x1080 page per step, each step as it ends, with no UI on top. Deck problems are listed but do not stop it; a page error fails it.
- `?reducedmotion=0`: full motion even when the system asks for reduced motion; README section on presenting.
- `klappe --version`.
- `ctx.doc` (the scene's parsed `scene.md`) and `ctx.deck` (`lang`, `intensity`) for `scene.ts` code. The demo scenes read their titles, shout-outs and agenda rows from `ctx.doc` instead of copies.
- A `bin` entry in `package.json`.
- Board numbers: `kpi` (a tile with the change against last period, coloured by which way is good, and a sparkline), `waffle` (a share as 100 cells) and `progress` (a ring to a target).
- `barRace`: ranked bars that reorder period by period, one step per period, on a fixed value axis.
- Charts: `type: "donut"` (parts of a whole, up to 6, the total in the centre) and `type: "slope"` (before and after, one line per group).
- `qr`: a QR code the room can scan, dark on light with a quiet zone.
- `scramble`: a line that decodes, random glyphs settling on the text left to right.
- `wipe`: before and after, two pictures on one spot; the after picture sweeps in behind a divider, halfway or all the way.
- `annotate`: a hand-drawn ring, underline, frame, strike-through or arrow on a target, drawn on in the accent colour.
- `spotlight`: dims the scene but for a hole around a target; the next step moves the hole or lifts the dim.
- Full-screen video: `video()` with no `rect` fills the scene frame, cropped to cover, with no border or caption.
- `parallax: true` on a background: it drifts a little with each camera flight, as a far layer does.
- Animated backgrounds from an `.svg` file that animates itself (inlined, sanitised, in a shadow root; it can use the theme tokens), and from a function the deck writes: `animate: (el) => ({ play, pause })`.
- Animated backgrounds: a `.mp4` or `.webm` `href` in `background` plays muted in a loop; `animate: "aurora"` draws a slow drift in the theme's colours with no file. Only the background on screen moves; reduced motion and the self-test keep them still.
- `icon()`, `iconTile()` and flow nodes take a Lucide icon itself as well as a name: `import { Rocket } from "klappe/fx/lucide"`.
- `worldMap` handle: `point(id)`, `arcPath(from, to)`, and an `at` position on `arc()`. `figure()`: a `strokeWidth` option and an `at` position on `appear()`.
- `mesh3d`: a 3D dot mesh that turns by itself, with moods (`calm`, `curious`, `careful`, `insight`, `celebrating`), `collapse`, `start: "dot"`, and `dot` and `minAlpha` for a white frame. Reference page and catalog section `340-mesh3d`.
- `crt`: a `color` option (`green`, `amber`, `teal` or any CSS colour), `settle(tl)`, `prompts` typed with `prompt(tl, i)`, `cursorAt()`, `dim(tl, { to, at })`, and the handle's `root`. The `crt` transition takes the same `color` in `transitionOptions`. Catalog scene `180-crt/20-teal-prompt`.
- `bubble`: `side` (vertical tails) and `maxWidth`; `show(tl, at?)` takes a position.
- `timer`: `until: "HH:MM"` counts to a wall-clock time today; `cycle` restarts the timer with one T after Time's up; `show(tl, at?)` takes a position. Catalog scene `320-timer/30-until`.
- `SceneModule.auto`: per-step auto advance after N seconds.
- `SceneModule.overviewLabel` and `SectionModule.overviewLabel`; a scene title that repeats in the deck shows as `<section> · <title>` in the overview.
- An optional `decks/<id>/deck.css` (fonts and component classes), loaded after the theme.
- Video: an image in the same list item is the offline fallback; `?offline=1` forces it. YouTube and Vimeo players load one step before their scene, so they are ready when it shows.
- `agenda`: `move(tl, toRow, at)` slides the marker and the colours to another row; `slide: false`; the handle has `el` and `rows`.
- `terminal`: a `wrap` option for long lines; `show(tl, at?)`.
- Handles expose their elements: `iconTile` and `icon` (`el`), `counter` (`el`, `caption`), `image` (`el`), `chart` (`bars`, the bar rects in data order).

### Changed

- Overview cards show each scene's background, and the section list marks the current section with a tint and bold text and opens scrolled to it.
- Speaker view: the current step is the largest text, notes are larger, type scales with the window, an "N / M" shows the place, the next step is a 2-line preview, and the Notes heading hides when there are none.
- A scene's title fades in over the camera's last 0.4 s instead of after it lands, so the frame is not empty for 0.6 s and the step's content follows sooner.
- Charts draw rising slope lines and waterfall increases in `--k-ok`, and the Sample data label and DATA MISSING box in `--k-warn`; `lineArt` glow turns `--k-warn`. They used the CRT's `--k-phosphor` tokens, which are too pale on a light theme. In calm, `--k-warn` is the same amber; `--k-ok` is a deeper green.
- The calm and bold themes use the bundled fonts instead of the system font: text widths, and so wrapping, change a little.
- Shiki loads only the grammars a deck uses: the languages of its code fences, and the `lang` values its `scene.ts` code passes to `code()`. Write `lang` as a string literal: a computed one shows plain and reports a deck problem. The demo fetches one grammar instead of nine (about 600 KB).
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
- The `fade` transition fades the old canvas out before the new one fades in (0.4 s in all), so two titles at the same spot do not overlap.
- The built page's title is the deck title.
- The self-test walk plays at 50x, and the test driver waits 110 s plus 200 ms per step, so a big deck's walk fits.
- The chart's "Sample data" label uses `--k-warn` and ends inside the chart rect.
- Self-running helpers (`mesh3d`) draw only while their canvas is the active one and their scene is the current scene.

### Fixed

- `morph`: the old shape ends inside the new one and the new one starts inside the old, so text no longer spills over its card mid-way; the new shape fades in before the old one fades out, so the middle frame is not two half-transparent shapes.
- `shatter`: the black gaps between the shards fade as they start to fall, so they fall over the scene instead of over a black box (and its edge no longer shows as a strip).
- A `ctx.problem` call made after load (a helper measuring text once its font is in, or during a play) shows in the on-screen problems list, not only in the self-test.
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
- `drawOn` ends a dashed stroke on its own dash and `pathLength` instead of a solid line.
- The stage offset is rounded to whole pixels: no 1 px sliver at the edge.
- `flow` highlight with an empty `on` or `off` list, and a terminal command without output, no longer log a GSAP warning.
- The self-test waits for web fonts and counts `ctx.problem` calls made before it ends.
- A panel (overview, section list) cancels a pending `auto` advance.
- Vitest runs without its fs module cache, which kept a stale fixture list.
- `drawOn` never leaves an empty `pathLength` (GSAP wrote back an unrecorded attribute on revert).
- The overview no longer scrolls the stage; a band no longer shows after it closes.
- Self-test walks fail on errors the browser logs itself (not via `console.error`), except messages from third-party frames.

## 0.3.0 (2026-10-24)

M3: themes as CSS token files, the training elements (code, terminal, callout, flow, sequence, swimlanes, decision tree, checklist, agenda, timer), the reference docs and the `klappe` agent skill, one demo deck with a catalog of every effect, the overview as a row per section, and CI with a GitHub Pages deploy.

## 0.2.0 (2026-10-20)

M2: the effects (charts, world map, figures, line art, icons, full-frame pictures and video, shatter, shout-out, swarm, CRT, morph, bubbles, counters) and the zoom, shatter and CRT transitions.

## 0.1.0 (2026-10-16)

M0 and M1: the engine core. Decks as Markdown folders, one GSAP timeline per canvas with seekable steps, the camera, deep links, the overview, section list, speaker view, autoplay, the self-test and the CLI (`dev`, `build`, `test`, `init`).
