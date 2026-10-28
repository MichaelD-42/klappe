# Glossary

The words klappe's code, docs, skill and agents use, each with one meaning. Where a term is a kind of another or part of another, the entry says so; *see* points to a related term. Code names are in `code`. The [architecture](architecture.md) shows how the parts fit together.

## Deck and its folders

**Deck.** One talk: a folder `decks/<id>/` with `deck.md`, `sections/`, and optional `media/`, `data/`, `themes/`, `shared/` and `deck.css`. Has sections. Type `Deck`.

**Deck repo.** A git repo that holds one or more decks and klappe itself in `klappe/` (`klappe init` sets it up). The klappe repo is a deck repo too, with the demo deck.

**deck.md.** The deck's frontmatter: `title`, `lang`, `theme`, `intensity`, `confidential`, `shared-canvas`, `safe-area`, `duration`. Type `DeckMeta` (`duration` is read only by `klappe outline`).

**Section.** A chapter of a deck: a folder `sections/<NN-id>/` with `section.md` (its `# title` and notes) and an optional `section.ts`. Has scenes; part of a deck. Gets its own canvas unless the deck shares one.

**section.ts.** A section's module: its background, its transition, and a `build` for parts every scene of the section uses. Type `SectionModule`.

**Scene.** One place on a canvas: a folder `sections/<NN-id>/<NN-id>/` with `scene.md` and an optional `scene.ts`. Has steps; part of a section. The camera flies to it.

**scene.md.** A scene's `## title`, its steps (list items), its speaker notes (`> quote`), and Markdown parts. Parsed into `SceneDoc`; a scene's `ctx.doc`.

**scene.ts.** A scene's module: `place`, `build`, `steps`, `auto`, `background`, `overviewLabel`. Type `SceneModule`. Without `build`, the default renderer draws the scene from `scene.md`.

**Id and order.** A folder name `20-value-stream` gives the order `20` and the id `value-stream`. Ids are unique in the deck; deep links use them, never the numbers.

**shared/.** A deck folder for helpers and scene factories. klappe loads every `.ts` under `sections/` as a module, so helpers live outside it.

**media/ and data/.** A deck's pictures and videos, and its CSV or JSON files. A link names them as `media/x.png` or `data/x.csv`. A missing one gets a line in `media/TODO.md` or `data/TODO.md`.

## On stage

**Stage.** The 1920x1080 frame the audience sees, scaled to the window. Holds the canvases and the UI layer.

**Canvas.** One large surface per section, or per group of sections in `shared-canvas`. Has a world, a pinned layer and one master timeline. Type `CanvasRuntime` (`CanvasLayout` before it is built).

**World.** The part of a canvas the camera moves: an SVG layer (`ctx.svg`) under an HTML layer (`ctx.html`).

**Pinned layer.** The part of a canvas that stays put while the camera moves: backgrounds.

**Rect.** A box `{ x, y, w, h }` in canvas units; a scene's rect is where it sits on its canvas, from `place()` or the next free 1920x1080 frame. *See* Point (`{ x, y }`).

**Camera.** What moves the world so a rect fills the stage. It flies from scene to scene on its own, and `ctx.camera.to` or a camera move moves it inside a scene.

**Camera move.** An effect that moves the camera within a scene: `follow`, `impactShake`, `rackFocus`, `tilt`, `dollyZoom`.

**Background.** A picture, looping video, aurora, animated SVG file or own loop in the pinned layer, set by `section.ts` or `scene.ts`. A moving one runs on the wall clock, outside the timeline. Type `Background`.

**Scrim.** A dark (or light) layer over a background so text on it stays readable; `scrim: 0..1`, colour `--k-scrim`.

**Ken Burns.** A slow push into a background picture, once, from the first scene that shows it.

**Transition.** How the deck enters a section's canvas on a forward step: `fade` by default, or `cut`, `blackout`, `zoom`, `shatter`, `crt`, `push`, `iris`, `glitch`, `cube`, `pageTurn`, `magicMove`. Set in `section.ts`.

## Time and steps

**Step.** One press of the presenter's clicker: one list item in `scene.md`, one entry in a scene's `steps`. Addressed by `StepAddr` (index, canvas, section, scene, step number).

**Master timeline.** The one paused GSAP timeline per canvas that holds every step of every scene on it, in deck order.

**Label.** A timeline label `e:<index>` after each step. Playing a step plays the timeline from the previous label to this one; a cut seeks to it.

**Play, seek, cut.** A play runs the timeline forward from the last step to the next. A seek jumps the timeline to a label. A cut is a move that seeks (a deep link, a step back, a jump); only a forward step to the next step plays.

**Timeline rule.** Seek must equal play: a step reached by playing looks exactly like the same step reached by a jump. All DOM is made in `build`; a step only adds tweens. See [motion](reference/motion.md).

**Step function.** An entry of `steps` in `scene.ts`: `(tl, refs, ctx) => void`, adds the step's tweens. Type `StepFn`.

**Step adder.** A function an effect's handle returns for one step's motion: `(tl) => void`, called from a step function. Type `StepAdder`.

**Auto advance.** `auto` in `scene.ts`: seconds after a live play before the next step plays by itself.

**Autoplay.** The whole deck plays itself (`a`, or `?autoplay=1`), until a manual move.

**Deep link.** `#/<section>/<scene>/<step>`: opens the deck on that step, as a cut.

## Effects

**Effect.** Anything a deck calls from `klappe/fx`: `effect(ctx, opts)` builds hidden DOM and returns a handle. Documented in [effects.md](reference/effects.md) or on an element page.

**Element.** An effect with its own reference page in `reference/elements/` (code, flow, timer, ...). Called the same way as any effect; the split is by documentation, not by API.

**Handle.** What an effect returns: its DOM (`el` and named parts) and its step adders (`show`, `draw`, `next`, ...). Reach an effect's DOM only through its handle.

**Ctx.** The context `build` and effects get: the scene's `rect`, `svg` and `html` layers, `camera`, `files`, `doc`, `deck`, `onStep`, `problem`, `reducedMotion`. Type `Ctx`.

**Refs.** What `build` returns; the step functions get it as their second argument.

**Part.** A step that a Markdown form in `scene.md` turns into an effect: a code group, a console command, a task-list item, an agenda. Type `Part`.

**Default renderer.** What draws a scene with no `build`: its title, its steps as text, media in a right column, and parts as effects.

**Fence.** A scene's one code or console block in `scene.md`; its `{1-2|4}` groups become code parts.

**Shout-out.** `### Question?` in `scene.md`, with its answer as the next paragraph: three steps (the question, it fades, the answer).

**Catalog.** The demo deck's sections after the story, from `100-catalog` on: one scene per effect, the source the docs and the skill tell an author to copy.

## Look

**Theme.** A CSS file of `--k-*` tokens: `calm`, `bold`, `sorbet`, `lavender`, `daylight`, `forest`, `ink`, or a deck's own in `themes/`.

**Token.** A `--k-*` CSS custom property (`--k-bg`, `--k-accent`, `--k-line`, ...). Effects take every colour from a token. See [themes](reference/themes.md).

**Intensity.** `calm` or `bold` in `deck.md`: how loud shout-outs and some effects are.

**Safe area.** The margin of the stage that ink should stay out of; `safe-area` in `deck.md`. *See* Bleed.

**Bleed.** Ink that runs past the safe area on purpose, marked `data-k-bleed`.

**Reduced motion.** The viewer's system setting, or `?reducedmotion=1`: camera flights become cuts, decoration holds still. `?reducedmotion=0` overrides it.

## Checks

**Deck problem.** A mistake in the deck the engine found (a missing file, a step count that does not match, an effect that failed): shown in the on-screen list and failing the self-test. Raised with `ctx.problem`.

**Page error.** A JavaScript error the browser logged; it fails the self-test and `klappe pdf` and `klappe shot`.

**Warning.** A soft finding of the walk (ink outside the safe area, clipped text): reported, never failing.

**Self-test.** `?selftest=walk` plays and jumps to every step and compares snapshots (the timeline rule), checks text size and the safe area. `?selftest=ac` runs the acceptance checks. `klappe test` runs both in a browser. `&only=<section>[/<scene>]` walks those scenes alone; `&bail` stops at the first failing step.

**Snapshot.** The self-test's record of a canvas at one step: the camera pose and the inline state of every element. Elements under `data-k-ignore` are left out; `data-k-text` and `data-k-progress` mark DOM written from a tween's progress.

**Fixture.** A small deck in `src/deck/fixtures/`, built in code, that a test opens with `?fixture=<name>`.

**Design lint, timeline lint, docs lint.** Static tests in `tests/lint/`: the design rules, `from()` in deck code, every export documented, the demo covering every effect, the skill's catalogue table complete.

## Presenting

**Speaker view.** A second window (`n`) with the current step and its notes, the next step, and previous, next and timer buttons. The main window stays in charge; the two talk over a `BroadcastChannel` (`src/speaker/channel.ts`).

**Note.** A speaker note: a `> quote` under a step, a scene title or a section title.

**Overview** (`o`) and **selector** (`s`). Panels to see the deck's scenes as cards, and to jump to a section or scene.

## Tooling

**klappe CLI.** `bin/klappe.mjs`: `init`, `dev`, `build`, `test`, `pdf`, `shot`, `outline`.

**Shot.** `klappe shot`: PNGs of chosen steps at 1920x1080 and 1366x768, and with `--sheet`, a contact sheet per section of each scene's last step.

**Outline.** `klappe outline`: the deck as text, with step ids, notes and a timing estimate against `duration`.

**Skill.** `.claude/skills/klappe/`: what an agent reads before it writes a deck. `klappe init` and `npm run klappe:sync` copy it into a deck repo.

**Builder and reviewers.** The agents in `.claude/agents/`: `klappe-builder` builds one task; `klappe-review-content`, `klappe-review-look` and `klappe-review-tech` check it.

**Storyboard.** The plan for a whole deck before any code: one block per scene with its story point, motion idea and effects. See [building a deck](../.claude/skills/klappe/references/building-a-deck.md).
