---
name: klappe
description: Use when creating, editing, reviewing or debugging a klappe slide deck (decks/<id>/, deck.md, scene.md, scene.ts, section.ts, catalog scenes, themes) or when asked to explain, show or animate something in a presentation built with klappe.
---

# klappe

klappe turns Markdown folders into an animated deck on one infinite canvas per section. A scene is a folder with `scene.md` (steps) and an optional `scene.ts` (effects). In a deck repo the framework is in `klappe/`; every path below is relative to the deck repo.

Before you write anything, read the entry for each element you use: `klappe/docs/reference/index.md` lists them. Never guess an option name. Copy from the catalog scenes in `klappe/decks/demo/sections/` and change the text; each reference entry names its scene.

## Choose the element by intent

- A title or a text box in a `scene.ts` scene: `title`, `text`. Fade any element in or out: `show`, `hide`. [basics](klappe/docs/reference/elements/basics.md)
- Show code, one part at a time: a fenced block with `{1-2|4}` groups in `scene.md`. Code changing: `code` with `diff`. [code](klappe/docs/reference/elements/code.md)
- Show a command and its output: a ```` ```console ```` fence. [terminal](klappe/docs/reference/elements/terminal.md)
- Point at one thing: `callout`. Make the room look at one part, then the next: `spotlight`; light one item in place while the rest dim, with no dark layer: `focus`. Mark words as a pen would: `annotate`. [callout](klappe/docs/reference/elements/callout.md), [spotlight](klappe/docs/reference/elements/spotlight.md), [focus](klappe/docs/reference/elements/focus.md), [annotate](klappe/docs/reference/elements/annotate.md)
- Nudge one element (a glow, a pulse, a shake): `glow`, `pulse`, `shake`. [attention](klappe/docs/reference/elements/attention.md)
- Hold back an answer, then reveal it (question and answer, myth and fact): `flipCard`. [flipCard](klappe/docs/reference/elements/flipCard.md)
- Show a system and what flows through it: `flow`. [flow](klappe/docs/reference/elements/flow.md)
- Draw a small diagram of your own (boxes, a ring, a connector): `shape`, `arrow`. Change a colour to a theme token in a step: `tint`, or `token` for your own tween. [shape](klappe/docs/reference/elements/shape.md)
- Move something along a route (a parcel to a customer): `travel`. [travel](klappe/docs/reference/effects.md#travel)
- Show who talks to whom, in order: `sequence`. [sequence](klappe/docs/reference/elements/sequence.md)
- Show who does what in a process: `swimlanes`. [swimlanes](klappe/docs/reference/elements/swimlanes.md)
- Show how a decision was made: `decisionTree`. [decisionTree](klappe/docs/reference/elements/decisionTree.md)
- Sort things on two axes (effort against impact) and move one when the view changes: `matrix`. [matrix](klappe/docs/reference/elements/matrix.md)
- Show a loop of phases (PDCA, a feedback loop) with the current one lit: `cycle`. Show the V model, each level linked to its test: `vModel`. [cycle](klappe/docs/reference/elements/cycle.md)
- Show what two or three groups share, one overlap at a time: `venn`. [venn](klappe/docs/reference/elements/venn.md)
- Build a layered model from the base up (a test pyramid, a capability stack): `pyramid`. [pyramid](klappe/docs/reference/elements/pyramid.md)
- Compare options feature by feature (plans, tools), one row at a time: `compareTable`. Give the room a hands-on task with a time box and group: `exerciseCard`. [compareTable](klappe/docs/reference/elements/compareTable.md), [exerciseCard](klappe/docs/reference/elements/exerciseCard.md)
- Replay a conversation with an assistant or a colleague (typing dots, then the answer streams in): `chat`, one `scene.md` list item per message. [chat](klappe/docs/reference/elements/chat.md)
- Sort what the room wrote into themes (an affinity map): `stickyNotes`. Talk through a hand of cards, one at a time: `cardStack`. [stickyNotes](klappe/docs/reference/elements/stickyNotes.md), [cardStack](klappe/docs/reference/elements/cardStack.md)
- Tick off items, or show the day: task list, time-range rows. [checklist](klappe/docs/reference/elements/checklist.md), [agenda](klappe/docs/reference/elements/agenda.md)
- Show a plan over months, with where we are now: `roadmap`. [roadmap](klappe/docs/reference/elements/roadmap.md)
- Time an exercise: `timer` with `minutes`; count to a clock time (end of a break): `timer` with `until`. [timer](klappe/docs/reference/elements/timer.md)
- An 80s computer screen that boots and types: `crt`. [crt](klappe/docs/reference/elements/crt.md) A character who speaks: `bubble`. [bubble](klappe/docs/reference/elements/bubble.md) A quiet companion with moods that runs by itself: `mesh3d`. [mesh3d](klappe/docs/reference/elements/mesh3d.md)
- Compare numbers: `chart` from a `data/` file; drop-off through stages: `type: "funnel"`; where a total goes: `type: "sankey"`. Show where: `worldMap`. A person moving: `figure`.
- One reading against a fixed range (load, a score), maybe changing on a later step: `gauge`. Answers on an agree scale: `likert`. A bar chart told one bar at a time: `chart` + `bar(i)`.
- A hard question for the room: `### Question?` in `scene.md`. Break with the old way: `shatter`. Volume: `swarm`. A milestone reached: `burst`. A picture: `image`; one detail of it, step by step: `loupe`; a background: `section.ts` (a picture, a looping video or `animate: "aurora"`, optionally `parallax`); a full-screen clip: `video` with no `rect`. A clip that should run as its scene arrives: `video` with `autoplay: true` (muted unless `muted: false`). Before and after: `wipe`. A link to take home: `qr`. [effects](klappe/docs/reference/effects.md)
- Words that land: one line, `scramble`; a statement or a quote, line by line or word by word, `reveal`, key words in `**bold**`; a personal aside in hand, `handwrite`; what changed in a text, `redline`; a word or number flipped like an airport board, `splitFlap`; what a group said, weighted, `wordCloud` from a `data/` file. [effects](klappe/docs/reference/effects.md)
- Between sections, `transition` in `section.ts`: slide in with `"push"` or open from a point with `"iris"`; a bold break, `"glitch"`; the old section turns away, `"cube"`; the next page of a story, `"pageTurn"`; carry an element into the next section (a logo, a title chip), `"magicMove"`, with the same `el.dataset.kMatch` on both. [transitions](klappe/docs/reference/effects.md#transitions)
- Move the camera inside a scene: ride along with a moving element with `follow`, jolt the scene on a landing with `impactShake`, pull focus to one item with `rackFocus`, lean a long flight with `tilt`, make a big reveal with `dollyZoom`. [camera](klappe/docs/reference/elements/camera.md)
- Anything else: your own tween. [motion](klappe/docs/reference/motion.md)
- What `scene.md` does by itself: [markdown](klappe/docs/reference/markdown.md). Folders and keys, and many scenes with one shape from a factory in `shared/`: [deck-format](klappe/docs/reference/deck-format.md).

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
- klappe loads every `.ts` under `sections/` as a scene or section module. Keep helpers outside `sections/`, for example in `decks/<id>/shared/`. Section and scene slugs are ids for the whole deck: a repeat is a `duplicate section id` or `duplicate scene id` problem.
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

## Check your work

Run `npm test`, then open the deck at 1920x1080 and 1366x768 (`npm run dev`, `?theme=calm` and `?theme=bold`) and run `?selftest=walk`. Deep-link each scene's last step. Fix every deck problem the page shows.

Building a whole deck from a storyboard: read [building a deck](.claude/skills/klappe/references/building-a-deck.md).
