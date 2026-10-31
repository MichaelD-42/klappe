# Backlog

Open work only, ranked, most important first. All of it is in scope for 1.0.0, which is the last entry; the first entries change the deck format, the API or the look, so they come before anything builds on them. CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

- Deck cuts: one deck in several lengths (a 20- and a 45-minute cut that leave sections out) and a backup appendix outside the main flow, one jump away for Q&A. Today a re-cut means a copied deck.
- Presenter ink: draw on the stage during the talk (a laser dot, and a pen that marks and fades), from the mouse or the speaker view. Live, so it sits under `data-k-ignore` and never on a timeline; clear it on the next step.
- Icons in Markdown: `:icon-name:` on a list item in `scene.md` sets an icon with the step. Pairs with Text steps replace, not stack. Check first whether `image` already shows a `.svg` as a plain picture.
- Establishing shot: a step that pulls the camera out to the whole canvas, then pushes into the next scene. An authored move on the timeline, not the `O` overview.
- Monotony check: a look warning when several scenes in a row are text only or share one layout. The walk knows each scene's parts.
- Own transitions: `section.ts` `transition` takes a function as a background's `animate` does, with the same `reveal` label contract, so a deck has its own transition without forking klappe. Today `TransitionKind` is a closed union of twelve.
- Deck conversion: turn a PPTX or PDF into a draft deck folder (sections, `scene.md` steps, notes, `data/` for chart numbers with their source, `media/TODO.md` for the pictures). Probably a skill workflow over the `klappe` skill, not engine code; the storyteller prompt's "Convert deck" step is the spec.
- Pictogram chart: units drawn as icons ("1 in 4 engineers") that fill step by step, from `waffle` and `icon`.
- Layout grid: a column grid that scenes place on, or a look check that flags near-misses across scenes (a title a few px off where the other scenes put it). The `shot --sheet` contact sheet shows drift; nothing checks it.
- Image treatment: a duotone or tint on `image` from the theme's tokens, so photos from different sources read as one set.
- Split screen: two scenes side by side, the camera cutting between each alone and both together. Check first whether `place()` and a camera frame round both already do it.
- Handheld drift: a barely visible wall-clock drift of the camera while a step holds, under `data-k-ignore` like the backgrounds. Off with reduced motion; check whether it suits `calm` at all.
- Deck components in Markdown: a deck registers a fence or trigger for its own helpers (the demo's `speakerProfile`, `planChip`), so `scene.md` can use them without `scene.ts`.
- Sound: a short cue on a step (a whoosh on a flight, a hit on `impactShake`) and a music bed under a section. Plays on a forward step only, silent on seek, jump and back, like video; opt-in per deck and muted by a key. Reverses a v1 non-goal in the design spec (decided 2026-10-30, see DECISIONS.md); the build adds its own DECISIONS entry on how it keeps the timeline rule.
- klappe's own words per deck: a strings override in the deck for a language `src/strings.ts` lacks (it has `en` and `de`).
- Named layouts on non-landscape frames: `thirds`, `full-bleed` and `big-number` assume a landscape frame with hard-coded 160 and 140 padding; derive it from the frame, or report a deck problem on a portrait one.
- Video export scene filter: `klappe video --only <section>[/<scene>]`, as `test` has.
- Shape-token lint by use, not by file: the allow list exempts whole files, and `setAttribute("stroke-width")` is not linted.
- Release 1.0.0 once every entry above is done: the deck format, the `scene.ts` API and the CLI are then stable.
