# Changelog

klappe follows [semantic versioning](https://semver.org). Until 1.0.0 the deck format, the `scene.ts` API and the CLI may still change in a minor version; every such change is listed here under **Changed**. 1.0.0 comes with the deck template (M4).

## 0.6.0 (unreleased)

### Added

- `gitGraph`: `{ tag, on }` puts a tag over a branch tip, and `{ cherryPick, onto }` copies a commit (by its label) onto another branch, keeping the original. Catalog: `#/git/backport/7`.
- `semanticZoom`: `links: [{ from, to }]` draws arrows between boxes of one level, shown and hidden with that level; a level with links spaces its boxes wider. Catalog: `#/semantic-zoom/system/1`.
- `sequence`: `activations` draw bars on lifelines while an actor is busy, a `{ note, over }` row puts a note over one or two actors, and `frames` group rows in `alt`, `loop`, `opt` or `par` frames with an optional `else` line; each shows with its first row. Catalog: `#/sequence/frames/1`.
- `stickyNotes`: `vote(id, n)` drops `n` dots on a note, for the dot vote after an affinity map. Dots add up over steps and move with the note. Catalog: `#/notes-cards/affinity/5`.
- `pyramid`: `light(id)` puts a built layer back in the accent (`light(null)`: none), and `shape: "inverted"` narrows downwards, for a funnel-shaped stack. Catalog: `#/venn-pyramid/layers/5`, `#/venn-pyramid/hiring/1`.
- `checklist`: `fail(i)` crosses a box in `--k-bad` instead of ticking it, for an audit or a pre-mortem. Catalog: `#/checklist-agenda/pre-mortem/3`.
- `annotate`: `kind: "bracket"` stands a curly brace beside a run of lines on `side`, and `kind: "cross"` draws an X over the target, in `--k-bad`. `color` takes a `--k-*` token name for any mark. Catalog: `#/draw/annotate/8`.
- `roadmap`: a milestone with an empty `label` is a dot: no stem, label or date, and it does not count in the spacing check or the label width, so many dots show how dense releases get while a few labels carry the story. Labelled milestones keep alternating among themselves. Catalog: `#/roadmap/rush/3`.
- `roadmap`: `rush(from, to)` lands a range of milestones in one step, each sooner and with more punch than the one before, to show that things speed up. Catalog: `#/roadmap/rush/3`.
- `agenda`: a row takes an `icon`, a Lucide name such as `"coffee"` or `"utensils"`; it shows before the title, sized and coloured like the row text. Demo: `#/training/agenda/1`.
- `chat`: a ```` ```chat ```` fence in `scene.md` replays a thread with no `scene.ts`, one message per line and step. `avatars: { Ana: "media/ana.jpeg" }` puts a round picture beside each sender's bubble, initials where there is none. Catalog: `#/chat/chat-md/1`, `#/chat/thread/1`.
- `code`: `lineNumbers: true` shows a muted number before each line; `diff(src, { type: true })` types the added lines in, for live coding. Catalog: `#/code/live/1`.
- `compareTable`: `column(i)` lights one column from its header through the last row, for the plan you recommend; `column(null)` clears it. Catalog: `#/table-card/compare/6`.
- `roadmap`: `phases: [{ id, from, to, label }]` draws spans as bars in lanes under the axis; `reveal(id)` grows one. With phases, every milestone sits above the axis. Catalog: `#/roadmap/spans/1`.
- `flow`: node kinds for flowcharts, `kind: "decision"` (a diamond), `"store"` (a cylinder) and `"terminal"` (a pill); arrows meet the shape's outline. `dim(ids)` fades nodes and their arrows while you talk about the rest; `dim([])` brings them back. Catalog: `#/flow/flowchart/1`.
- `counter`: `prefix` and `unit`, smaller, on the number's line (`€ 2.4`, `98 %`). Catalog: `#/motion/counts/1`.
- `callout`: `hide` fades the leader and the label out again. Catalog: `#/callout/point/2`.
- `kpi`, `waffle` and `progress` take `to(value)`: the number, the cells or the ring move on to a new value in a later step, as `gauge` already did. Catalog: `#/numbers/shares/2`.
- `flipCard`, `cardStack`, `venn` (set names and region labels) and `matrix` (axis titles) shrink their text to fit, down to the 20 px floor, as the other elements do; text that still does not fit is a deck problem instead of spilling out of its box.
- German words: a deck with `lang: de` (or `de-DE`) shows klappe's own words in German, in the speaker view, the review window and the effects (Beispieldaten, Zeit ist um, the likert scale).
- `chart` scatter and bubble: `group: "<column>"` colours the dots by a text column, with a legend. Catalog: `#/chart/scatter/1`.
- `chart`: `lines: [{ value, label }]` draws dashed reference lines (a goal, last year, a limit) across bar, stacked, line, waterfall and slope charts, and down a timeline. The value axis reaches them. Catalog: `#/chart/bars/1`.
- `chart`: `highlight(i)` works on every chart type, not only sankey. The row's marks and values stay at full strength while the rest dims, and `highlight(null)` clears it. In a line chart, `i` is a series. `bar(i)` now also grows one stack, phase or funnel stage per step; the new `slice(i)` draws one donut slice and counts the total on; the new `series(i)` draws one line. Catalog: `#/chart/series/1`, `#/chart/slices/1`.
- Review mode: on the dev server, `R` opens a review window beside the deck that follows it step by step, with a field each for Content, Storytelling and Visuals. Findings save as you type to `decks/<id>/review.md`, one entry per step under its deep link, and come back when you return to the step. The klappe skill tells Claude Code to work through the file, delete each finding it fixes, and ask in the chat when one is unclear. A built deck has no review mode.

### Changed

- Demo deck: the story before the gallery is 12 scenes in 5 sections instead of 20 in 6, and most scenes combine several effects. The title slide shatters and the CRT boots in one scene (`#/opening/old-way/1`); the two trainings are one section, `training`, where the retry bug runs from walkthrough to fix to green tests in one scene, the system turns into a sequence diagram, the swimlanes lead into the ship decision, and the call to work leads into the exercise. Deep links into `technical-training`, `process-training` and `opening/boot` are gone.

### Fixed

- `roadmap` on an axis of several years: ticks every 2, 3, 6 or 12 months now count from January, so each January has a tick with its year (before, an axis from March showed "Mar, Sep, Mar, …" with only the first year). An axis that starts off that grid has no tick at its left end. Milestone dates show the year.
- `splitFlap`: Ä, Ö and Ü are on the drum, so a German word flips through them instead of changing in one cut; ß shows as ẞ instead of SS, which pushed the rest of the word one cell on.
- `chart` scatter and bubble: names of dots that sit close together no longer overlap; they move apart, in each period.

## 0.5.1 (unreleased)

### Fixed

- `code`: a step back over a `diff()` on clipped code no longer shows a clipped line over the "+N more lines" row.
- The speaker view no longer lists the ids of `stickyNotes` as presenter notes; a sticky note now carries its id in `data-k-sticky`.
- A deck problem raised from a scene's `scene.ts` (its own `ctx.problem` or an effect it built) names that file, and the step while one is being added: `…/scene.ts step 2: code: 50 lines do not fit; max 26`. Before, it had no file name; the tweens-before-the-step problem named `scene.md`.

## 0.5.0 (2026-10-25)

Tooling for building decks with agents, the architecture doc and a glossary, a scrim fix for moving backgrounds, and look and motion polish.

### Added

- `klappe shot` (`npm run shot`): PNGs of chosen steps at 1920x1080 and 1366x768, each step as it ends with no UI on top, in `dist/shots/<id>/`. A target is `<section>`, `<section>/<scene>` or `<section>/<scene>/<step>`, as in a deep link; no target shoots every step. `--last` keeps each scene's last step, `--sheet` adds one contact sheet per section, `--theme <name>` picks a theme. A target that names no step, or a page error, fails it. The builder and the look reviewer use it instead of their own Playwright scripts.
- `klappe outline` (`npm run outline`): the deck as text, with no browser: every section and scene with its deep-link ids, every step with its note, and a timing estimate (notes at 130 words a minute, at least 15 s a step). A new `deck.md` key, `duration` in minutes, gives it a target to compare against.
- A timeline lint (`tests/lint/timeline.test.ts`): deck code may not use `from()`.
- The skill's "Choose the element by intent" is a table: intent, effect, reference page and the catalog scene to copy, for every effect a deck can call. `tests/lint/skill-catalog.test.ts` keeps it complete and its links and scenes real.
- `CLAUDE.md` for agents working on klappe itself: where things are, the commands, and the rules the lints and the walk hold.
- `docs/architecture.md`: the components, the path from deck folder to stage, a step press, and where the timeline rule is enforced, with Mermaid diagrams. `docs/glossary.md`: the terms klappe uses, each with one meaning and its relations.
- `gitGraph`: a git history for developer trainings, one op per step: commits on one lane per branch, a new branch, a merge commit, and a rebase whose copies (`form′`) fly past the target's tip while the originals fade. Catalog `#/git/rebase/1`.
- `semanticZoom`: boxes in boxes on the canvas. `into(path)` flies the camera into a box while the rest of its level fades, and its insides build as it lands; `out` flies back up. Each level's labels read 32 px at their own zoom. Catalog `#/semantic-zoom/system/1`.
- `pointer`: a mouse pointer for UI walkthroughs. `move(target)` glides to an element or a point on a slight curve, `click` presses with an accent ripple, `type(field, text)` types into a focused field. Catalog `#/pointer/sign-in/1`.
- `flow` works as a state machine: `fire(from, to)` draws that transition on in `--k-accent` and moves the ring to the new state, and an edge from a box to itself is a loop on its first free face. Catalog `#/flow/state-machine/1`.
- `chart` types `scatter` (two number columns as x and y) and `bubble` (a third as the dot's area). With a `year`, `period` or similar column, `period(i)` moves the dots from period to period, as `barRace` does. Catalog `#/chart/scatter/1`, `#/chart/bubble/1`.
- Parallax depths: `parallax` takes a depth (`2` drifts twice as far as `true`), and `layers: [{ href, alt, parallax }]` stacks transparent pictures over a background, each drifting by its own depth. Catalog `#/parallax/near/1` has a near layer of rings.
- A speaker profile factory in the demo, `decks/demo/shared/speaker-profile.ts`, to copy into a deck: photo, name, role and company logo, CV, statements one per step, and a contact step with a QR code. Catalog `#/speaker/profile/1`.
- The demo has a transition gallery: one section per transition kind, from `#/tr-cut/cut-card/1` to `#/tr-magicmove/magicmove-card/1`, each card naming its `section.ts` line.
- The demo deck has a local clip, `media/sample.mp4` (six seconds, 65 KB, made for the demo), and a catalog scene for a video background (`#/fullscreen/video-loop/1`). The media scenes play it instead of a clip from the internet, so the demo runs offline.

### Fixed

- `annotate`: a ring on a code line flattens into the line gap and widens instead, so it no longer runs over the lines above and below.
- `swarm` stays sharp when the camera closes in: its canvas re-rasterises at the zoom it is shown at, up to 4096 device pixels a side (about 2x for a full-frame swarm).
- `shatter`: the impact frame is lighter. Each shard is cut to its polygon's bounds instead of a full-frame clone, and its layer exists from load, so less is rastered at the impact (a long frame of 83 ms became 67 ms on a desktop GPU; see `docs/perf-m2.md`).
- Demo: the camera catalog's tilt and dolly scenes raised a deck problem with reduced motion (a caption timed 0.6 s before a flight's end, which is a cut there). A test now loads the demo with reduced motion and expects no problem.
- Demo: the value-stream band clears the bottom safe area, and the flight to Analysis runs straight into the document stream (`auto`), so its first step is no longer an empty frame.
- A video, aurora, animated SVG or own-loop background with a `scrim` showed the scrim at full strength, so the stage was black: the scrim now keeps its value.

### Changed

- The `crt` transition opens the new canvas at 1.4 times its brightness by default, so the phosphor tint shows; `transitionOptions: { flash: "full" }` brings back the old bright open at 3 times. A look change for decks that use it.
- Building a deck from a storyboard: before the fan-out, the agent asks the deck owner whether to build the sections inline in its own session, with a checkpoint after each, or with one `klappe-builder` subagent per section, and recommends one.
- `Point` (`{ x, y }`) is in `klappe/types`; `flow`, `swimlanes` and `shatter` use it instead of their own, and `magicMove`'s `Box` is `Rect`.

## 0.4.0 (2026-10-25)

The M4 effects so far: moving backgrounds, spotlight and marks, board numbers and charts, five new themes, bundled fonts, `klappe pdf`, and the effect backlog (30+ effects, six transitions, five camera moves, safe-area checks in the self-test).

### Added

- `rackFocus`, `tilt` and `dollyZoom`: three camera moves. `rackFocus` keeps one item sharp while the others blur and dim, as a lens pulls focus; `on` again moves it, `clear` makes all sharp. `tilt(ctx, rect)` is a camera flight that leans a little into its direction and lands flat (also `ctx.camera.to(…, { tilt })`; off by default). `dollyZoom` is the vertigo move: the camera pulls back while the target holds its size and the background grows. Reduced motion keeps the blur, drops the lean and cuts the dolly.
- `magicMove` transition: an element that both sections show with the same `data-k-match` key (set in `build`, `el.dataset.kMatch = "logo"`) flies from its old place to its new one, its old look fading into its new look, while the rest fades. With no shared key, and with reduced motion, it plays a fade.
- `?selftest=walk` warns about ink outside the deck's safe area (deck.md `safe-area`, default 48 px top and bottom, 64 px sides) and about text its box clips; the warnings go to `warnings` in the result and never fail the walk. Mark an intended bleed with `data-k-bleed`; `worldMap`, `shatter` and the route a `follow` rides along mark themselves.
- `wordCloud`: words from a `data/` file, sized by weight and placed without overlap on a spiral, heaviest in `--k-accent`; `show(0, 3)` then `show(3)` brings in the top words, then the rest. The layout uses estimated word boxes, not measured ones, so it is the same on every machine and in CI.
- `reveal` reads `**bold**` words as key words: as each one rises it grows and takes `--k-accent`.
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
