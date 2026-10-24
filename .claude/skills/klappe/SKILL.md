---
name: klappe
description: Use when creating, editing, reviewing or debugging a klappe slide deck (decks/<id>/, deck.md, scene.md, scene.ts, section.ts, catalog scenes, themes) or when asked to explain, show or animate something in a presentation built with klappe.
---

# klappe

klappe turns Markdown folders into an animated deck on one infinite canvas per section. A scene is a folder with `scene.md` (steps) and an optional `scene.ts` (effects). In a deck repo the framework is in `klappe/`; every path below is relative to the deck repo.

Before you write anything, read the entry for each element you use: `klappe/docs/reference/index.md` lists them. Never guess an option name. Copy from the catalog scenes in `klappe/decks/demo/sections/` and change the text; each reference entry names its scene.

## Choose the element by intent

- Show code, one part at a time: a fenced block with `{1-2|4}` groups in `scene.md`. Code changing: `code` with `diff`. [code](klappe/docs/reference/elements/code.md)
- Show a command and its output: a ```` ```console ```` fence. [terminal](klappe/docs/reference/elements/terminal.md)
- Point at one thing: `callout`. [callout](klappe/docs/reference/elements/callout.md)
- Show a system and what flows through it: `flow`. [flow](klappe/docs/reference/elements/flow.md)
- Show who talks to whom, in order: `sequence`. [sequence](klappe/docs/reference/elements/sequence.md)
- Show who does what in a process: `swimlanes`. [swimlanes](klappe/docs/reference/elements/swimlanes.md)
- Show how a decision was made: `decisionTree`. [decisionTree](klappe/docs/reference/elements/decisionTree.md)
- Tick off items, or show the day: task list, time-range rows. [checklist](klappe/docs/reference/elements/checklist.md), [agenda](klappe/docs/reference/elements/agenda.md)
- Time an exercise: `timer`. [timer](klappe/docs/reference/elements/timer.md)
- Compare numbers: `chart` from a `data/` file. Show where: `worldMap`. A person moving: `figure`.
- A hard question for the room: `### Question?` in `scene.md`. Break with the old way: `shatter`. Volume: `swarm`. A picture: `image`; a background: `section.ts`. [effects](klappe/docs/reference/effects.md)
- Anything else: your own tween. [motion](klappe/docs/reference/motion.md)
- What `scene.md` does by itself: [markdown](klappe/docs/reference/markdown.md). Folders and keys: [deck-format](klappe/docs/reference/deck-format.md).

## The timeline rule

One master GSAP timeline per canvas; seek must equal play.

- Create all DOM in `build(ctx)`, hidden. A step never creates, removes or edits DOM.
- A step function only adds tweens to `tl`. Use `fromTo`, never `from`.
- `onUpdate` may write the DOM only as a pure function of the tween's progress, on an element marked `data-k-text` or `data-k-progress`.
- Never start a step with `"<"` or `"-="`.
- `steps` lines up with the list items in `scene.md`; the walk fails if the counts differ.

## Design rules

- Colours only as `var(--k-*)` tokens ([themes](klappe/docs/reference/themes.md)). No colour literals.
- Text at least 20 scene px (14 px at 1366). Lines, arrows and borders use `--k-line`, at least 2 px; what the room must follow uses `--k-accent`.
- One idea per step. Name the new thing by drawing it in `--k-accent`; it settles when the next step starts.
- A picture or a number beats a bullet. Keep text to a few words; speaker notes (`> note`) carry the rest.
- Do not write a fake image or data file: leave the link, and `klappe test` lists it in `media/TODO.md` or `data/TODO.md`.

## Check your work

Run `npm test`, then open the deck at 1920x1080 and 1366x768 (`npm run dev`, `?theme=calm` and `?theme=bold`) and run `?selftest=walk`. Fix every deck problem the page shows.
