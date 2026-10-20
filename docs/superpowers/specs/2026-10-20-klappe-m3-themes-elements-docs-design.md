# klappe M3: themes, training elements and reference docs, design

## Intent

klappe decks are for technical and process trainings, for trainings that explain complicated stories, and for expert talks on stage. The user does not want classic slide decks. They want sequences that support the talk: the presenter clicks, and the picture builds up, moves or changes in step with what they say.

M3 adds three things:

1. **Themes.** Colours and fonts become customizable, apart from content. A deck picks a theme by name in its frontmatter. No scene ever names a colour.
2. **Training elements:**
   - Code walkthrough, terminal replay, flow diagram and sequence diagram, for technical trainings.
   - Swimlanes, decision tree, checklist, agenda with timeslots and timers, for process trainings.
   - Callouts, for both.
3. **Reference documentation in Markdown.** People and agents read the same docs.

## Goals

- Swapping `theme: calm` for `theme: house` in `deck.md` recolours every scene, effect and element. No scene file changes.
- A deck repo can define its own theme, either for one deck or shared by all decks in that repo.
- Every new element plays step by step on the canvas timeline, and seek equals play (one exception: timers, see below).
- Plain cases need only Markdown: code, terminal, checklist and agenda. Diagrams use `scene.ts` with data.
- The demo deck uses every supported effect and element at least once, and a test enforces it.
- One Markdown reference covers every feature: the deck format, themes, each effect and element, and its options, each with a small example. An agent working in a deck repo finds it through a `klappe` skill.

## Non-goals

- Audience participation: polls, phones, live answers.
- Hotspots and detours, spotlight, zoom-into-box, cause-and-effect chains, kinetic type. These were discussed and left out by the user.
- Automatic graph layout for flow diagrams. Authors place nodes on a grid.
- Mermaid or PlantUML syntax support.
- A theme editor or theme preview UI.
- The single-file build, PDF export and offline fonts. These remain open M3 items for a later spec.

## Anti-goals

- A colour literal in any effect or element. Any colour other than a pure shadow or light layer is a token.
- A theme that silently makes text unreadable. Contrast is checked.
- Docs that drift from the code. A test catches an export with no documentation.
- An element that breaks "seek equals play", except the timer's documented wall-clock behaviour.

## Hard rules (carried over)

The M1 and M2 rules still hold: one GSAP timeline per canvas, DOM and SVG exist at load, back means a cut, effects are imported through `klappe/fx` and never reach into engine internals, and the self-test walk (play equals seek, legibility at 1366×768, in-frame) passes on every gallery scene. The design rules apply: no cream or off-white, no italic headline accents, no "01/02" labels, no pill buttons, no monospace labels.

## 1. Themes

### What a theme is

A theme is a plain CSS file that sets `--k-*` custom properties on `:root`. It holds no selectors other than `:root`. The token names are the contract and are documented in `docs/reference/themes.md`.

Token set (extends today's five):

| Token | Use |
| --- | --- |
| `--k-bg`, `--k-fg` | page background, main text |
| `--k-muted` | secondary text, captions, axis labels |
| `--k-surface` | box and panel fill (cards, lanes, code panel) |
| `--k-line` | strokes, borders, arrows, grid |
| `--k-accent`, `--k-accent-2` | emphasis; the current item; second emphasis |
| `--k-ok`, `--k-warn`, `--k-bad` | done, time running out, failure; also the problems overlay |
| `--k-series-1` … `--k-series-6` | chart series, diagram participant colours |
| `--k-font`, `--k-font-code` | text font; code and terminal font |
| `--k-code-*` | syntax colours, mapped from Shiki's `css-variables` theme |
| `--k-phosphor`, `--k-phosphor-amber`, `--k-blackout` | CRT and blackout, as today |

A theme may set any subset. Missing tokens fall back to the built-in `calm` values, because `calm.css` always loads first and the chosen theme loads after it.

### Where themes live and how one is chosen

`deck.md` frontmatter: `theme: <name>`. The name is resolved in this order:

1. `decks/<id>/themes/<name>.css`: for this deck only.
2. `themes/<name>.css` at the deck repo root: shared by every deck in the repo.
3. `klappe/src/themes/<name>.css`: built-in. klappe ships `calm` (today's navy palette) and `bold` (a distinct, lively palette for trainings).

An unknown name records a deck problem and falls back to `calm`. `DeckMeta.theme` becomes `string`. `intensity` keeps its own setting. Its default stays `bold` when the theme is `bold` and is `calm` otherwise.

Loading: Vite globs the three folders with `?inline`, and the runtime injects the matching CSS as a `<style>` element after `styles.css`. A new `@themes` alias points at `<deck repo>/themes`.

### Checks

- A unit test checks every built-in theme: `--k-fg` and `--k-muted` on `--k-bg` and on `--k-surface` reach 4.5:1, and `--k-accent` on `--k-bg` reaches 3:1.
- At load, the same check runs on the resolved theme of the deck and records a deck problem when it fails, so a custom theme with poor contrast fails `klappe test`.
- The design lint runs on theme files: no cream backgrounds.
- `styles.css` loses its colour values. The `:root` block moves to `themes/calm.css`, and the problems overlay uses `--k-bad` (this closes a backlog item).
- The lint also flags hex, `rgb()` and `hsl()` literals in `src/fx/**` outside a short allow-list (shadow and light layers in `crt.ts`, letterbox black in `media.ts`). That keeps the "no colour literal" anti-goal true.

## 2. Training elements

Each element is one file in `src/fx/`, exported from `klappe/fx`, following the M2 pattern: a `build(ctx, opts)` call that creates everything hidden at load and returns a handle whose step adders put tweens on `tl`. Elements with a Markdown trigger are also built by the engine from `scene.md`, the same way chart and image links are today.

### Code walkthrough (`code`)

- **Markdown:** a fenced block with a language in `scene.md`. The info string may carry highlight groups in the reveal.js and Slidev convention: ` ```ts {1-2|4-6|8} `. Each group is one step that highlights those lines and dims the others. The list items after the block are the steps' text, matched in order.
- **scene.ts:** `code(ctx, { src, lang, x, y, w })` returns `{ show, focus(lines), diff(newSrc), line(n) }`. `focus` is one step's highlight. `diff` morphs old code into new: removed lines fade and collapse, added lines grow in, and unchanged lines slide to their new place. `line(n)` is the target for a callout.
- **Highlighting:** Shiki, with the JavaScript regex engine, a fine-grained bundle and the `css-variables` theme, so colours come from `--k-code-*`. Bundled languages: ts, js, python, bash, json, yaml, sql, html, css. Highlighting runs at build time in the browser on load, synchronously after Shiki's one-time async init, which the loader awaits.
- Font: `--k-font-code`. The panel is `.k-code`, and the lint allows monospace under `.k-code` and `.k-term`, because code is not a label.

### Terminal replay (`terminal`)

- **Markdown:** a ` ```console ` fenced block. Lines starting with `$ ` are commands. Each command and its output lines form one step: the command types itself, then the output appears line by line.
- Typing uses the M2 `onUpdate`-from-progress rule (the same as CRT typing), so a deep link shows the finished text.
- A plain dark panel with a prompt in `--k-accent`, with no CRT scanlines or glow.

### Flow diagram (`flow`)

- **scene.ts only:** `flow(ctx, { nodes: [{ id, label, col, row, icon? }], edges: [{ from, to, label? }], grid: { x, y, w, h, cols, rows } })`.
- Nodes are boxes in `--k-surface` with a `--k-line` border. Edges are orthogonal SVG paths with arrowheads.
- Handle steps: `show(ids)` (nodes and edges draw on with `drawOn`), `highlight(ids)`, and `send({ path: [ids], count?, label? })`. `send` makes packets travel along the edges of the path with MotionPathPlugin, driven by progress, and they wait at each node for a beat.

### Sequence diagram (`sequence`)

- **scene.ts only:** `sequence(ctx, { actors: [{ id, label }], messages: [{ from, to, text, reply? }], x, y, w, h })`.
- Lifelines come in on the first step. Each message is one step: the arrow draws from sender to receiver and its label fades in. Replies are dashed. Actors take `--k-series-n` colours.
- The handle has `actors` (lifelines in) and `message(i)`. A step function that calls `message` twice merges two messages into one step.

### Swimlanes (`swimlanes`)

- **scene.ts only:** `swimlanes(ctx, { lanes: [{ id, label }], tasks: [{ id, lane, col, label }], links: [{ from, to }] })`.
- Lanes are horizontal bands with their label on the left. Tasks are boxes, and links are arrows, including links across lanes.
- `walk(taskId)` moves a token to that task, one call per step. The active lane brightens and the others dim.

### Decision tree (`decisionTree`)

- **scene.ts only:** `decisionTree(ctx, { root: { label, children: [{ edge: "yes", node: {…} }] }, x, y, w, h })`, laid out with `d3.tree` from the installed d3.
- The whole tree draws on as one step, or level by level with `{ build: "levels" }`. `path(["yes","no"])` lights the route up to its last edge and dims the rest; a step that passes a longer route extends it by one edge.

### Checklist (`checklist`)

- **Markdown:** GitHub task-list items, `- [ ] Backup verified`. Each item is one step: its box ticks with a stroke draw-on in `--k-ok`, and its text brightens. An item written `- [x]` starts already ticked.
- **scene.ts:** `checklist(ctx, { items, x, y, w })` with a `tick(i)` step adder.

### Agenda with timeslots (`agenda`)

- **Markdown:** list items that start with a time range, `- 09:00–09:45 Basics`. The design lint already allows times. A scene with only such items becomes an agenda: times sit in a column on the left and titles on the right.
- A "you are here" marker: `scene.ts` sets `{ current: "Basics" }`, or the scene's list marks it with `- 09:00–09:45 Basics ←`. The current row takes `--k-accent`, past rows take `--k-muted`, and the marker slides to the current row as the scene's first step.
- To show the agenda again between sections, the author copies the agenda scene into each place with a different current item. Sharing one agenda source is out of scope.

### Timers (`timer`)

- **scene.ts:** `timer(ctx, { minutes, style: "bar" | "donut" | "ring" | "text", x, y, size, label? })`.
  - `bar`: a horizontal bar that empties.
  - `donut`: a thick arc that empties.
  - `ring`: a thin circle outline that empties, with mm:ss in its centre.
  - `text`: large mm:ss only.
  - All styles show mm:ss except a bare `bar`, which shows it under the bar.
- **Wall clock:** a training timer counts real minutes, not timeline time. In the last 20% it turns `--k-warn`, and at zero it shows `--k-bad` and the label "Time's up" (from `strings.ts`).
- **Lifecycle:** the timer appears and starts when its step plays. It keeps running through the later steps of the same scene, so checklist items can tick while an exercise runs, and it stops and resets when the camera leaves the scene. Back within the scene is a cut and does not touch the timer.
- **Start and pause:** a new input action `timer` on the `t` key (currently unused), plus a click on the timer, starts or pauses the timer of the current scene. It is not a step: the stepper and timeline are untouched, and the action is a no-op when the scene has no timer. A deep link or cut onto the timer's step shows it full and paused with a "Press T to start" hint from `strings.ts`. The speaker view gets the same action.
- The self-test snapshot leaves timer text out, as it does for video.

### Callouts (`callout`)

- **scene.ts:** `callout(ctx, { target: Element | {x,y}, text, side: "left"|"right"|"top"|"bottom", offset? })`. A leader line draws from the target point to a label box, then the text fades in.
- It works on top of any element: code lines (`code.line(n)`), diagram nodes (`flow.node(id)`), chart bars and line art.

### Tweens (resize, rotate, move with easing)

There is no new helper. GSAP, which is already installed, does this in one call: `tl.to(el, { x, y, rotation, scale, width, ease: "power2.inOut" })`. A wrapper would only rename its options. The reference documents the GSAP calls and the ease names, and a gallery scene shows resize, rotate and move with three eases side by side.

### Library decisions

- **Shiki** is approved by the user (2026-10-20) and is recorded in `DECISIONS.md`. It uses the JavaScript engine, not WASM, and imports only the listed languages. Its size cost is measured in the build and recorded in `docs/perf-m2.md`'s M3 successor.
- **Mermaid** is rejected. It renders static SVG with layout that shifts between versions, so step-wise animation would chase its internal DOM, and it is large.
- **elkjs and dagre** are rejected. Authors place nodes on a grid. That is predictable and easy to read for both humans and agents.
- **d3-hierarchy** is already installed, inside d3. It lays out the decision tree.

## 3. Reference documentation

### Layout

```
docs/reference/
  index.md          what klappe is, a 5-minute start, and a map of the files below
  deck-format.md    folders, deck.md, section.md/.ts, scene.md/.ts, keys, URL flags, deep links
                    (moved out of README; README keeps install/update and links here)
  themes.md         token table, resolution order, a full example theme, the contrast rules
  markdown.md       every Markdown trigger in one table, with a minimal example each
  effects.md        M2 effects: shatter, crt, drawOn/lineArt, icons, chart, worldMap, figure,
                    swarm, morph, bubble, counter, media, transitions, zoom
  elements/<name>.md  one file per M3 element (code, terminal, flow, sequence, swimlanes,
                    decisionTree, checklist, agenda, timer, callout), so parallel builders never share a file
  motion.md         the timeline rule (seek equals play), step functions, GSAP tweens and eases
```

Each entry follows one shape: what it is for (one sentence), the smallest working example (Markdown or `scene.ts`), an options table (name, type, default, meaning), the step adders it returns, and its limits. Every entry names its gallery section, so a reader can see the element working.

### For agents

- A `klappe` skill at `.claude/skills/klappe/SKILL.md`. The existing `sync-claude` already copies it into deck repos. It is short: when to use which element, the timeline rule, the design rules, and pointers to `klappe/docs/reference/*.md`. It does not duplicate the reference.
- The builder and reviewer agent definitions in `.claude/agents/` point to the reference instead of re-explaining the API.

### Keeping it true

- A lint test: every name exported from `src/fx/index.ts` appears as a heading in a file under `docs/reference/`.
- A lint test: every `--k-*` token used in `src/` appears in `themes.md`.
- Code examples in the reference are copied from gallery scenes, which the self-test runs, rather than written separately.

## 4. Gallery and tests

- Each element gets a gallery section (numbered after `130-fullscreen`): one scene per Markdown form and one per `scene.ts` form, captioned like M2.
- Themes: a `?theme=<name>` URL flag overrides the frontmatter theme. The self-test walk runs the gallery once, under its own theme (`calm`). A separate e2e test loads a small fixture of representative scenes (text, chart, code, flow, timer) under `bold` and under a custom theme kept in a fixture `themes/` folder. It checks that the tokens resolve, that the contrast check passes and that play equals seek. The look reviewer pages through the whole gallery with `?theme=bold` and judges it from screenshots. That walk is manual, not in CI.
### Demo deck shows every effect (user decision)

The gallery is the catalogue: one captioned scene per effect. The demo deck is the story, and after M3 it must use every supported effect and element at least once, in context.

- **New sections**, placed after `50-numbers`, that tell one small training story with sample content:
  - A **technical training**: the agenda with "you are here", a code walkthrough with a diff, a terminal replay, a flow diagram with packets, a sequence diagram, and callouts on the code and the flow.
  - A **process training**: swimlanes with a walking token, a decision tree path, then an exercise scene with a checklist and a running timer.
- **Gaps from M2:** the builder audits which M2 effects the demo does not yet use (today it uses no `lineArt` and no video, and only some transitions) and adds them where the story allows. A video scene uses a local sample file or a clearly labelled placeholder, not a live URL.
- **Coverage test:** a lint test lists every effect and element exported from `src/fx/index.ts` (minus engine-internal helpers on an explicit allow-list), plus every transition kind, and fails when one is missing from `decks/demo`. The demo now enforces "all effects shown".
- **Content rules:** sample data is labelled "Sample data", code samples are generic (no internal company references, as in the latest commits), each scene carries one message, and the content reviewer checks this.
- The demo runs under `calm`. The look reviewer also pages through it with `?theme=bold`.

### Tests

- **Unit tests:**
  - Markdown detection: code fence with groups, console fence, task list and agenda rows.
  - Highlight-group parsing and the line-diff algorithm.
  - Agenda time parsing.
  - Decision-tree layout and path selection.
  - Theme resolution order, the unknown-theme fallback and the contrast check.
  - Timer state: from start time and now, to remaining, phase and text.
- **E2E fixtures (`?fixture=fx-…`):** one per element. A timer fixture uses a fake clock.
- The self-test walk covers all gallery scenes at 1920, 1366 and 1024.

## 5. Order of work

1. Themes: token set, `calm.css` and `bold.css`, resolution and loading, the contrast check, lint updates, and the problems overlay on tokens. Everything after this uses the new tokens.
2. Reference doc skeleton: move the deck format out of the README, `themes.md`, `motion.md` (tweens), and the docs lint tests.
3. Markdown plumbing: `blocks()` gains a `fence` block; scene parsing yields code, console, checklist and agenda step kinds.
4. Code walkthrough with Shiki, and terminal replay.
5. Callouts. Code and flow reuse them.
6. Flow diagram and sequence diagram.
7. Swimlanes and decision tree.
8. Checklist and agenda.
9. Timers.
10. Demo deck: the training sections, the M2 gaps, and the coverage test.
11. The `klappe` skill and agent pointers. Final docs pass: every entry has an example taken from the gallery.

Each element task updates its own reference entry and gallery section. Docs are not saved for the end.

## Left to the builder

- Exact timings, eases, sizes and spacing. Start from M2's `motion.step` and the existing gallery look.
- The `bold` palette, within the design rules and contrast checks. The look reviewer judges it.
- The internal file split inside `src/fx/`, and how the Markdown-triggered elements share layout with the plain-Markdown text column.
