# Changelog

klappe follows [semantic versioning](https://semver.org). Until 1.0.0 the deck format, the `scene.ts` API and the CLI may still change in a minor version; every such change is listed here under **Changed**. 1.0.0 comes with the deck template (M4).

## Unreleased

### Added

- `wordCloud`: words from a `data/` file, sized by weight and placed without overlap on a spiral, heaviest in `--k-accent`; `show(0, 3)` then `show(3)` brings in the top words, then the rest. The layout uses estimated word boxes, not measured ones, so it is the same on every machine and in CI. `reveal` reads `**bold**` words as key words: as each one rises it grows and takes `--k-accent`.
- `redline` and `splitFlap`. `redline(ctx, { before, after, x, y })` shows prose changes word by word, the text cousin of `code().diff()`: `apply` strikes the deleted words in `--k-bad` and fades the new ones in on a `--k-ok` tint, and `clean` leaves the plain new text. `splitFlap(ctx, { x, y, cells, text })` is an airport board: each `to(text)` flips the cells through the drum to a new word or number, left to right. Reduced motion: the redline fades its marks in place, and the board cuts to the new text.
- `chat`: a messenger thread, one message per step. The user's messages land whole on the right; anyone else's show typing dots, then stream in as a pure function of progress, so a seek shows the same text as play. Old messages scroll out whole when the thread fills; `chatMessage("Ana: Hi")` turns a `scene.md` list item into a message. Reduced motion: no dots, messages fade in whole. `--k-font-heading` sets the scene title font (every theme defaults it to `--k-font`). The `typed` reference shows a typewriter in the deck font: `typed()` written into a `text()` box.
- `loupe`: a magnifying lens slides over a picture and enlarges one detail per step (`show`, `to(x, y)`); with reduced motion it cuts.
- `glitch`, `cube` and `pageTurn` transitions for `section.ts`. `glitch` is a 0.5 s digital break-up for the bold theme: seeded bands jump sideways with a colour split in the two accents. `cube` turns the old section away as one face of a cube. `pageTurn` peels the old section off like a page from its corner. All three load only when a deck asks for them, and play a fade under reduced motion.
- `follow(ctx, travel(…), { zoom })`: the camera closes in on a travelling element and keeps it centred until it lands. `impactShake(ctx)`: a short damped jolt of the whole scene when something lands. `ctx.camera.follow` is the engine move under it.
- `push` and `iris` section transitions. `push`: the new section pushes the old one off the frame, `transitionOptions: { direction }` (`left`, the default, `right`, `up` or `down`); reduced motion plays a fade. `iris`: a circle opens the new section from a point, `transitionOptions: { origin: [x, y] }` in frame pixels (default the centre). Both play the new section's first step as it comes in.
- `handwrite`: a short phrase that writes itself in Caveat, glyph by glyph, with a clip wipe (`@fontsource/caveat`, OFL-1.1, loaded only when a deck uses it).
- Scene reuse: a factory in `decks/<id>/shared/` returns a `SceneModule`, so each scene that shares it is two lines, `export default checkpoint({ ... })`. See deck-format.md, "Reuse a scene with options".
- `venn`: two or three circles with names; `light(...ids)` lights the region in exactly those sets with a translucent `--k-accent` fill, clipped exactly. The region before it settles as it lights, and region labels stay once shown. With reduced motion the circles fade in instead of drawing on.
- `pyramid`: a test pyramid or capability stack (`shape: "stack"`); `next()` builds the next layer up with its label inside, in the accent colour until the next layer builds. With reduced motion a layer fades in instead of growing.
- `compareTable`: a feature matrix whose rows build one per step; ticks in `--k-ok` and crosses in `--k-bad` land cell by cell, and the newest row's label is lit in `--k-accent` until the next row. `exerciseCard`: a task card with a title, time box and group (with icons), numbered tasks, and optional items that `extra(i)` reveals one per step. Both shrink to a 20 px floor to fit. Reduced motion: marks and items fade without the pop or rise.
- `stickyNotes` and `cardStack`: workshop notes that appear scattered and tilted, then fly into labelled group columns one `group(groupId, ids)` per step (an affinity map), in paper colours mixed from the series tokens; and a fanned hand of cards where `pull(i)` lifts and enlarges one while the rest dim behind it, and `back` returns it. With reduced motion notes and cards cut to their place.
- The walk self-test also steps back: at each step it plays the next step, steps back, and compares the result with the deep link. Its snapshot now records stroke, outline and border colour and z-index too, read computed.
- `chart` types `funnel` and `sankey`. A funnel sizes each stage by value and shows the conversion between stages. A sankey lays nodes out in columns, with bands as thick as their flow; `highlight(row)` lights one flow in `--k-accent`. A sankey refuses cycles and reads up to 16 nodes in 6 columns.
- `gauge` (a half-circle dial whose needle swings to a value; `to(value)` swings it again), `likert` (survey answers on a 5-point agree scale, one bar per statement, `row(i)` per step), and `chart` `bar(i)` to show one bar and its value per step.
- `cycle` and `vModel`: process diagrams for training. `cycle` puts phases round a ring (PDCA, a feedback loop), an arrow from each to the next, and `phase(i)` lights the current one in `--k-accent`. `vModel` draws the V model with each design level linked across to the test that checks it; `level(i)` or `link(i)` lights one, and it settles when the next one lights.
- `title`, `text`, `show` and `hide`: the basics of a `scene.ts` scene. `title(ctx)` builds the `scene.md` title as a hidden `h2`, placed as in a Markdown scene; `text(ctx, { text, x, y, w })` builds a hidden text box in a `--k-*` token colour; `show(el)` and `hide(el)` fade any element or list in or out.
- `focus`: one item of a list stays lit while the others dim in place; `on` again moves the focus, `clear` brings all back. No layer over the scene (unlike `spotlight`); reduced motion keeps the fade.
- `shape` and `arrow`: a rectangle, circle, line or connector on `ctx.svg` in `--k-line` (or `--k-accent`), 4 px, hidden until it draws on (`draw`) or fades in (`show`); an arrow can bow with `curve`, and its head draws when the shaft arrives. `tint(el, { to, prop })` tweens a colour to a theme token, and `token(el, name)` reads a token's colour for a tween of your own (GSAP cannot tween `var()`).
- `video` options `autoplay` and `muted`: with `autoplay: true` a YouTube or Vimeo player starts when its step arrives and shows its thumbnail again when the viewer leaves. `muted` defaults to `true`; `muted: false` asks for sound, which a browser may block. Without `autoplay` the viewer starts the player, as before.
- `travel`: one step moves an element along an SVG path, a `d` string or a path element of the scene; the route can show or draw on behind it, and `rotate` turns the element along it. With reduced motion it jumps to the end.
- `burst`: seeded confetti pops once from a point, for a milestone reached, in the theme's series colours. Decoration under `data-k-ignore`; reduced motion leaves it out.
- `roadmap`: a time axis with month ticks, milestones that appear one per step in `--k-accent`, and a "today" marker that moves step by step. The deck gives "today" (never the wall clock); dates are written in the deck language. With reduced motion the marker jumps and a milestone dot shows at once.
- `reveal`: a statement or a quote whose lines, or words, rise in one after another. The lines are the source lines (a list item's line breaks, or a list of strings), never the lines the font wraps to. `delay` holds it for a first step that plays under the section fade. Reduced motion: the text fades in.
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

- `checklist`: a `tick(i)` adder built out of step order lit the wrong box, because it noted the previous item when it was built; it now notes it when its step is added.
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
