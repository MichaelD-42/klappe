---
dimension: deck_arc
version: 1
applies_to: [deck]
reviewer: content
levels: [shaped, loose, flat, unassessable]
rule-shaped: [none, pass]
rule-loose: [Minor, owner]
rule-flat: [Important, owner]
rule-unassessable: [Minor, owner]
---

# Deck arc

Judge the whole deck as the room will hear it, in order: not a scene at a time. Run `npm run outline -- --story` (`klappe outline --story`): one line per scene, its deep link and the story point it is meant to leave. Scenes marked `(no story point)` you judge from their title and notes. Ask: does the deck go somewhere, and does the room know what to do at the end?

Look for four things: an opening hook (the first scene gives the room a reason to listen), a through-line (each point follows from the one before, not a list of topics), set-ups paid off (what the deck raises early, it answers later), and one ask at the end (the last scene says what the room should do, believe or decide, and only one thing).

## shaped

All four are there. You can trace the through-line in one sentence and name the ask.
Evidence: the through-line in one sentence, and the ask.

## loose

Three of four hold, or one is weak: the hook is a title slide, a set-up is never paid off, a point does not follow from the last, or the ask is split or implied.
Evidence: which of the four fails, and the scene ids where.

## flat

The story points are a list of topics. No hook, no through-line, or no ask at all: the room would leave knowing what was shown, not what to do with it.
Evidence: the scene ids where the line breaks, and what the room is left with.

## unassessable

The outline could not be read, or the deck has one scene.
Evidence: say what is missing.

## Output

One line, after the `VERDICT:` line:
`RUBRIC deck_arc: <level> — <deck or first scene id> — <evidence>`

The owner decides what to change. Do not propose a rewrite; say what is missing.
