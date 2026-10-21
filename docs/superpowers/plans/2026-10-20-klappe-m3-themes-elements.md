# klappe M3: themes, training elements and reference docs, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with the M2 build loop: an orchestrator, one `klappe-builder` per task, and the three reviewers (`klappe-review-tech`, `klappe-review-look`, `klappe-review-content`). Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Waves:**
>
> - **Wave 0** runs Tasks 1 and 2 one after the other. They own every shared file.
> - **Wave 1** runs Tasks 3 to 11 in parallel, each in its own git worktree, touching only its own files.
> - **Wave 2** runs Tasks 12 and 13 in parallel.
> - **Task 14** closes the milestone.

**Goal:** themes as swappable CSS token files, ten training elements that play step by step, a Markdown reference for people and agents, and a demo deck that uses every effect.

**Architecture:**

- **Themes.** A theme is a `:root { --k-*: … }` CSS file. The loader collects built-in, repo and deck themes into `deck.themes`. `main.ts` injects `calm` and then the chosen theme as `<style>` elements before rendering.
- **Elements.** Each element is one file in `src/fx/`, with the M2 helper shape: build hidden at load, and return step adders.
- **Markdown triggers.** Code fences, console fences, task lists and agenda rows are parsed into `StepDoc.part` and rendered by the default renderer, which calls the element helpers.
- **Seams.** Wave 0 lays down all shared seams: stubs, parse output, renderer calls, input action, ctx fields, the docs lint and the dependencies. Wave 1 builders never edit a shared file.

**Tech stack:**

- Vite, TS, GSAP 3.15 with MotionPathPlugin.
- d3, of which `d3.tree` lays out the decision tree.
- Shiki (new, approved): `shiki/core` with the JavaScript regex engine and the `css-variables` theme.
- Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-20-klappe-m3-themes-elements-docs-design.md`. The M1 and M2 designs and their hard rules still apply.

## Global Constraints

- **Timeline rule (M2, verbatim).** One GSAP timeline per canvas. DOM and SVG exist at load. Step functions only add tweens. No `.from()`; use `fromTo`. `onUpdate` may write DOM only as a pure function of `this.progress()`. `onComplete` and `.call()` must not change state.
- **The one exception is the timer.** It is wall-clock, and its root carries `data-k-ignore` so the snapshot skips it.
- **Self-test.** The walk (play equals seek, ≥ 14 px at 1366, in frame) passes for every fixture, gallery and demo scene at 1920×1080, 1366×768 and 1024×768.
- **Design rules.** No cream or off-white, no italic accent words in headlines, no "01/02" labels, no pill buttons, no monospace labels. Monospace is allowed only under `.k-retro`, `.k-code` and `.k-term`.
- **Colours.** In `src/fx/**`, every colour is a `var(--k-*)` token. The only literals allowed are shadow and light layers in `crt.ts` and the letterbox `#000` in `media.ts`.
- **Libraries.** gsap with its plugins, d3, world-atlas, topojson-client, lucide, and shiki. Nothing else. Shiki is installed in Task 2 only.
- **Content.** No invented facts. Sample data shows "Sample data". Code samples are generic, with no company references.
- **Fixtures.** Content-dependent tests use `?fixture=` in-code decks, so `klappe test` stays green in deck repos.
- **Own files only.** A Wave 1 or Wave 2 builder edits only the files listed in its task. A builder that needs a shared change stops and reports it.
- **Docs travel with code.** Every element task writes its own reference entry and gallery section in the same commit.

## Review Focus

1. **A custom theme sets only some tokens, or sets a colour that fails contrast.** Missing tokens must fall back to `calm`. Poor contrast must show as a deck problem, not ship silently. _(Task 1: `theme-partial` and `theme-lowcontrast` fixtures.)_
2. **A deep link lands mid-walkthrough: on code group 3, or on terminal command 2.** The screen must equal the played state: the right lines focused and earlier commands fully typed. _(Tasks 3 and 4: fixture walk plus a targeted e2e on the deep link.)_
3. **The timer meets real presenter behaviour:** leaving the scene while it runs, coming back, a deep link onto it, `t` on a scene with no timer, and autoplay passing over it. _(Task 11: a fake-clock e2e for each case.)_
4. **Content too big for its frame:** a 40-line code block, or a long label in a flow node or swimlane task. It must shrink to the legibility floor and then report a problem. It must never spill out of the frame. _(Tasks 3, 6 and 8: an oversize scene in each fixture.)_
5. **The Markdown does not match its parts:** more highlight groups than list items or the reverse, an unknown fence language, a console block with no `$` line, or a time-range list mixed with plain items. _(Task 2: parser unit tests.)_

---

## Wave 0, sequential

### Task 1: Themes

**Files:**
- Create: `src/themes/calm.css`, `src/themes/bold.css`, `src/deck/fixtures/theme-partial.ts`, `src/deck/fixtures/theme-lowcontrast.ts`, `src/deck/fixtures/theme-bold.ts`, `tests/unit/theme.test.ts`, `tests/e2e/theme.e2e.test.ts`, `docs/reference/themes.md`
- Modify: `src/theme.ts`, `src/styles.css`, `src/types.ts` (`DeckMeta.theme: string`, `Deck.themes?: Record<string, string>`), `src/parse/frontmatter.ts:48-49`, `src/deck/load.ts`, `src/main.ts`, `vite.config.ts` (`@themes` alias → `<cwd>/themes`), `tests/lint/design.test.ts`, `tests/unit/frontmatter.test.ts`, `DECISIONS.md`

**Interfaces:**
- Produces:
  - `parseTokens(css: string): Record<string, string>`: the `--k-*` declarations of the `:root` block.
  - `contrast(a: string, b: string): number`: the WCAG ratio for `#rgb`, `#rrggbb` or `rgb()` input.
  - `resolveTheme(name: string, themes: Record<string, string>): { css: string; problem?: string }`. Keys are `deck:<name>`, `repo:<name>` and `builtin:<name>`, checked in that order. An unknown name returns calm's CSS and the problem `theme "<name>" not found; using calm`.
  - `applyTheme(deck: Deck, override?: string | null): string[]`: injects `<style data-k-theme>` for calm, then the chosen theme, then measures `--k-fg`, `--k-muted`, `--k-accent` on `--k-bg` and `--k-surface` through a probe element, and returns problems.
  - The token set from spec §1, all defined in `calm.css`.

- [ ] **Step 1: Write the failing unit tests** in `tests/unit/theme.test.ts`:
  - `parseTokens` returns `{"--k-bg": "#0f1b2d", …}` for calm.
  - `contrast("#000", "#fff")` is 21 within 0.01.
  - `resolveTheme("house", { "repo:house": A, "deck:house": B })` returns `B`.
  - `resolveTheme("nope", {...})` returns calm with the problem text above.
  - For each built-in theme, `--k-fg` and `--k-muted` on both `--k-bg` and `--k-surface` are ≥ 4.5, and `--k-accent` on `--k-bg` is ≥ 3.
  - Every token in calm also appears in bold.

  In `frontmatter.test.ts`: `theme: house` gives `meta.theme === "house"` and intensity `calm`, and `theme: bold` gives intensity `bold`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/theme.test.ts tests/unit/frontmatter.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Move the `:root` block from `styles.css` into `calm.css` and extend it to the full token set. Point the problems overlay (`styles.css:98-99`) at `--k-bad`.
  - Design `bold.css`: a lively palette within the design rules and contrast floors, judged by the look reviewer.
  - In `load.ts`, glob `../themes/*.css`, `@themes/*.css` and `@deck/themes/*.css` with `?inline`, and fill `deck.themes`. Fixtures set `themes` directly.
  - In `main.ts`, call `applyTheme(deck, query.get("theme"))` before `renderWorld` and push its problems.
- [ ] **Step 4: Lint.** Allow monospace under `.k-code` and `.k-term`. Scan `.css` under `decks/**/themes/` and `themes/`. Add the rule `colour-literal`: hex, `rgb(` or `hsl(` in `src/fx/**/*.ts`, except `crt.ts` and `media.ts`. Each rule gets a positive and a negative case in the `describe('design lint catches each rule')` table.
- [ ] **Step 5: e2e** in `theme.e2e.test.ts`:
  - `theme-partial` sets only `--k-accent`. The walk is `ok`, and `--k-bg` computes to calm's value.
  - `theme-lowcontrast` reports the problem `theme: --k-fg on --k-bg contrast 1.6 < 4.5` (the shape that matters; the exact ratio comes from the fixture's colours).
  - `theme-bold` walks green at the three widths.
  - `?theme=bold` on `two-scenes` sets bold's `--k-bg`.
- [ ] **Step 6: Run** `npm test` and `npx tsc --noEmit`. Expected: all green, and the existing walks unchanged under calm.
- [ ] **Step 7: Docs.** Write `docs/reference/themes.md`: the token table, the resolution order, a complete example theme, the contrast rules and `?theme=`. Add a DECISIONS entry: "Themes are CSS token files; Shiki approved 2026-10-20".
- [ ] **Step 8: Commit** with the message `feat(theme): CSS token themes with deck, repo and built-in resolution`.

### Task 2: Seams for the elements

**Files:**
- Create: stubs `src/fx/{code,terminal,callout,flow,sequence,swimlanes,tree,checklist,agenda,timer}.ts`, `tests/unit/parse-parts.test.ts`, `tests/lint/docs.test.ts`, `docs/reference/index.md`, `docs/reference/deck-format.md`
- Modify: `package.json` and the lock file (`npm i shiki`), `src/fx/index.ts`, `src/types.ts`, `src/parse/blocks.ts`, `src/parse/scene.ts`, `src/render/world.ts`, `src/input.ts`, `src/main.ts`, `src/speaker/channel.ts`, `src/speaker/view.ts`, `src/strings.ts`, `README.md` (the deck format moves to the reference and the README links there)

**Interfaces:**
- Produces, in `src/types.ts`:
  ```ts
  type Part =
    | { kind: "code"; group: number }          // index into SceneDoc.fence.groups
    | { kind: "console"; command: number }     // index of the "$ " line among commands
    | { kind: "check"; done: boolean }
    | { kind: "agenda"; rows: { from: string; to: string; title: string; current: boolean }[] };
  StepDoc.part?: Part
  SceneDoc.fence?: { lang: string; src: string; groups: number[][] }  // groups: line lists, 1-based
  Ctx.scene?: string                     // the scene id, on scene ctx only
  onStep event gains scene: string | null  // the current step's scene id
  Action gains "timer"; key "t"; Msg cmd gains "timer"
  ```
- Produces: the stub signatures (Wave 1 fills their bodies, signatures fixed here; every stub throws `"<name>: not built yet"`):
  ```ts
  code(ctx, { src, lang, x, y, w, h? }): { show; focus(lines: number[]); diff(src: string); line(n: number): Element }
  terminal(ctx, { lines: string[]; x; y; w; h; prompt?: string }): { show; run(command: number) }
  callout(ctx, { target: Element | { x; y }; text; side: "left"|"right"|"top"|"bottom"; offset?: number }): { show }
  flow(ctx, { nodes: { id; label; col; row; icon? }[]; edges: { from; to; label? }[]; grid: Rect & { cols; rows } }):
    { show(ids?: string[]); highlight(ids: string[]); send(o: { path: string[]; count?: number; label?: string }); node(id): Element }
  sequence(ctx, { actors: { id; label }[]; messages: { from; to; text; reply?: boolean }[] } & Rect): { actors; message(i: number) }
  swimlanes(ctx, { lanes: { id; label }[]; tasks: { id; lane; col; label }[]; links: { from; to }[] } & Rect): { show; walk(taskId: string) }
  decisionTree(ctx, { root: TreeNode } & Rect & { build?: "all" | "levels" }): { show; level(k: number); path(edges: string[]) }
    // TreeNode = { label: string; children?: { edge: string; node: TreeNode }[] }
  checklist(ctx, { items: { text; done?: boolean }[]; x; y; w }): { show; tick(i: number) }
  agenda(ctx, { rows: Part-agenda rows; x; y; w; current?: string }): { show }
  timer(ctx, { minutes: number; style: "bar"|"donut"|"ring"|"text"; x; y; size: number; label?: string }): { show }
  loadHighlighter(): Promise<void>   // in code.ts; main.ts awaits it before renderWorld
  parseGroups(info: string): number[][]  // in code.ts, implemented for real here (not a stub): "1-2|4" → [[1,2],[4]]
  ```
  Every method above except `line` and `node` returns a `StepAdder`.

- [ ] **Step 1: Write the failing parser tests** in `parse-parts.test.ts`:
  - A ` ```ts {1-2|4} ` fence followed by two items gives `fence.groups == [[1,2],[4]]` and two steps with `part.kind "code"`, groups 0 and 1, and the items' text.
  - Three groups and one item: the extra group steps have text `""`.
  - One group and three items: the extra items become plain steps.
  - A fence without groups gives one code step with `groups [[]]`, meaning no focus.
  - A ` ```console ` fence with `$ a`, `out`, `$ b` gives two console steps, commands 0 and 1. A console fence with no `$` line gives the problem `<folder>/scene.md: console block has no "$ " command`.
  - A second fence in one scene gives the problem `one code or console block per scene`.
  - `- [ ] a` and `- [x] b` give check parts with `done` false and true, with the text stripped of the box.
  - All items `09:00–09:45 Basics` style (`–` or `-`, with `←` marking current) give one step with an agenda part and three rows. A mix of time and plain items stays plain steps.
  - An unknown fence language (`cobol`) parses, and the renderer reports `language "cobol" not bundled; shown plain`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/parse-parts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `blocks()` emits `{ type: "fence", text: content, info }` for `fence` tokens at level 0.
  - `parseScene` fills `fence` and `part`, using the regexes `^\{([\d,\- |]+)\}$` for the groups and `^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s+(.+?)\s*(←)?$` for agenda rows.
- [ ] **Step 4: Renderer seams** in `renderDefault`, each inside `safe()` with the existing EFFECT MISSING fallback:
  - A scene with `fence` puts its code or terminal in the right-hand slot (the media slot rect). Code steps call `focus(groups[g])`; the first one also calls `show`. Console steps call `run(k)`.
  - Check steps render through one `checklist` built from all check items. Step n calls `tick(i)`, and the first check step also calls `show`.
  - An agenda step calls `agenda(...).show`.
- [ ] **Step 5: Timer seam.** Map the `t` key to the `timer` action, which dispatches `document.dispatchEvent(new CustomEvent("klappe:timer"))` from `main.ts`. A speaker `cmd: "timer"` does the same, and the speaker view gets a timer button. Pass `ctx.scene` into scene ctx, and add `scene` to the `onStep` event. Add `strings`: `timesUp: "Time's up"` and `pressT: "Press T to start"`.
- [ ] **Step 6: Docs lint** in `tests/lint/docs.test.ts`:
  - Every name exported from `src/fx/index.ts` appears as a `#`-heading (as `` `name` `` or `name`) in some file under `docs/reference/`.
  - Every `--k-[\w-]+` token used in `src/` appears in `themes.md`.

  Stubs fail this until their task lands, so the test reads an allow-list `PENDING = [...]` at its top. Each Wave 1 task removes its own names from that list; it is the one shared line Wave 1 may touch, and conflicts there are trivial.
- [ ] **Step 7: Docs.** Move README "Deck format" through "Deep links" into `docs/reference/deck-format.md`, and add the four new Markdown forms. Write `index.md` as the map of the reference. The README keeps setup and update and links to the reference.
- [ ] **Step 8: Run** `npm test` and `npx tsc --noEmit`. Expected: green. A fixture with a code fence shows EFFECT MISSING and a problem while the stub throws.
- [ ] **Step 9: Commit** with the message `feat(fx): seams for M3 elements, Markdown parts, timer action, docs lint`.

---

## Wave 1, all in parallel (one worktree per task)

### Shared rules for every Wave 1 task

- **Own files only:** `src/fx/<own>.ts`, `tests/unit/fx-<own>.test.ts`, `src/deck/fixtures/fx-<own>.ts`, `tests/e2e/fx-<own>.e2e.test.ts`, `decks/gallery/sections/<NNN>-<own>/**`, `docs/reference/elements/<own>.md`, plus the own names in `PENDING` in `tests/lint/docs.test.ts`.
- **Gallery numbers:**

  | Number | Task |
  | --- | --- |
  | 140 | code |
  | 150 | terminal |
  | 160 | callout |
  | 170 | flow |
  | 180 | sequence |
  | 190 | swimlanes |
  | 200 | tree |
  | 210 | checklist and agenda |
  | 220 | timer |

  Use the `captioned()` pattern from `decks/gallery/caption.ts`.
- **Fixture:** every handle method and option, one scene per variant, and the oversize case where it applies.
- **e2e:** `runSelftest(BASE_URL + '/?selftest=walk&fixture=fx-<own>', vp)` at the three widths gives `ok`, no errors, and only the problems the fixture means to cause.
- **Reference entry:** the shape from spec §3 (purpose, smallest example copied from the gallery scene, options table, step adders, limits, gallery section).
- **Screenshots** for the look reviewer go to `<scratchpad>/m3-<own>/`: every fixture step at 1920, and the key steps at 1366.
- **Done means:** `npm test` and `npx tsc --noEmit` are green, the commit `feat(fx): <own>` is made, and the report lists the screenshot paths.

### Task 3: Code walkthrough (`code.ts`)

- `loadHighlighter()` uses `createHighlighterCore` with `createJavaScriptRegexEngine()`, the langs ts, js, python, bash, json, yaml, sql, html and css, and `createCssVariablesTheme({ name: "klappe", variablePrefix: "--k-code-" })`. Check the import paths against the installed Shiki version.
- `code()` renders `<pre class="k-code">` with one `<div data-line=n>` per line, in `--k-font-code` on `--k-surface`.
  - Font size: start at 30 px. If the lines exceed `h`, shrink, but never below 20 px scene units, the 14 px floor at 1366. Past that, report the problem `code: N lines do not fit; max M` and clip.
  - `focus(lines)`: the listed lines go to full opacity and an `--k-accent` left bar, and the others go to 0.35. An empty list unfocuses everything.
- `diff(src)`: a line diff using an LCS over lines, which is the algorithm the tests pin. Removed lines go to height 0 and alpha 0, added lines go from height 0 to full, and kept lines move to their new index. All three are tweens from build-time measured positions.
- **Unit tests:**
  - `lineDiff(["a","b","c"], ["a","c","d"])` is `[{keep:0→0},{del:1},{keep:2→1},{add:2}]`.
  - `parseGroups` comes from Task 2 already; leave it as it is.
- **e2e:** besides the walk, a deep link to `#…/3` on a three-group scene equals the played step 3, judged by computed opacity of every line. A 40-line scene reports exactly the oversize problem.

### Task 4: Terminal replay (`terminal.ts`)

- A `.k-term` panel with no CRT effects. The prompt glyph is in `--k-accent`.
- `run(k)` types command k character by character in an `onUpdate` driven by progress, on a `data-k-text` element, then fades in its output lines, 0.08 s apart.
- **Unit test:** `splitConsole(lines)` returns `[{ cmd, out: [] }]` and ignores leading output before the first `$` (the parser already reports that case).
- **e2e:** a deep link onto command 2 shows command 1 and its output complete, and command 2 complete.

### Task 5: Callouts (`callout.ts`)

- The target point is the target element's bounding box edge on `side`, in scene coordinates. Measure it at build time through `getBBox` or `getBoundingClientRect` divided by the camera scale, the way M2 effects do.
- The leader line is SVG in `--k-line`, drawn on with `drawOn`. The label box is HTML in `--k-surface`, and its text fades in.
- **Unit test:** `anchor(box, side, offset)` returns the label position for each side.
- **Fixture:** one callout on a code line, one on a flow node built inside the fixture, and one on a point. The walk checks that callouts stay in frame.

### Task 6: Flow diagram (`flow.ts`)

- The grid maps `col` and `row` to cell centres, and nodes fill 70% of a cell.
- Edges are orthogonal: horizontal out, vertical, horizontal in, or a straight line when on the same row or column. They are SVG paths with a marker arrowhead.
- `send`: `count` dots, 0.25 s apart, travel each edge of `path` with MotionPathPlugin, wait 0.3 s at each node, and the node pulses `--k-accent`.
- Labels wrap. A label that needs more than 3 lines at the floor size reports `flow: label of "<id>" too long`.
- **Unit tests:** `edgePath(a, b)` for the same row, the same column and a diagonal case. An unknown node id in `edges` throws `flow: unknown node "<id>"`.

### Task 7: Sequence diagram (`sequence.ts`)

- Actors are evenly spaced across `w`, with heads coloured `--k-series-n` and dashed lifelines.
- `message(i)`: the arrow draws from the sender's lifeline to the receiver's at row i, then the label fades in above it. Replies are dashed. A self-message is a loop on its own lifeline.
- **Unit test:** `rowY(i, n, rect)` spaces rows evenly. A 12-message scene stays in frame.

### Task 8: Swimlanes (`swimlanes.ts`)

- Lanes split `h` equally, with the label column 15% wide. Tasks sit at `col` in their lane. Links reuse the orthogonal edges from Task 6 by copying the function. Do not import across element files; a shared helper would be a shared file.
- `walk(id)`: the token, a filled circle in `--k-accent`, moves along the link path to the task. The task's lane fill goes to `--k-surface` at full strength, and other lanes dim to 0.4.
- **Fixture:** includes a long task label for Review Focus 4.

### Task 9: Decision tree (`tree.ts`)

- `d3.tree().size([w, h])` lays out top-down. Edge labels sit at the edge midpoints.
- `path(edges)` follows the edge labels from the root, lights that route in `--k-accent` and dims the rest to 0.3. An edge label that does not exist on the route reports `tree: no edge "<label>" after "<node>"`.
- **Unit tests:** `route(root, ["yes","no"])` returns the node ids. The layout of a known 3-level tree is checked against snapshot numbers.

### Task 10: Checklist and agenda (`checklist.ts`, `agenda.ts`)

- **checklist:** square boxes with a 2 px stroke in `--k-line`. Item text starts in `--k-muted`. `tick(i)` draws the check in `--k-ok` with `drawOn` and brightens the text to `--k-fg`. A `done: true` item is ticked from `show`.
- **agenda:**
  - Times sit in a right-aligned column. Past rows (before `current`) take `--k-muted`, the current row takes `--k-accent` with a marker bar, and future rows take `--k-fg`.
  - `show` fades the rows in, then slides the marker from the top to the current row.
  - With no `current`, there is no marker.
  - An unknown `current` reports `agenda: no row "<title>"`.
- Both get gallery scenes in pure Markdown, with no `scene.ts`. That proves the Task 2 path end to end.

### Task 11: Timers (`timer.ts`)

- `timerState(totalMs: number, elapsedMs: number): { remainingMs; phase: "run" | "warn" | "done"; text: string }`. `warn` starts when `remainingMs <= 0.2 * totalMs`, and `done` starts when it reaches ≤ 0. `text` is `m:ss`, with the minutes unpadded.
- Rendering: the four styles from spec §2. The root carries `data-k-ignore`. Updates are driven by `requestAnimationFrame` only while running.
- Lifecycle through `ctx.onStep`:
  - The timer's own step played (`play && span[0] === its step start`) starts it.
  - Any event with `scene !== ctx.scene` stops and resets it.
  - A cut onto its step (`!play`) shows it full, paused, with `pressT` visible.
  - `klappe:timer` toggles pause, but only while `scene === ctx.scene`. A click on the timer toggles it too.
- **Unit tests:** `timerState(600000, 0).text === "10:00"`, `(600000, 480001).phase === "warn"`, `(600000, 600000)` gives `{ phase: "done", text: "0:00" }`, and `(60000, 59001).text === "0:01"`, rounding up.
- **e2e** with Playwright `page.clock`, one test per Review Focus 3 case:
  - Play onto the timer and advance 61 s: the text reads `9:59`.
  - Go to the next step in the scene: it is still running.
  - Leave the scene and come back by cut: it is reset and paused.
  - Deep link: `Press T to start` shows. Press `t` and advance 1 s: `9:59`.
  - Press `t` on a scene with no timer: no error, and `window.klappe.errors` stays empty.
  - Autoplay over the timer step: it starts on play.

---

## Wave 2, in parallel

### Task 12: Demo deck shows every effect

**Files:**
- Create: `decks/demo/sections/60-technical-training/**`, `decks/demo/sections/70-process-training/**`, `tests/lint/demo-coverage.test.ts`, and media or data files under `decks/demo/` as needed.
- Modify: existing demo scenes, only to close M2 gaps.

- [ ] **Step 1: Write the coverage test.** Collect every export of `src/fx/index.ts`, minus the allow-list `["parseCsv", "swarmPoint", "counterText", "parseGroups", "lineDiff", "timerState", "loadHighlighter", "KEN_BURNS"]`, and every `TransitionKind`. Each name must appear as a call `name(` in `decks/demo/**/*.ts`, or as a `transition: "<kind>"` there. The four Markdown forms must each appear in some `decks/demo/**/scene.md`. Before writing the allow-list, read the actual export list, and add only pure helpers to it.
- [ ] **Step 2: Run it.** Expected: FAIL, listing at least `code`, `terminal`, `lineArt` and `video`.
- [ ] **Step 3: Build `60-technical-training`.**
  1. Agenda with `←`.
  2. Code walkthrough of a generic 20-line retry function, with groups, and a diff to its fixed version.
  3. A callout on the bug line.
  4. Terminal replay of running its tests.
  5. A flow diagram of a client, an API, a queue and a worker, with `send`.
  6. A sequence diagram of the same request.
- [ ] **Step 4: Build `70-process-training`.**
  1. Agenda again, with the next row current.
  2. Swimlanes for a change request across Requester, Team and Review, with `walk`.
  3. A decision tree, "Can we ship?", with a `path`.
  4. An exercise scene with a Markdown checklist and a 10-minute `ring` timer.
- [ ] **Step 5: Close the M2 gaps the test lists.** Add `lineArt` and a local sample video (`media/sample.mp4`, or a labelled VIDEO MISSING placeholder with its TODO prompt), plus any transition kind not yet used, where the story allows. One message per scene.
- [ ] **Step 6: Run** `npm test` (coverage and walk green) and `node bin/klappe.mjs test --deck demo`.
- [ ] **Step 7: Commit** with the message `feat(demo): technical and process training sections; every effect shown`.

### Task 13: Reference completion and the agent skill

**Files:**
- Create: `docs/reference/markdown.md`, `docs/reference/effects.md`, `docs/reference/motion.md`, `decks/gallery/sections/230-tweens/**`, `.claude/skills/klappe/SKILL.md`
- Modify: `.claude/agents/klappe-*.md` (pointers only), `docs/reference/index.md`, `tests/lint/docs.test.ts` (empty `PENDING`)

- **effects.md:** one entry per M2 export, in the spec §3 shape. Examples are copied from the existing gallery scenes.
- **markdown.md:** one table of every Markdown trigger: image, video, chart, `### Q?`, code fence with groups, console, task list and agenda rows. Each row gets a minimal example.
- **motion.md:** the timeline rule, step functions, and GSAP `tl.to` for move, rotate, resize and scale, with the ease names `power1-4.in/out/inOut`, `back`, `elastic` and `sine`. The tweens gallery section shows three boxes moving, rotating and resizing with `power2.inOut`, `back.out(1.7)` and `elastic.out(1, 0.4)`.
- **SKILL.md:** under 80 lines.
  - Frontmatter `name: klappe`, with a description that triggers on deck work.
  - Element choice by intent (show code changing → `code` + `diff`; show who does what → `swimlanes`; …).
  - The timeline rule, the design rules, and links as `klappe/docs/reference/<file>.md`, which is the path in deck repos.
- **Permission note:** `.claude/skills/` is write-protected by the session sandbox. The orchestrator asks the user to approve that one write, or writes it with the user present.
- [ ] Steps: write the docs → `PENDING = []` → `npx vitest run tests/lint` green → walk `?selftest=walk` on the gallery green → commit with the message `docs: klappe reference and agent skill`.

---

### Task 14: Close-out

- [ ] Run `npm test`, `npx tsc --noEmit` and `node bin/klappe.mjs build --deck demo`. All green. Record the bundle size before and after Shiki in `docs/perf-m3.md`.
- [ ] Look review: the reviewer pages through the gallery and the demo with `?theme=bold` and writes screenshots to `<scratchpad>/m3-bold/`.
- [ ] Copy the deferred review findings into `docs/backlog.md` under "After M3".
- [ ] Commit with the message `chore: M3 close-out`.
