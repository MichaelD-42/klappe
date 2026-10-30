# API audit: two work decks, October 2026

The first backlog entry asks which `klappe/fx` effects and options the work decks used, which they worked around, and which none touched. This note answers it for two decks and proposes how the backlog should move. It proposes; dropping effects and re-ranking are owner decisions.

## The decks

| | Deck A | Deck B |
| --- | --- | --- |
| Kind | A multi-day hands-on training | A short talk |
| Scenes | 116 (72 with their own `build()`, the rest from deck helpers) | 10 |
| `.ts` files | 202 (8,200 lines), plus 19 deck helpers (741 lines) | 10 (421 lines) |
| klappe | 0.6.1, pulled as a subtree eight times between 2026-10-20 and 2026-10-29 | 0.6.1 |
| Distinct effects called | 48 | 8 |

The backlog says three work decks; this audit covers the two that exist on disk. Deck B is too small to weigh on its own. The two decks sit at opposite ends: Deck B calls eight effects and touches nothing else, while Deck A builds much of its stage by hand.

Every scene in both decks has a `scene.ts`. No scene renders through the Markdown path: neither deck uses frontmatter or Markdown tables, and there is one code fence in 126 scenes. Deck A reads `ctx.doc.steps` in 27 scenes, so `scene.md` serves as the text source and the scene code places that text itself.

## How the counts were made

A script parsed every `.ts` file with the TypeScript compiler. It counted each call to a `klappe/fx` import, the keys of any object passed to it, and the methods called on the handle it returned. It also counted direct `gsap` calls and hand-built DOM. The 0.6.1 export list came from the compiler too, minus the names in `tests/lint/fx-internal.ts`. Counts are static call sites, not runtime calls: a call inside a loop counts once.

## What the decks used

Calls, with the number of files in brackets. "Through a helper" counts the deck helpers that wrap an effect, multiplied by the scenes that import them, because the direct count hides an effect a deck uses everywhere.

| Effect | Deck A direct | Deck A through a helper | Deck B |
| --- | --- | --- | --- |
| `drawOn` | 27 (21) | + 3 scenes (a grid helper) | |
| `iconTile` | 23 (22) | | |
| `image` | 22 (21) | + 10 scenes (break slides) | |
| `icon` | 18 (12) | | |
| `timer` | 12 (12) | + 22 scenes (exercise cards, breaks) | |
| `bubble` | 10 (7) | + about 18 scenes (mascot helper) | |
| `mesh3d` | 4 (3) | + about 20 scenes (mascot helper) | |
| `agenda` | 2 (2) | + 18 scenes (agenda hops) | |
| `exerciseCard` | 1 (1) | + 12 scenes (exercise cards) | |
| `shout` | 2 (2) | + 5 scenes (question reveal) | |
| `arrow` | 9 (8) | | |
| `parseCsv` | 5 (5) | | |
| `chart` | 4 (3) | | 3 (3): bar, line, stacked |
| `crt`, `shape`, `video`, `tint`, `morph`, `counter`, `annotate` | 4 each | | |
| `flow`, `travel` | 3 each | | |
| `title` | 0 | | 10 (10) |
| `compareTable` | | | 3 (3) |
| `text` | 1 | | 3 (2) |
| `reveal` | 2 | | 1 |
| `kpi`, `layerStack`, `waffle` | | | 2, 1, 1 |

Called once or twice in Deck A: `agenda`, `annotate`, `barRace`, `burst`, `chat`, `chatMessage`, `code`, `decisionTree`, `exerciseCard`, `figure`, `fishbone`, `focus`, `glow`, `loupe`, `processSteps`, `redline`, `roadmap`, `semanticZoom`, `sequence`, `shake`, `swarm`, `terminal`, `token`, `typed`, `zoomLayout`.

The verbs used most were `image.show`, `icon.draw`, `flow.fire`, `code.focus` and the `crt` verbs (`type`, `ready`, `dim`, `settle`, `powerOn`). The options are mostly placement (`x`, `y`, `w`, `h`, `rect`, `size`) and content. The options beyond those: `drawOn.duration` (27) and `each` (7), `icon.color` (18), `iconTile.tone` (23), `image.fit` (13), `timer.style` (12), `arrow.curve`, `mesh3d.mood`, `annotate.kind`, `crt.color`, `image.kenBurns` and `loupe.zoom`.

Two names on the internal list were called by the deck: `flowRoutes`, to find the middle of a `flow` edge and draw a gate on it, and `cursorCentre`.

## What the decks worked around

Each workaround below lists its scale, the reason the deck's own code gives for it, and the backlog entry it bears on.

- **The scene frame: 62 scenes.** A deck helper draws a branded content frame with the scene title and a logo in each scene. The helper's comment gives the reason: a scene with `build()` gets no title from klappe. Deck B solves the same problem with `title()` in all 10 scenes. Both decks re-add the title in every scene. *Overlay layer, Brand theme; new: a title for `build()` scenes.*
- **Fades: 63 scenes.** The deck has its own `fadeIn` and `fadeOut` and never calls `show` or `hide`. Its comment says why: it tweens `fromTo` with `immediateRender: false` so seek equals play, and it needs a position argument (`"<"`), which `show(el)(tl)` cannot take. *New: give `show`/`hide` a position and the deck's tween shape.*
- **Text on the stage: about 112 hand-built paragraphs, `text()` called once.** The scenes create `<p>` elements with a deck CSS class and inline sizes. The deck's colours are its own CSS variables: 341 uses, against 27 uses of `--k-*` tokens. `text()` rejects any colour that is not a `--k-*` token, so it cannot take the deck's palette. *Type scale tokens; new: `text()` takes a deck class or the deck's own tokens.*
- **Re-parenting an effect: 20 files.** Calls like `timer({ ...ctx, html: box }, …)` hand an effect a fake context, so it is placed inside a container (a card, a band, a box). No effect has a parent option. *New: a container option on effects.*
- **Local helpers: 39 scenes.** Scenes define their own `text = (…)` or `svg = (…)` helpers, nearly identical from scene to scene, and build 130 elements and 45 SVG shapes by hand (grids of rectangles, gate bars, file icons). *Composition presets, Deck components in Markdown.*
- **Typewriter.** The deck has its own typewriter for HTML text. klappe's `typed` exists only inside `crt`. *New, small.*
- **A question with two frames.** A `### Question?` parses to three steps, and the room needed two. The deck adds an empty step and an `auto` hold of 0 to skip it. *New, small: a two-frame `shout` option.*
- **Direct `gsap`: 72 files, almost all `gsap.set` (151).** These set start poses in `build()` so seek and play agree. That follows the timeline rule rather than working around klappe. The 10 `gsap.timeline` calls run sub-timelines, for example to play two `shake` effects at once.

## What no deck touched

38 author-facing effects from 0.6.1 were never called. Most of them reached Deck A after its scenes were written: of the 40 commits that added scene files, 31 are dated 2026-10-20 to 2026-10-23. The dates below are when each effect first appeared in klappe; Deck A received each batch within a day.

- **Available for the whole build, unused (6):** `lineArt`, `shatter`, `worldMap` (2026-10-19); `callout`, `checklist`, `swimlanes` (2026-10-20). These are the drop or merge candidates, with a caveat: two decks are a small sample, and a training deck has no use for a world map.
- **Arrived mid-build, too new to judge (28):** `flipCard`, `matrix`, `progress`, `pulse`, `qr`, `scramble`, `spotlight`, `wipe` (2026-10-24); `cardStack`, `cycle`, `dollyZoom`, `follow`, `gauge`, `gitGraph`, `handwrite`, `hide`, `impactShake`, `likert`, `pointer`, `pyramid`, `rackFocus`, `show`, `splitFlap`, `stickyNotes`, `tilt`, `vModel`, `venn`, `wordCloud` (2026-10-25). `show` and `hide` are a special case: the deck had already written its own (see Fades).
- **Arrived at the end (4):** `calendar`, `depGraph`, `formula`, `mindMap` (2026-10-28).

## Deck settings

- `deck.md` keys used by both decks: `title`, `lang`, `theme`, `intensity`, `confidential`. Deck A adds `safe-area`, Deck B `duration`. Neither sets `max-words`.
- Deck A section transitions: `fade` (43), `blackout` (11), `zoom` (9), `crt` (3), `cut` (1), all of them built in. Deck B sets none.
- Deck A's folder grew `data/`, `media/`, `fonts/`, `themes/`, `deck.css`, a `shared/` helper folder and a `review.md`. Deck B has `data/` only.

## Proposed backlog moves

These are proposals. The owner decides.

1. **Raise Overlay layer and Brand theme.** 62 scenes draw the frame and logo by hand, and both decks re-add the title in every scene.
2. **Add: effects take the deck's palette.** Let `text()` and other effects accept a deck class or deck tokens. This would remove most of the hand-built text. It sits close to Type scale tokens, which the hand-set `font-size` values also support.
3. **Add: a container option on effects** (20 files hand an effect a fake context).
4. **Add: `show`/`hide` with a position and a `fromTo` tween**, so a deck has no reason to write its own fade (63 scenes).
5. **Text steps replace, not stack: weigh it.** No scene uses the Markdown render path, which reads two ways. The default does not fit how these decks are built, which argues for the change. Or the decks will stay code-first whatever the default does, which argues for doing it later.
6. **Lower Own transitions.** Deck A used five built-in kinds and needed nothing more.
7. **Word cap by default stands.** Neither deck set `max-words`.
8. **`template/`:** take `data/`, `media/`, a `deck.css` slot, a `shared/` helpers folder and the five common `deck.md` keys from these decks.
9. **Small additions:** a typewriter for HTML text; a two-frame `shout`; a way to read an edge's position from a `flow` handle, so `flowRoutes` can stay internal.
10. **Effects:** review the six that went unused all build long before 1.0 freezes them. Judge the other 32 after a third deck, or after Deck A's next round.
