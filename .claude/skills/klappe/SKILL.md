---
name: klappe
description: Use when creating, editing, reviewing or debugging a klappe slide deck (decks/<id>/, deck.md, scene.md, scene.ts, section.ts, catalog scenes, themes) or when asked to explain, show or animate something in a presentation built with klappe.
---

# klappe

klappe turns Markdown folders into an animated deck on one infinite canvas per section. A scene is a folder with `scene.md` (steps) and an optional `scene.ts` (effects). In a deck repo the framework is in `klappe/`; every path below is relative to the deck repo.

Before you write anything, read the entry for each element you use: `klappe/docs/reference/index.md` lists them. Never guess an option name. Copy from the catalog scenes in `klappe/decks/demo/sections/` and change the text; each reference entry names its scene.

## Choose the element by intent

Find the intent, read the reference entry, then copy the catalog scene (a folder under `klappe/decks/demo/sections/`; open it at `#/<section>/<scene>/1` without the number prefixes). Every effect a deck can call has a row; a test keeps it so.

| Intent | Use | Reference | Catalog scene |
|---|---|---|---|
| A title or a text box in a `scene.ts` scene; fade any element in or out | `title`, `text`; `show`, `hide` | [basics](klappe/docs/reference/elements/basics.md) | `106-basics/10-text-and-fades` |
| An equation that builds term by term, for a technical training: `\step{…}` around each term; light one term again, `light(i)` | `formula` | [formula](klappe/docs/reference/elements/formula.md) | `240-code/40-formula` |
| Show code, one part at a time; code changing | a fence with `{1-2\|4}` groups in `scene.md`; `code` with `diff` | [code](klappe/docs/reference/elements/code.md) | `240-code/10-walkthrough`, `240-code/20-diff` |
| Show a command and its output | a ```` ```console ```` fence; `terminal` in `scene.ts` | [terminal](klappe/docs/reference/elements/terminal.md) | `250-terminal/10-replay` |
| Point at one thing | `callout` | [callout](klappe/docs/reference/elements/callout.md) | `260-callout/20-point` |
| Numbered places on a picture, explained one per step | `callout` with `focus` on your own marks | [callout](klappe/docs/reference/elements/callout.md#hotspots) | `260-callout/30-hotspots` |
| Walk through a screen: move, click, type, drag (a tool training) | `pointer` | [pointer](klappe/docs/reference/elements/pointer.md) | `239-pointer/10-sign-in`, `239-pointer/20-drag` |
| Make the room look at one part, then the next; at two parts at once, `on([a, b])` | `spotlight` | [spotlight](klappe/docs/reference/elements/spotlight.md) | `265-spotlight/10-on-a-flow` |
| Light one item in place while the rest dim, with no dark layer | `focus` | [focus](klappe/docs/reference/elements/focus.md) | `266-focus/10-talk-through` |
| Mark words as a pen would (ring, underline, frame, strike, arrow, highlight); group lines with a bracket; cross out what is wrong | `annotate` | [annotate](klappe/docs/reference/elements/annotate.md) | `120-draw/40-annotate` |
| Nudge one element | `glow`, `pulse`, `shake` | [attention](klappe/docs/reference/elements/attention.md) | `268-attention/10-nudges` |
| Hold back an answer, then reveal it (question and answer, myth and fact) | `flipCard` | [flipCard](klappe/docs/reference/elements/flipCard.md) | `275-flipcard/10-cards` |
| Show a system and what flows through it; a flowchart with decisions and data stores, `kind`; set a part aside, `dim` | `flow` | [flow](klappe/docs/reference/elements/flow.md) | `270-flow/10-pipeline`, `270-flow/20-send`, `270-flow/60-flowchart` |
| Draw a small diagram of your own (boxes, a ring, a connector); change a colour to a theme token in a step | `shape`, `arrow`; `tint`, or `token` for your own tween | [shape](klappe/docs/reference/elements/shape.md) | `125-shapes/10-diagram` |
| Move something along a route (a parcel to a customer) | `travel` | [travel](klappe/docs/reference/effects.md#travel) | `285-travel/10-parcel` |
| A state machine: the current state lit, one transition firing per step | `flow` with `highlight` and `fire` | [flow](klappe/docs/reference/elements/flow.md) | `270-flow/50-state-machine` |
| Show who talks to whom, in order; who is busy (activation bars), a note, alt and loop frames; back to one call, `highlight(i)` | `sequence` | [sequence](klappe/docs/reference/elements/sequence.md) | `280-sequence/10-order`, `280-sequence/30-frames` |
| Zoom into a system level by level (systems, containers, components), with arrows per level | `semanticZoom` | [semanticZoom](klappe/docs/reference/elements/semanticZoom.md) | `172-semantic-zoom/10-system` |
| Show who does what in a process; build it hand-off by hand-off, `tasks(ids)` | `swimlanes` | [swimlanes](klappe/docs/reference/elements/swimlanes.md) | `290-swimlanes/10-process`, `290-swimlanes/20-build` |
| Show how a decision was made | `decisionTree` | [decisionTree](klappe/docs/reference/elements/decisionTree.md) | `300-tree/10-route` |
| Lay out a topic before going into it: a centre and branches round it, one per step; come back to one, `light(i)` | `mindMap` | [mindMap](klappe/docs/reference/elements/mindMap.md) | `300-tree/30-mind-map` |
| Teach git: commits, branches, a merge, a rebase, a tag, a cherry-pick, one per step | `gitGraph` | [gitGraph](klappe/docs/reference/elements/gitGraph.md) | `304-git/10-rebase`, `304-git/20-backport` |
| Sort things on two axes (effort against impact) and move one when the view changes; place by score, `place(id, { x, y })` | `matrix` | [matrix](klappe/docs/reference/elements/matrix.md) | `295-matrix/10-priorities`, `295-matrix/20-scored` |
| A loop of phases (PDCA) with the current one lit; the V model, each level linked to its test | `cycle`; `vModel` | [cycle](klappe/docs/reference/elements/cycle.md) | `296-cycles/10-pdca`, `296-cycles/20-v-model` |
| Find a root cause: the problem in a head, cause bones built one per step, the root cause lit, `light(i)` | `fishbone` | [fishbone](klappe/docs/reference/elements/fishbone.md) | `296-cycles/40-fishbone` |
| Where a process training stands, "step 2 of 5": numbered chevrons with the current stage lit, `to(i)` | `processSteps` | [processSteps](klappe/docs/reference/elements/processSteps.md) | `296-cycles/30-stage-bar` |
| A system in layers, whole, then pulled apart to talk through each: `apart`, `light(i)`, `together` | `layerStack` | [layerStack](klappe/docs/reference/elements/layerStack.md) | `297-venn-pyramid/40-layer-stack` |
| What depends on what, laid out for you; a dependency chain or a blast radius lit hop by hop | `depGraph` | [depGraph](klappe/docs/reference/elements/depGraph.md) | `270-flow/70-dependencies` |
| A plan in days: deadlines and sprints on a month grid, `mark(date)` and `span(from, to)` | `calendar` | [calendar](klappe/docs/reference/elements/calendar.md) | `305-roadmap/40-calendar` |
| What two or three groups share, one overlap at a time | `venn` | [venn](klappe/docs/reference/elements/venn.md) | `297-venn-pyramid/10-overlaps` |
| A layered model from the base up (a test pyramid, a capability stack, a funnel-shaped stack with `shape: "inverted"`); light one layer again, `light(id)` | `pyramid` | [pyramid](klappe/docs/reference/elements/pyramid.md) | `297-venn-pyramid/20-layers`, `297-venn-pyramid/30-hiring` |
| Compare options feature by feature, one row at a time; a cell that holds only partly, `"~"` | a Markdown table in `scene.md`; `compareTable` | [compareTable](klappe/docs/reference/elements/compareTable.md) | `298-table-card/15-compare-md`, `298-table-card/10-compare` |
| A hands-on task for the room with a time box and group | `exerciseCard` | [exerciseCard](klappe/docs/reference/elements/exerciseCard.md) | `298-table-card/20-exercise-card` |
| Replay a conversation (typing dots, then the answer streams in) | a ```` ```chat ```` fence in `scene.md`; `chat` in `scene.ts` for avatars, its messages through `chatMessage` | [chat](klappe/docs/reference/elements/chat.md) | `217-chat/30-chat-md`, `217-chat/10-thread` |
| Sort what the room wrote into themes (an affinity map), then show a dot vote, `vote(id, n)` | `stickyNotes` | [stickyNotes](klappe/docs/reference/elements/stickyNotes.md) | `299-notes-cards/10-affinity` |
| Talk through a hand of cards, one at a time | `cardStack` | [cardStack](klappe/docs/reference/elements/cardStack.md) | `299-notes-cards/20-stack` |
| Tick off items; cross one out in `--k-bad` (an audit, a pre-mortem) | a task list (`- [ ]`) in `scene.md`; `checklist` with `tick` and `fail` | [checklist](klappe/docs/reference/elements/checklist.md) | `310-checklist-agenda/10-checklist`, `310-checklist-agenda/15-pre-mortem` |
| Show the day | time-range list items in `scene.md`; `agenda` | [agenda](klappe/docs/reference/elements/agenda.md) | `310-checklist-agenda/20-day-agenda` |
| A plan over months, with where we are now | `roadmap` | [roadmap](klappe/docs/reference/elements/roadmap.md) | `305-roadmap/10-release` |
| Time an exercise; count to a clock time (end of a break) | `timer` with `minutes`; `timer` with `until` | [timer](klappe/docs/reference/elements/timer.md) | `320-timer/10-countdown`, `320-timer/30-until` |
| An 80s computer screen that boots and types | `crt` | [crt](klappe/docs/reference/elements/crt.md) | `180-crt/10-power-on` |
| A character who speaks | `bubble` | [bubble](klappe/docs/reference/elements/bubble.md) | `160-motion/30-talk` |
| A quiet companion with moods that runs by itself | `mesh3d` | [mesh3d](klappe/docs/reference/elements/mesh3d.md) | `340-mesh3d/10-avatar` |
| Compare numbers from a `data/` file: bar, stacked, line, waterfall, timeline, donut, slope; drop-off through stages, `type: "funnel"`; where a total goes, `type: "sankey"`; two numbers per item, `type: "scatter"`, a third as size, `type: "bubble"`, moving year by year with `period(i)`; a profile over a few dimensions, `type: "radar"`; a grid such as day by hour, `type: "heatmap"`, one cell pointed at with `cell(row, col)`; shares with many parts or two levels, `type: "treemap"`; one bar, slice or line at a time, `bar(i)`, `slice(i)`, `series(i)`; one row lit, the rest dimmed, `highlight(i)` | `chart` | [chart](klappe/docs/reference/effects.md#chart) | `110-chart/10-bars`, `110-chart/70-bar-steps`, `110-chart/72-series`, `110-chart/74-slices`, `110-chart/76-bubble`, `110-chart/77-radar`, `110-chart/78-heatmap`, `110-chart/79-treemap` |
| Who led, who climbed, period by period | `barRace` | [barRace](klappe/docs/reference/effects.md#barrace) | `110-chart/59-race` |
| One number for a board slide: a KPI with a sparkline, a share, progress | `kpi`, `waffle`, `progress` | [kpi](klappe/docs/reference/effects.md#kpi-waffle-progress) | `115-numbers/10-kpis`, `115-numbers/20-shares` |
| One reading against a fixed range (load, a score), maybe changing on a later step | `gauge` | [gauge](klappe/docs/reference/effects.md#gauge) | `115-numbers/30-gauge` |
| Answers on an agree scale | `likert` | [likert](klappe/docs/reference/effects.md#likert) | `115-numbers/40-likert` |
| A number that counts up or down; on to a new value on a later step, `to(v)` | `counter` | [counter](klappe/docs/reference/effects.md#counter) | `160-motion/40-counts` |
| Show where; fill the countries where we sell, `region` | `worldMap` | [worldMap](klappe/docs/reference/effects.md#worldmap) | `150-map/10-world` |
| A person moving; seated at a table, `seated` or `sit` | `figure` | [figure](klappe/docs/reference/effects.md#figure) | `130-figure/10-walk`, `130-figure/30-table` |
| A line drawing from an SVG file, stroke by stroke; draw on any path you made | `lineArt`; `drawOn` | [lineArt](klappe/docs/reference/effects.md#lineart), [drawOn](klappe/docs/reference/effects.md#drawon) | `120-draw/10-desk`, `120-draw/30-shapes` |
| An icon, or an icon on a tile | `icon`, `iconTile` | [icon](klappe/docs/reference/effects.md#icon) | `140-icons/10-icons`, `140-icons/20-tiles` |
| A picture, with a credit line for a stock or press photo; one detail of it, step by step | `image` (`credit`); `loupe` | [image](klappe/docs/reference/effects.md#image), [loupe](klappe/docs/reference/effects.md#loupe) | `190-media/20-image-and-video`, `236-loupe/10-detail` |
| A clip; full screen with no `rect`; it plays on its step (with sound unless `muted: true`), or on a later `play(tl)` step | `video` | [video](klappe/docs/reference/effects.md#video) | `190-media/20-image-and-video`, `190-media/30-full-frame` |
| Before and after | `wipe` | [wipe](klappe/docs/reference/effects.md#wipe) | `230-fullscreen/60-wipe` |
| Introduce a speaker: photo, role and company, short CV, statements, contact with a QR | the `speakerProfile` factory: copy `klappe/decks/demo/shared/speaker-profile.ts` into the deck's `shared/` | [deck-format](klappe/docs/reference/deck-format.md#a-speaker-profile) | `109-speaker/10-profile` |
| A link to take home | `qr` | [qr](klappe/docs/reference/effects.md#qr) | `190-media/40-qr` |
| A hard question for the room | `### Question?` in `scene.md`; `shout` in `scene.ts` | [shout](klappe/docs/reference/effects.md#shout) | `210-shout/10-calm` |
| Break with the old way | `shatter` | [shatter](klappe/docs/reference/effects.md#shatter) | `200-shatter/10-card` |
| Volume | `swarm` | [swarm](klappe/docs/reference/effects.md#swarm) | `220-swarm/10-stream` |
| A milestone reached | `burst` | [burst](klappe/docs/reference/effects.md#burst) | `220-swarm/20-burst` |
| One thing becomes the next (document to fact to card) | `morph` | [morph](klappe/docs/reference/effects.md#morph) | `160-motion/10-chain` |
| A line that types itself in the deck font (not a code font) | `typed` into a `text()` box marked `data-k-text` | [typed](klappe/docs/reference/effects.md#typed) | `217-chat/20-typewriter` |
| One line that lands | `scramble` | [scramble](klappe/docs/reference/effects.md#scramble) | `160-motion/50-decode` |
| A statement or a quote, line by line or word by word, key words in `**bold**` | `reveal` | [reveal](klappe/docs/reference/effects.md#reveal) | `215-reveal/10-quote` |
| A personal aside in hand, a line or a few | `handwrite` | [handwrite](klappe/docs/reference/effects.md#handwrite) | `238-handwriting/10-note` |
| What changed in a text | `redline` | [redline](klappe/docs/reference/effects.md#redline) | `218-redline-flap/10-redline` |
| A word or number flipped like an airport board | `splitFlap` | [splitFlap](klappe/docs/reference/effects.md#splitflap) | `218-redline-flap/20-board` |
| What a group said, weighted, from a `data/` file | `wordCloud` | [wordCloud](klappe/docs/reference/effects.md#wordcloud) | `216-words/10-cloud` |
| A background: a picture, a looping video, `animate: "aurora"`, optionally `parallax` | `background` in `section.ts` or `scene.ts` | [section.ts](klappe/docs/reference/deck-format.md#sectionts) | `230-fullscreen/20-background`, `230-fullscreen/45-aurora`, `230-fullscreen/46-video-loop`, `235-parallax/10-near` |
| Between sections: slide in, `"push"`; open from a point, `"iris"`; a bold break, `"glitch"`; the old section turns away, `"cube"`; the next page of a story, `"pageTurn"`; carry an element across (a logo, a title chip), `"magicMove"` with the same `el.dataset.kMatch` on both | `transition` in `section.ts` | [transitions](klappe/docs/reference/effects.md#transitions) | the gallery, one section per kind: `350-tr-cut/10-cut-card` to `361-tr-magicmove/10-magicmove-card`; a zoom into a named target, `170-zoom/10-dive`; a magic move with two keys, `301-magic-a/10-before` |
| Move the camera inside a scene: ride along, `follow`; jolt on a landing, `impactShake`; pull focus to one item, `rackFocus`; lean a long flight, `tilt`; a big reveal, `dollyZoom` | `follow`, `impactShake`, `rackFocus`, `tilt`, `dollyZoom` | [camera](klappe/docs/reference/elements/camera.md) | `237-camera/10-follow`, `237-camera/20-rack-focus`, `237-camera/30-tilt`, `237-camera/40-dolly` |
| Anything else | your own tween | [motion](klappe/docs/reference/motion.md) | `330-tweens/10-boxes` |

What `scene.md` does by itself: [markdown](klappe/docs/reference/markdown.md). Folders and keys, and many scenes with one shape from a factory in `shared/`: [deck-format](klappe/docs/reference/deck-format.md).

## The timeline rule

One master GSAP timeline per canvas; seek must equal play.

- Create all DOM in `build(ctx)`, hidden. A step never creates, removes or edits DOM.
- A step function only adds tweens to `tl`. Use `fromTo`, never `from`.
- Give every `fromTo` `immediateRender: false`, and set its start value in `build()` with `gsap.set`. Otherwise a later step's start value applies at load, and seek no longer equals play.
- `onUpdate` may write the DOM only as a pure function of the tween's progress, on an element marked `data-k-text` or `data-k-progress`.
- Never start a step with `"<"` or `"-="`: it is a deck problem.
- `steps` lines up with the list items in `scene.md`; the walk fails if the counts differ.
- Read the scene's text from `ctx.doc` (title, steps, notes) and the deck's `lang` and `intensity` from `ctx.deck`; never copy text from `scene.md` into `scene.ts`.

## Writing scene.ts

- With `build()`, klappe draws nothing for the scene, not even its title. Put `ctx.doc.title` into an `h2` you build hidden and show in step 1.
- `ctx.html` paints over `ctx.svg`: an HTML box with a background hides the SVG helpers under it. Within a layer, what you build later paints on top.
- klappe loads every `.ts` under `sections/` as a scene or section module. Keep helpers outside `sections/`, for example in `decks/<id>/shared/`. Section and scene slugs are ids for the whole deck: a repeat is a `duplicate section id` or `duplicate scene id` problem, and `klappe test` stops on it at once. `npm run outline` lists the ids taken.
- Reach an effect's elements only through its handle (`el` and the named parts), never with `lastElementChild` or `children[i]`. If the handle lacks a part, ask for it in klappe.
- A scene that plays in several places (a break, an agenda hop) is one function outside `sections/` that returns a `SceneModule`; each `scene.ts` calls it.

## Design rules

- Colours only as `var(--k-*)` tokens ([themes](klappe/docs/reference/themes.md)). No colour literals and no deck-own colour tokens: a colour klappe lacks is a request for a new `--k-*` token.
- GSAP does not interpolate a `var()` colour: mid-tween the colour is wrong. For a colour tween, read the token in `build()` with `getComputedStyle(document.documentElement).getPropertyValue("--k-accent").trim()` and tween that value.
- Text at least 20 scene px (14 px at 1366). Lines, arrows and borders use `--k-line`, at least 2 px; what the room must follow uses `--k-accent`.
- One idea per step. Name the new thing by drawing it in `--k-accent`; it settles when the next step starts.
- No dead clicks: every press changes the picture and gives the speaker something to say. Chain motion that needs no words with `auto` (seconds per step), so one press runs it.
- Before a large element or an answer lands, fade out what it would cover. Check each scene's last step for overlap.
- A picture or a number beats a bullet. Keep text to a few words; speaker notes (`> note`) carry the rest. Put a note under the step where the speaker needs it, not at the end of the scene.
- Do not write a fake image or data file: leave the link, and `klappe test` lists it in `media/TODO.md` or `data/TODO.md`. A number on screen has a source (a `# source:` line in its CSV, or a source line on screen); made-up values carry a visible "Sample data" label (`chart` with `sample: true` shows it).
- On a picture or a gradient, measure contrast yourself: 4.5:1 for body text, 3:1 for large text. The theme check measures only token pairs.
- Keep ink inside the safe area: set `safe-area` in deck.md (for example `[48, 120, 155]` for a footer), mark intended bleeds with `data-k-bleed`, and read the walk's `warnings`; see deck-format.md "Look checks".

## Work through a review

When the user asks you to work on their review, read `decks/<id>/review.md`. The author wrote it in the review window (`R` on the dev server): one `## <deep link>` entry per step, the step's text as a `>` quote, and a `### Content`, `### Storytelling` or `### Visuals` finding under it. A finding about a whole story arc sits on its first or last step and says so. A finding is open unless its last `####` section is `#### Fixed`: one you fixed earlier waits there for the author's approval, and one with `#### Reopened` last came back with the author's note on what is still wrong. Work the open ones only.

- Work a scene's entries from its last step to its first, so your own changes do not move a deep link still open.
- For each finding, open the scene its deep link names (`npm run outline` lists the ids), make the change it asks for, and check it: `npm test -- --only <section>/<scene>` for the walk, and `npm run shot -- <section>/<scene>/<step>` for anything on screen.
- Then commit the fix and mark the finding fixed: add `#### Fixed` at the end of its `###` section, then one line on what changed and the short commit hash. Never delete a finding: the author approves it in the review window, which removes it. Leave text you do not understand in place.
- When a change adds, removes or merges steps in a scene, rewrite the deep links of that scene's entries, fixed ones too, so each names its step again; the quote tells you which step it was.
- When a finding is unclear, ask in the chat and leave it in the file until the author answers. Add nothing to the file but the `#### Fixed` lines.

## Check your work

While you work, check only the scenes you touched:

- `npm test -- --only <section>/<scene>` walks those scenes at the three sizes in seconds and prints their look warnings (safe area, clipped text). Repeat `--only` or join targets with commas; `--bail` stops at the first failing step; `--strict` makes a look warning fail. It also catches a `scene.ts` whose step count differs from `scene.md`, and, with `max-words` in deck.md, a step with too many words on screen.
- After the reviews, `node klappe/bin/verdict.mjs` checks their format and says where the work goes; see [building a deck](.claude/skills/klappe/references/building-a-deck.md) step 7.
- `npm run shot -- <section>/<scene> --last --size 1366x768` shoots one size. `--at <ms>` shoots a step that far into its play, to check motion. `--url http://localhost:<port>/` reuses a running `npm run dev` of the same deck, so each shot skips the server start.

Before you hand back the whole deck, run the full `npm test` once. Shoot each scene's last step at both sizes with `npm run shot -- <section> --last` (and `--theme bold`), read the PNGs, and fix every deck problem and page error it prints. `npm run outline` prints the deck as text, with a timing estimate against `duration` in `deck.md`: read it to check that each scene carries one message.

Work fast:

- Run one full `npm test` at a time on a machine; parallel full runs time out. With subagents, only the orchestrator runs it, once per wave.
- Run a long check in the foreground with a timeout, or in the background and wait for its notification. Never poll with `sleep` in a loop, and never hand back while your own check still runs.
- Edit files with the Edit and Write tools, not `sed -i`, heredocs or scripts: shell writes ask for permission and skip the edit checks.

Building a whole deck from a storyboard: read [building a deck](.claude/skills/klappe/references/building-a-deck.md).
