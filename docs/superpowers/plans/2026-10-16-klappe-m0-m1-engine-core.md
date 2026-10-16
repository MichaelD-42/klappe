# klappe M0 + M1: Foundations and Engine Core, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task by task.
> Use the build loop from the spec: an orchestrator, one builder per task, and three reviewers (technical, look and feel, content).
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The klappe repo runs a demo deck from scene folders, with these features:

- camera flights on a shared canvas, and transitions between canvases;
- deep links, browser back and forward;
- a section selector, an overview, a synced speaker view and auto-play.

Automated tests in three layers prove all of it. Deck repos consume klappe through git subtree.

**Architecture:**

- Pure TypeScript modules for parsing, assembly, layout, camera maths and routing, unit-tested in Node.
- One GSAP timeline per canvas, with an end label per step: deep link = `seek`, forward = play to the next label, back = cut.
- The page has a built-in self-test (`?selftest=…`) that writes JSON into `<script id="klappe-selftest">`.
- The browser driver only opens a URL and reads that element, so the driver can be swapped.

**Tech stack:** Vite 8, TypeScript, GSAP 3, markdown-it, Vitest, Playwright (Chromium). D3 is added in M2.

**Spec:** `docs/superpowers/specs/2026-10-16-klappe-design.md` (the design) and `docs/storyteller-init-prompt.md` (the original spec, "spec §n" below).

## Global constraints

- Design rules: "no cream or off-white backgrounds, no italic accent words in headlines, no numbered "01/02/03" section labels, no monospace labels, no pill-shaped buttons." Monospace is allowed only inside retro-screen content.
- "Offline: bundle all fonts and libraries. No CDN calls at runtime."
- "Keep all UI strings in one place": `src/strings.ts`.
- "Respect `prefers-reduced-motion`": camera flights become cuts.
- "Do not invent facts, numbers or quotes in deck content. Mark gaps clearly." The demo deck uses only spec §4 text; site names stay placeholders.
- Libraries are limited to: vite, typescript, gsap, markdown-it (+ @types), vitest, @playwright/test. Ask the user before adding any other.
- Stage size is 1920×1080. Step numbers in URLs start at 1. Hash format: `#/<section>/<scene>/<step>`.
- Shared code: `src/**`, `vite.config.ts`, `bin/**`, `DECISIONS.md`. Only the orchestrator merges changes to these. A builder touches only the files listed in its task.

## Review focus

These are the inputs most likely to hurt a real user that no happy-path test covers. Each one has its test in the task named after it.

1. **Stale or invalid hash.** Example: a renamed scene, `step 99`, or garbage. Expected: land on the nearest valid step (the scene's step 1, or the deck's step 1), `replaceState` the hash, no crash. _Task 9._
2. **Keys pressed while a step plays.** Expected: the playing step jumps to its end, then advances once. No skipped step, no doubled step, no overlapping tweens. _Task 10._
3. **`scene.ts` and `scene.md` disagree on step count.** Expected: a problem that names the file, shown on screen and failing the self-test. Never a silent wrong mapping. _Task 6._
4. **Viewport that isn't 16:9**, such as 1366×768 or 1024×768. Expected: the stage is letterboxed and no text is clipped. At 1366×768 every visible text renders ≥ 14 px. _Task 11._
5. **Speaker view opened before the main window, or the main window reloaded.** Expected: the speaker view asks for state on load and resyncs. _Task 13._

---

## File structure (klappe repo)

```text
package.json  tsconfig.json  vite.config.ts  index.html  README.md  DECISIONS.md
bin/klappe.mjs                CLI: klappe dev|build|test [--deck <id>]
src/
  types.ts                    all shared types (Task 4)
  strings.ts                  UI strings
  parse/ids.ts  parse/frontmatter.ts  parse/scene.ts  parse/section.ts
  deck/assemble.ts            files+modules → Deck + problems
  deck/load.ts                import.meta.glob on '@deck' (browser only)
  layout.ts                   canvases and scene rects
  camera.ts                   frame maths + flight keyframes + applyCamera
  router.ts                   parseHash/formatHash + Router (history)
  render/stage.ts             letterboxed stage, layers
  render/world.ts             canvas DOM, default scene renderer, module build
  stepper.ts                  timelines, step list, goto/next/prev, transitions
  input.ts  ui/selector.ts  ui/overview.ts  ui/problems.ts
  speaker/channel.ts  speaker/view.ts
  autoplay.ts  errors.ts  selftest.ts  main.ts  styles.css
decks/demo/                   demo deck (Tasks 3, 15)
tests/unit/*.test.ts          Vitest, Node
tests/e2e/driver.ts           runSelftest(url, viewport) → SelftestResult
tests/e2e/*.e2e.test.ts       Vitest + driver
tests/lint/design.test.ts     static design-rule lint
.claude/agents/klappe-*.md    builder + 3 reviewers
.claude/skills/klappe/SKILL.md  stub (filled in M4)
```

---

## M0: Foundations (hard gate)

### Task 1: Scaffold, CLI and deck alias

**Files:**

- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `bin/klappe.mjs`, `src/main.ts`, `decks/demo/deck.md`, `tests/unit/smoke.test.ts`, `vitest.config.ts`.

**Interfaces:**

- Produces:
  - **CLI.** `node bin/klappe.mjs dev|build [--deck <id>]`.
    - The deck id is resolved from `--deck`, else the only folder in `<cwd>/decks`, else an error naming the choices.
    - The CLI sets `process.env.KLAPPE_DECK_DIR` (absolute path) and calls Vite's `createServer` or `build` with `configFile: <klappe>/vite.config.ts`.
  - **Vite config.**
    - `root` is the klappe dir.
    - `resolve.alias['@deck']` is `KLAPPE_DECK_DIR`, defaulting to `<cwd>/decks/demo`.
    - `server.fs.allow` contains `[klappeDir, cwd]`.
    - `build.outDir` is `<cwd>/dist/<deckId>`.
  - **npm scripts:**
    - `dev`, `build` (both through the CLI);
    - `test` = `vitest run`;
    - `test:unit` = `vitest run tests/unit tests/lint`;
    - `test:e2e` = `vitest run tests/e2e`.

- [ ] **Step 1.** Run `npm init -y`. Set `"type": "module"` and `"name": "klappe"`. Run `npm i gsap markdown-it` and `npm i -D vite typescript vitest @types/markdown-it @types/node`. If the install fails behind a proxy, check `HTTPS_PROXY` first.
- [ ] **Step 2.** Write `tests/unit/smoke.test.ts`: `expect(1).toBe(1)`. Run `npm run test:unit`. Expected: 1 passed.
- [ ] **Step 3.** Write `decks/demo/deck.md` with this frontmatter: `title: klappe demo`, `lang: en`, `theme: calm`, `intensity: calm`, `confidential: false`.
- [ ] **Step 4.** Write `src/main.ts`. For now it imports `@deck/deck.md?raw` and writes its first line into `document.body`. Write the CLI and the config.
- [ ] **Step 5.** Run `node bin/klappe.mjs dev`, then `curl -s http://localhost:5173/ | grep -c script`. Expected: ≥ 1. Stop the server.
- [ ] **Step 6.** Run `node bin/klappe.mjs build`. Expected: `dist/demo/index.html` exists.
- [ ] **Step 7.** Commit: `chore: scaffold klappe with CLI and @deck alias`.

### Task 2: Browser driver spike and driver

**Files:**

- Create: `tests/e2e/driver.ts`, `tests/e2e/setup.ts` (Vitest globalSetup: starts the Vite dev server on a free port, exports `BASE_URL` through `provide`), `tests/e2e/driver.e2e.test.ts`.
- Modify: `vitest.config.ts` (an e2e project with globalSetup and a 120 s timeout), `DECISIONS.md`.

**Interfaces:**

- Produces:

  ```ts
  export interface SelftestCheck {
    name: string;
    ok: boolean;
    detail?: string;
  }
  export interface SelftestResult {
    mode: string;
    ok: boolean;
    steps: number;
    checks: SelftestCheck[];
    problems: string[];
    errors: string[];
  }
  export function runSelftest(
    url: string,
    viewport?: { w: number; h: number },
  ): Promise<SelftestResult>;
  ```

  - The default viewport is 1920×1080.
  - The function waits up to 90 s for `script#klappe-selftest` and parses its JSON.

- [ ] **Step 1.** Run `npm i -D @playwright/test` and `npx playwright install chromium`. The download comes from a CDN: if it fails, check `HTTPS_PROXY` first.
- [ ] **Step 2.** Write `driver.e2e.test.ts`. It opens `data:text/html,<script id="klappe-selftest" type="application/json">{"mode":"x","ok":true,"steps":0,"checks":[],"problems":[],"errors":[]}</script>` and expects `ok === true`.
- [ ] **Step 3.** Implement `runSelftest` with `chromium.launch()` from `@playwright/test`. Run `npm run test:e2e`. Expected: PASS.
- [ ] **Step 4. Gate.**
  - **If Step 1 or 3 fails** because launch or DevTools is blocked: implement the same `runSelftest` signature by porting `C:\workspace\claude-advisor\topics\ai-at-rd\presentation-v2\test\edge.mjs`. That means headless Edge with `--dump-dom --virtual-time-budget=…` and a `--window-size` set from the viewport; parse the script tag out of the dumped DOM. Record the fallback in `DECISIONS.md`.
  - **Either way:** record which driver won, and why, in `DECISIONS.md`.
- [ ] **Step 5.** Commit: `test: add swappable browser driver (<playwright|edge>)`.

### Task 3: Loop agents, skill stub and discovery check

**Files:**

- Create: `.claude/agents/klappe-builder.md`, `.claude/agents/klappe-review-tech.md`, `.claude/agents/klappe-review-look.md`, `.claude/agents/klappe-review-content.md`, `.claude/skills/klappe/SKILL.md`.
- Modify: `DECISIONS.md`.

**Interfaces:**

- **Every agent file** has Claude Code agent frontmatter: `name`, `description`, `tools`. Reviewers get read-only tools plus Bash for running tests and screenshots.
- **Each reviewer** returns exactly this shape:
  - `VERDICT: PASS|FAIL`;
  - then a list of findings: `file:line — problem — expected`.
- **What each reviewer checks**, copied from the spec's build-loop section:
  - **Technical:** the tests are real and green; the API contract and the timeline rule are kept; no edits to shared files; swarm sizes and node counts stay within performance limits; deep link and walk give the same state.
  - **Look and feel:** screenshots at 1920×1080 and 1366×768; the spec §2 design rules and theme tokens; framing and legibility; motion that is smooth and has meaning; "wow" for bold decks, calm for board decks.
  - **Content:** one message per scene; every number has a source, with no invented facts; wording and notes; open TODOs; for framework tasks, docs and the demo deck.
- **The builder** may touch only the files its task lists. It hands back a green `npm test` result plus screenshot paths.
- **The skill stub** has a `name` and a `description` ("Build and review klappe decks…") and a body that says "Filled in M4."

- [ ] **Step 1.** Write the five files.
- [ ] **Step 2. Discovery check.**
  - Make a scratch repo: `<scratchpad>/deck-probe/`, then `git init`, then copy this repo to `deck-probe/klappe/`.
  - Run `claude -p "List the names of all skills and subagent types you can use. Output names only."` with `deck-probe/` as the working directory.
  - Expected: you learn whether `klappe` and `klappe-review-tech` appear.
- [ ] **Step 3. Act on the result.**
  - **If they do not appear:** create `bin/sync-claude.mjs`. It copies `klappe/.claude/{agents,skills}` into the deck repo's `.claude/`, overwriting only `klappe*` names. Add `"klappe:sync"` to the deck template docs.
  - **Either way:** record the result in `DECISIONS.md`.
- [ ] **Step 4.** Commit: `feat: add build-loop agents and skill stub`.

### Task 4: Subtree round trip and README

**Files:**

- Create: `README.md`. It covers what klappe is, a "New deck repo" section, an "Update klappe" section and a "Push a fix back" section.
- Modify: `bin/klappe.mjs`. Add `klappe init`, which creates `decks/<id>/deck.md`, `decks/<id>/sections/` and a root `package.json` in the deck repo, with `"dependencies": {"klappe": "file:./klappe"}` and the scripts `dev`, `build` and `test`, each calling `node klappe/bin/klappe.mjs …`.

- [ ] **Step 1. Push.**
  - Get explicit user confirmation before the first push of `main` to the klappe remote. It is outward-facing.
  - Merge this branch to `main` locally, then push.
- [ ] **Step 2. Round trip in a scratch deck repo.** In `<scratchpad>/deck-rt/`, run:
  1. `git init`;
  2. `git commit --allow-empty -m init`;
  3. `git subtree add --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash`;
  4. `node klappe/bin/klappe.mjs init --deck rt`;
  5. `npm i`;
  6. `npm run build -- --deck rt`.

  Expected: `dist/rt/index.html` exists.

- [ ] **Step 3. Update.** Make a trivial commit to klappe `main`, run `git subtree pull --prefix klappe <url> main --squash` in `deck-rt`, and check that the change arrived.
- [ ] **Step 4. Write README.** Write the exact commands from Steps 2–3 into the README.
- [ ] **Step 5. Commit and close M0.**
  - Commit: `docs: README with subtree workflow; klappe init`.
  - M0 is green when `npm test` passes and the driver is decided.

---

## M1: Engine core

### Task 5: Types, ids and frontmatter

**Files:**

- Create: `src/types.ts`, `src/strings.ts`, `src/parse/ids.ts`, `src/parse/frontmatter.ts`.
- Test: `tests/unit/ids.test.ts`, `tests/unit/frontmatter.test.ts`.

**Interfaces (produced, used by every later task):**

```ts
// src/types.ts
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface DeckMeta {
  title: string;
  lang: string;
  theme: "calm" | "bold";
  intensity: "calm" | "bold";
  confidential: boolean;
  sharedCanvas: string[][];
}
export type StepKind =
  "step" | "shout-enter" | "shout-hold" | "shout-fade" | "shout-answer";
export interface StepDoc {
  text: string;
  notes: string;
  kind: StepKind;
}
export interface SceneDoc {
  id: string;
  order: number;
  title: string;
  notes: string;
  steps: StepDoc[];
}
export interface SectionDoc {
  id: string;
  order: number;
  title: string;
  notes: string;
}
export interface Ctx {
  rect: Rect;
  svg: SVGGElement;
  html: HTMLElement;
  canvas: { refs: Record<string, any>; rects: Record<string, Rect> };
  camera: {
    to(
      tl: gsap.core.Timeline,
      target: Rect,
      opts?: { duration?: number; at?: number | string },
    ): void;
  };
}
export type StepFn = (tl: gsap.core.Timeline, refs: any, ctx: Ctx) => void;
export interface SceneModule {
  place?(rects: Record<string, Rect>): Rect;
  build?(ctx: Ctx): any;
  steps?: (StepFn | null)[];
}
export interface SectionModule {
  build?(ctx: Omit<Ctx, "rect"> & { rect: Rect }): Record<string, any>;
}
export interface Scene extends SceneDoc {
  sectionId: string;
  module?: SceneModule;
  source: string;
}
export interface Section extends SectionDoc {
  scenes: Scene[];
  module?: SectionModule;
}
export interface Deck {
  meta: DeckMeta;
  sections: Section[];
}
export interface CanvasLayout {
  id: string;
  sectionIds: string[];
  size: { w: number; h: number };
  rects: Record<string, Rect>;
}
export interface StepAddr {
  index: number;
  canvas: number;
  section: string;
  scene: string;
  step: number;
}
```

- `idFromFolder(name: string): { id: string; order: number }` handles `^(\d+)-(.+)$`. A name without a prefix gives `order: Infinity`.
- `parseFrontmatter(md: string): { data: Record<string, unknown>; body: string }`.
  - It supports `key: value` (string, number, `true` or `false`), inline lists `[a, b]`, and nested lists `[[a, b], [c]]`. Bare words become strings.
  - Add the comment `// shortcut: no full YAML, upgrade to the 'yaml' package if decks need maps`.
- `toDeckMeta(data): { meta: DeckMeta; problems: string[] }`.
  - Defaults: `lang 'en'`, `theme 'calm'`, `intensity = theme`, `confidential false`, `sharedCanvas []`.
  - A flat `shared-canvas` list becomes one group.
  - A missing `title` is a problem.
- `strings.ts` exports `const strings = { en: { sections: 'Sections', overview: 'Overview', next: 'Next', notes: 'Notes', elapsed: 'Elapsed', problems: 'Deck problems', dataMissing: 'DATA MISSING', imageMissing: 'IMAGE MISSING' } }` and `t(key, lang)`.

- [ ] **Step 1.** Write the tests:

  ```ts
  expect(idFromFolder("20-analysis")).toEqual({ id: "analysis", order: 20 });
  expect(idFromFolder("intro").order).toBe(Infinity);
  const { data, body } = parseFrontmatter(
    "---\ntitle: Demo\nconfidential: true\nshared-canvas: [value-stream, global-team]\n---\nrest",
  );
  expect(data).toEqual({
    title: "Demo",
    confidential: true,
    "shared-canvas": ["value-stream", "global-team"],
  });
  expect(body).toBe("rest");
  expect(toDeckMeta(data).meta.sharedCanvas).toEqual([
    ["value-stream", "global-team"],
  ]);
  expect(toDeckMeta({}).problems).toContain("deck.md: missing title");
  expect(parseFrontmatter("no frontmatter").data).toEqual({});
  ```

- [ ] **Step 2.** Run `npx vitest run tests/unit/ids.test.ts tests/unit/frontmatter.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3.** Implement.
- [ ] **Step 4.** Run the tests again. Expected: PASS.
- [ ] **Step 5.** Commit: `feat(parse): types, folder ids, frontmatter`.

### Task 6: Scene and section parser, deck assembly

**Files:**

- Create: `src/parse/scene.ts`, `src/parse/section.ts`, `src/deck/assemble.ts`, `src/deck/load.ts`.
- Test: `tests/unit/scene.test.ts`, `tests/unit/assemble.test.ts`.

**Interfaces:**

- **`parseScene(md: string, folder: string): { scene: SceneDoc; problems: string[] }`** (markdown-it tokens):
  - The `##` heading is the title. If it is missing: problem `"<folder>/scene.md: missing ## title"`.
  - Each top-level list item is one step; nested content joins into `text`.
  - A blockquote goes to the notes of the step above it. With no step above, it goes to the scene notes.
  - A `###` heading ending in `?`, plus the paragraph after it, becomes 4 steps with kinds enter, hold, fade and answer. The question is the text of the first three; the answer is the text of the fourth.
  - A scene with zero steps gets one step whose `text` is the title.
- **`parseSection(md, folder): { section: SectionDoc; problems }`.** The `#` heading is the title; the blockquote is the section notes.
- **`assembleDeck(files: Record<string, string>, modules: Record<string, unknown>): { deck: Deck; problems: string[] }`.**
  - Keys are paths relative to the deck root: `deck.md`, `sections/10-x/section.md`, `sections/10-x/20-y/scene.md`, `…/scene.ts`, `sections/10-x/section.ts`. Modules are `default` exports.
  - Ordering is by `order`, then by folder name.
  - Problems:
    - duplicate section ids;
    - duplicate scene ids within the deck;
    - a scene folder without `scene.md`;
    - `module.steps.length !== scene.steps.length` → `"<path>/scene.ts: 3 step functions, scene.md has 4 steps"`.
- **`loadDeck(): { deck; problems }`** (browser) uses `import.meta.glob('@deck/**/*.md', { query: '?raw', import: 'default', eager: true })` and `import.meta.glob('@deck/sections/**/*.ts', { import: 'default', eager: true })`. Strip the key prefix down to the deck-relative path.

- [ ] **Step 1. Write the tests.** Use the spec §4 Example B "Clarification" scene text verbatim as a fixture.

  ```ts
  const { scene } = parseScene(CLARIFICATION_MD, "30-clarification");
  expect(scene.id).toBe("clarification");
  expect(scene.steps.map((s) => s.kind)).toEqual([
    "step",
    "step",
    "step",
    "step",
    "step",
    "shout-enter",
    "shout-hold",
    "shout-fade",
    "shout-answer",
  ]);
  expect(scene.steps[8].text).toBe("The conversations that build trust.");
  // notes go to the step above
  expect(
    parseScene("## A\n\n- one\n\n> say this\n", "10-a").scene.steps[0].notes,
  ).toBe("say this");
  expect(parseScene("## A\n\n> intro\n\n- one\n", "10-a").scene.notes).toBe(
    "intro",
  );
  expect(parseScene("## Solo\n", "10-solo").scene.steps).toHaveLength(1);
  // review focus 3
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: T\n---",
      "sections/10-s/section.md": "# S",
      "sections/10-s/10-a/scene.md": "## A\n\n- x\n- y",
    },
    { "sections/10-s/10-a/scene.ts": { steps: [null] } },
  );
  expect(r.problems).toContain(
    "sections/10-s/10-a/scene.ts: 1 step functions, scene.md has 2 steps",
  );
  // duplicate ids across sections
  expect(
    assembleDeck(
      {
        "deck.md": "---\ntitle: T\n---",
        "sections/10-s/section.md": "# S",
        "sections/10-s/10-a/scene.md": "## A",
        "sections/20-t/section.md": "# T",
        "sections/20-t/10-a/scene.md": "## A",
      },
      {},
    ).problems.some((p) => p.includes("duplicate scene id 'a'")),
  ).toBe(true);
  ```

- [ ] **Step 2.** Run the tests. Expected: FAIL.
- [ ] **Step 3.** Implement.
- [ ] **Step 4.** Run the tests. Expected: PASS.
- [ ] **Step 5.** Commit: `feat(parse): scene/section parser and deck assembly`.

### Task 7: Layout

**Files:**

- Create: `src/layout.ts`.
- Test: `tests/unit/layout.test.ts`.

**Interfaces:**

- **`layoutDeck(deck: Deck): { canvases: CanvasLayout[]; problems: string[] }`.**
  - Each section is its own canvas (`id` = section id) unless it is listed in a `meta.sharedCanvas` group. A group becomes one canvas: `id` = the group's ids joined with `+`, in deck order.
  - Scenes on a canvas sit at `x = i × 1920, y = 0, 1920×1080`, in deck order across the canvas's sections.
  - `module.place(rectsSoFar)` overrides a scene's rect.
  - `size` is the bounding box of all rects.
  - Problem: a `sharedCanvas` id that names no section.
- **`buildStepList(deck, canvases): StepAddr[]`.** Indices are global, in deck order; `step` starts at 1.

- [ ] **Step 1.** Write the tests:
  - a two-section deck without sharing gives 2 canvases;
  - with `sharedCanvas [['a','b']]` it gives 1 canvas with id `a+b`, and the scene rects run on as x = 0, 1920, 3840;
  - `place` returning `{x:0,y:2000,w:1920,h:1080}` is respected, and `size.h === 3080`;
  - `buildStepList` for scenes with 2 and 3 steps gives indices 0..4, and `addr[2]` equals `{ scene: <second>, step: 1 }`;
  - an unknown shared id gives a problem.
- [ ] **Step 2.** Run the tests. Expected: FAIL.
- [ ] **Step 3.** Implement.
- [ ] **Step 4.** Run the tests. Expected: PASS.
- [ ] **Step 5.** Commit: `feat: canvas layout and step list`.

### Task 8: Camera maths

**Files:**

- Create: `src/camera.ts`.
- Test: `tests/unit/camera.test.ts`.

**Interfaces:**

- **`frame(target: Rect): { x: number; y: number; scale: number }`.**
  - The world transform shows `target` fitted into 1920×1080 and centred, with `transformOrigin 0 0`.
  - `scale = min(1920/w, 1080/h)`.
  - `x = -target.x*scale + (1920 - w*scale)/2`, and `y` likewise.
- **`flight(from: Rect, to: Rect): { x; y; scale }[]`.**
  - It returns 3 keyframes: start, mid, end.
  - The mid frame zooms out so that both rect centres fit, but only when the centre distance is more than 1.5 × max(w). Otherwise it returns 2 keyframes.
- **`addCameraMove(tl, world: HTMLElement, from: Rect, to: Rect, opts: { duration?: number; at?: number | string; instant?: boolean })`.**
  - It adds GSAP keyframe tweens of `x`, `y` and `scale` on `world`.
  - The default duration comes from the theme motion token `camera` (1.6 s); `ease` is `power2.inOut`.
  - `instant` sets the duration to 0. Reduced-motion uses `instant`.

- [ ] **Step 1.** Write the tests:

  ```ts
  expect(frame({ x: 0, y: 0, w: 1920, h: 1080 })).toEqual({
    x: 0,
    y: 0,
    scale: 1,
  });
  expect(frame({ x: 1920, y: 0, w: 960, h: 540 })).toEqual({
    x: -3840,
    y: 0,
    scale: 2,
  });
  expect(flight(A, B_far)).toHaveLength(3);
  expect(flight(A, B_far)[1].scale).toBeLessThan(
    Math.min(frame(A).scale, frame(B_far).scale),
  );
  expect(flight(A, A_neighbour)).toHaveLength(2);
  ```

- [ ] **Step 2.** Run the tests. Expected: FAIL.
- [ ] **Step 3.** Implement.
- [ ] **Step 4.** Run the tests. Expected: PASS.
- [ ] **Step 5.** Commit: `feat: camera frame and flight maths`.

### Task 9: Router

**Files:**

- Create: `src/router.ts`.
- Test: `tests/unit/router.test.ts`.

**Interfaces:**

- **`formatHash(a: StepAddr): string`** returns `#/<section>/<scene>/<step>`.
- **`resolveHash(hash: string, steps: StepAddr[]): { index: number; exact: boolean }`.**
  - If the scene and step exist: that index, `exact: true`.
  - If the scene exists but the step doesn't: the scene's step 1, `exact: false`.
  - If only the section exists: its first step.
  - Otherwise: index 0.
  - A missing step part means step 1, `exact: true`.
- **`class Router { constructor(steps: StepAddr[], onNavigate: (index: number) => void); push(index: number): void; start(): number }`.**
  - `push` calls `history.pushState` unless the call comes from inside `onNavigate` (the re-entry guard).
  - `start()` resolves `location.hash`, calls `replaceState` when the resolve is not exact, and returns the index.
  - `popstate` resolves the hash and calls `onNavigate`.

- [ ] **Step 1.** Write the tests (review focus 1):
  - `resolveHash('#/value-stream/clarification/2', steps)` is the exact index;
  - `'#/value-stream/clarification/99'` gives that scene's step 1, `exact: false`;
  - `'#/value-stream/renamed/2'` gives the value-stream section's first step;
  - `'#garbage'` and `''` give 0;
  - `formatHash(steps[i])` round-trips through `resolveHash` for every i.
- [ ] **Step 2.** Run the tests. Expected: FAIL.
- [ ] **Step 3.** Implement. The `Router` class is tested in the browser in Task 16.
- [ ] **Step 4.** Run the tests. Expected: PASS.
- [ ] **Step 5.** Commit: `feat: hash router with stale-link resolution`.

### Task 10: Stage, world render and stepper

**Files:**

- Create: `src/render/stage.ts`, `src/render/world.ts`, `src/stepper.ts`, `src/errors.ts`, `src/ui/problems.ts`, `src/styles.css`, `src/theme.ts`. `theme.ts` exports `motion = { camera: 1.6, step: 0.6, autoHoldMs: 2500 }` (seconds, except `autoHoldMs`) plus the CSS variable names. M3 adds the full themes.
- Modify: `src/main.ts`.
- Test: `tests/unit/stepper-plan.test.ts`.

**Interfaces:**

- **`installErrorCapture(): string[]`** collects `error`, `unhandledrejection` and `console.error` into `window.klappe.errors`.
- **`mountStage(root: HTMLElement): { stage: HTMLElement; worlds: HTMLElement; ui: HTMLElement }`.**
  - The stage is 1920×1080, CSS-scaled with `min(innerWidth/1920, innerHeight/1080)`, centred and letterboxed. It refits on `resize`.
- **`renderWorld(deck, canvases, root): CanvasRuntime[]`**, where `CanvasRuntime = { layout: CanvasLayout; el: HTMLElement; tl: gsap.core.Timeline; refs: Record<string, any> }`.
  - Per canvas: one `div.k-world` (`transform-origin: 0 0`), holding an `<svg>` of the canvas size and an HTML layer. Per scene: a `g[data-scene]` and a `div[data-scene]` positioned at its rect.
  - Section `build` runs first; its refs are merged into `ctx.canvas.refs`. Then each scene `build` runs.
  - **Default renderer** (no `build`): the title (`h2`) and one `p[data-step=n]` per `step` kind, each hidden with `autoAlpha 0`.
  - **Timeline.** For each step, the stepper appends that step's tweens, then `tl.addLabel('e:<index>')`.
    - A step with `module.steps[n]` calls it.
    - Otherwise the default step fades in `p[data-step=n]`.
    - The first step of each scene first adds a camera move to that scene's rect: `addCameraMove`, from the previous scene's rect on the same canvas, or a `set` for the canvas's first scene.
    - Shout-out steps in M1 use the default renderer: the question appears, holds, fades, then the answer appears. The full effect comes in M2.
- **`class Stepper`:**

  ```ts
  constructor(steps: StepAddr[], canvases: CanvasRuntime[], opts: { instant: boolean })
  readonly index: number
  goto(i: number, how: 'play' | 'cut'): Promise<void>
  next(): Promise<void>; prev(): Promise<void>
  on(ev: 'step' | 'transition' | 'end', fn: (data: any) => void): void
  ```

  - **Plan** (pure, exported): `planMove(from: StepAddr | null, to: StepAddr, how): { kind: 'play' | 'seek'; transition: 'none' | 'fade' | 'cut' }`.
    - Same canvas, `to.index === from.index + 1`, and `how === 'play'`: `play`, transition `none`.
    - Other canvas, forward by one: `play`, transition `fade`. M2 adds more transition kinds.
    - Anything else: `seek`, transition `cut`.
  - **Play** = `tl.tweenFromTo(prevLabelOrStart, 'e:'+i)`. **Seek** = `tl.seek('e:'+i)`.
  - **On a canvas switch:** seek the new canvas to the state before the target step (the previous label, or 0), show it, hide the old one, emit `transition`.
  - **`instant`** turns every play into a seek.
  - **Review focus 2:** a `next()` while a step is playing first calls `progress(1)` on the playing tween, then advances. A keypress during a play is never dropped and never doubles.

- **Problems.** If `assembleDeck` or `layoutDeck` returns problems, `ui/problems.ts` shows them in an overlay, and the self-test reports them.

- [ ] **Step 1.** Write `stepper-plan.test.ts` against `planMove`:
  - same canvas, forward by one, `play` → `{play, none}`;
  - other canvas, forward by one → `{play, fade}`;
  - backward → `{seek, cut}`;
  - a jump of 3 → `{seek, cut}`;
  - `from = null` → `{seek, cut}`.
- [ ] **Step 2.** Run the test. Expected: FAIL.
- [ ] **Step 3.** Implement all files.
  - `main.ts` wires together: `installErrorCapture`, `loadDeck`, `layoutDeck`, `mountStage`, `renderWorld`, `buildStepList`, `Stepper`, and `goto(0, 'cut')`.
- [ ] **Step 4.** Run the unit tests (expected: PASS) and `npm run dev`. Check by hand that the step-1 placeholder deck renders with no console errors.
- [ ] **Step 5.** Commit: `feat: stage, world render, canvas timelines, stepper`.

### Task 11: Self-test walk and legibility

**Files:**

- Create: `src/selftest.ts`, `tests/e2e/walk.e2e.test.ts`.
- Modify: `src/main.ts`, which calls `runSelftestIfAsked(ctx)` when `?selftest=` is set.

**Interfaces:**

- **Modes:** `walk` here; `ac` in Task 16. Each writes a `SelftestResult` (Task 2) into `<script type="application/json" id="klappe-selftest">`.
- **`snapshot(canvas): string`** serialises the canvas world transform plus, for every element with inline style under the world, its `opacity`, `visibility` and `transform`, rounded to 2 decimals.
- **`walk` does three things:**
  1. **Play pass.** From index 0, run `next()` through every step with `gsap.globalTimeline.timeScale(20)`, awaiting each step. Record `snapshot` after each one.
  2. **Seek pass.** For each i, reset every timeline to 0, then `goto(i, 'cut')` and compare with the play snapshot. A mismatch adds a check `"step <hash>: play≠seek"`.
  3. **Legibility.** At every step, for each visible text node in the active canvas:
     - its rendered font size is `getComputedStyle.fontSize × camera scale × stage fit scale`, and it must be ≥ 14 px when `innerWidth === 1366`;
     - its `getBoundingClientRect()` must lie inside the stage rect.

  `ok` is true only when all checks pass, `problems` is empty and `errors` is empty.

- [ ] **Step 1.** Write `walk.e2e.test.ts`:

  ```ts
  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 1366, h: 768 },
    { w: 1024, h: 768 },
  ]) {
    const r = await runSelftest(`${BASE_URL}/?selftest=walk`, vp);
    expect(r.problems).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(r.checks.filter((c) => !c.ok)).toEqual([]);
    expect(r.steps).toBeGreaterThan(0);
  }
  ```

  Also add a fixture case that proves the test can fail: `?selftest=walk&fixture=broken-step-count`. `loadDeck` swaps in an in-code fixture deck whose step counts mismatch. Expect `r.ok === false` and a problem that names `scene.ts`.

- [ ] **Step 2.** Run `npm run test:e2e`. Expected: FAIL (no self-test yet).
- [ ] **Step 3.** Implement.
- [ ] **Step 4.** Run `npm run test:e2e`. Expected: PASS on the placeholder deck.
- [ ] **Step 5.** Commit: `test: in-page selftest walk with play/seek equality and legibility`.

### Task 12: Input, section selector, overview

**Files:**

- Create: `src/input.ts`, `src/ui/selector.ts`, `src/ui/overview.ts`.
- Modify: `src/main.ts`, `src/styles.css`.

**Interfaces:**

- **`bindInput(stepper, ui: { overview; selector; speaker; autoplay })`.**
  - **Next:** Right, Space, PageDown, Enter, or a click on the stage.
  - **Previous:** Left, PageUp.
  - **Jump:** Home goes to index 0; End goes to the last step.
  - **Panels:** O = overview, S = section selector, N = open the speaker window, A = toggle auto-play, Esc closes the top layer.
  - **Ignored:** key repeat, and Ctrl, Alt or Meta combos.
  - **`[data-no-advance]`** elements don't advance on click.
- **`Selector.open()`** lists `deck.sections` (title only, no numbers) as buttons. A click calls `stepper.goto(firstIndexOf(section), 'cut')` and closes the selector.
- **`Overview.open()`** shows every canvas world, scaled into a grid cell, each seeked to its end state, plus one marker button per scene at its rect. A click calls `goto(firstIndexOf(scene), 'cut')` and closes the overview. Closing restores every canvas timeline to the current state.
- **Buttons:** `border-radius ≤ 6px`, no monospace. All labels come from `strings.ts`.

- [ ] **Step 1.** Implement. The tests for this behaviour live in Task 16 (AC-2, AC-4, AC-7).
- [ ] **Step 2.** Run `npm run dev` and check every key once by hand. The look-and-feel reviewer screenshots the overview and the selector at 1366×768.
- [ ] **Step 3.** Commit: `feat: keys, section selector, overview`.

### Task 13: Speaker view

**Files:**

- Create: `src/speaker/channel.ts`, `src/speaker/view.ts`.
- Modify: `src/main.ts`, which renders the speaker view instead of the stage when `?speaker=1`.

**Interfaces:**

- **`openChannel(deckTitle: string): { send(msg: Msg): void; on(fn: (msg: Msg) => void): void }`**, where `Msg = { t: 'state'; index: number } | { t: 'cmd'; cmd: 'next' | 'prev' | 'goto'; index?: number } | { t: 'hello' }`.
  - Transports: `BroadcastChannel('klappe:' + deckTitle)`, plus `window.opener` or a child-window `postMessage` as the fallback. Messages are checked by origin and shape.
- **The main window is authoritative.**
  - On `step` it sends `state`.
  - On `cmd` it runs the command.
  - On `hello` it replies with `state`.
- **The speaker view** sends `hello` on load (review focus 5). It renders:
  - the current step text and its notes (step notes, then scene notes);
  - the next step's text;
  - elapsed time from the first `state` received;
  - Prev and Next buttons that send `cmd`.

  Keys work as in the main window and send `cmd`.

- [ ] **Step 1.** Implement. The tests live in Task 16 (AC-3, and a hello-resync check).
- [ ] **Step 2.** Commit: `feat: speaker view synced over BroadcastChannel`.

### Task 14: Auto-play and router wiring

**Files:**

- Create: `src/autoplay.ts`.
- Modify: `src/main.ts`.

**Interfaces:**

- **`class Autoplay { constructor(stepper, holdMs: (addr: StepAddr) => number); start(): void; stop(): void; readonly running: boolean }`.**
  - After each step's play has finished, it waits `holdMs` (theme default 2500), then calls `next()`.
  - At the last step it stops and the stepper emits `end`.
  - Any manual input (Task 12 handlers) calls `stop()`.
  - `?autoplay=1` starts it on load.
- **Reduced motion:** `matchMedia('(prefers-reduced-motion: reduce)')` or `?reducedmotion=1` passes `instant: true` to camera moves only. Steps still play, and camera flights become cuts.
- **Router wiring:**
  - `stepper.on('step', a => router.push(a.index))`;
  - `new Router(steps, i => stepper.goto(i, 'cut'))`;
  - start at `router.start()`.

- [ ] **Step 1.** Implement. The tests live in Task 16 (AC-8, back and forward).
- [ ] **Step 2.** Commit: `feat: autoplay and history routing`.

### Task 15: Demo deck (Example B + opening + shared canvas)

**Files** (deck content only; a builder can do this in parallel with Tasks 12–14 once Task 10 is merged):

- Create:
  - `decks/demo/deck.md` (frontmatter adds `shared-canvas: [value-stream, global-team]`);
  - `decks/demo/sections/10-opening/section.md` and `10-old-way/scene.md`;
  - `decks/demo/sections/20-value-stream/section.md` and `section.ts`;
  - `20-value-stream/{10-overview,20-analysis,30-clarification}/scene.md`, plus a `scene.ts` for `overview` and `analysis`;
  - `decks/demo/sections/30-global-team/section.md` and `10-where-we-are/scene.md`.

**Content rules:**

- Scene text is copied verbatim from spec §4 Examples A, B and C. Site names stay `[Site 1]`… placeholders.
- M1 visuals are simple shapes:
  - `section.ts` for value-stream draws five stage boxes (Requirements, Analysis, Clarification, Design, Verification) along a line across the canvas. It returns `refs.stages[name]`.
  - `overview/scene.ts` draws the stream on, from left to right, using SVG stroke dash in GSAP (`strokeDashoffset`). Its last step is a camera pull-back to the canvas's full rect, `ctx.camera.to(tl, wholeCanvas)`.
  - `analysis/scene.ts` flies the camera to `refs.stages.analysis`.
- Swarms, figures, shatter and CRT come in M2. Where M1 cannot draw what a step describes, the default renderer shows the step text.

- [ ] **Step 1.** Write the deck.
- [ ] **Step 2.** Run `npm run test:e2e`. Expected: the walk is green at all three viewports.
- [ ] **Step 3.** The content reviewer checks that the text matches spec §4 word for word, with no invented facts.
- [ ] **Step 4.** Commit: `content: demo deck for M1`.

### Task 16: Acceptance suite AC-1…AC-8, design lint

**Files:**

- Modify: `src/selftest.ts` (add `ac` mode).
- Create: `tests/e2e/acceptance.e2e.test.ts`, `tests/lint/design.test.ts`.

**Interfaces:** `?selftest=ac` runs these checks in order, each as a `SelftestCheck` named `AC-n` (spec §9):

| Check       | What it does                                                                                                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AC-1**    | Set `location.hash = '#/value-stream/clarification/2'`, await `step`. `stepper.index` equals that address.                                                                                                                             |
| **AC-2**    | Dispatch `keydown` ArrowRight, then ArrowLeft, then a `click` on the stage. The index goes +1, −1, +1. 60 fps is manual.                                                                                                               |
| **AC-3**    | Append an `iframe src="?speaker=1"`. `next()` in main → the iframe's current text equals the new step's text within 1 s. Click Next in the iframe → main index +1. Reload the iframe → it shows the current step again (hello resync). |
| **AC-4**    | Press O. Tile count equals the canvas count; marker count equals the scene count. Click the marker for `analysis` → the current scene is `analysis` and the overview is closed.                                                        |
| **AC-5**    | Go to the last step of `opening`, then `next()`. One `transition` event fires, of kind `fade`. `prev()` → the `opening` canvas is visible again.                                                                                       |
| **AC-6**    | Step from the last value-stream step into `global-team` (same canvas). No `transition` event; the world transform changed.                                                                                                             |
| **AC-7**    | Press S. The buttons equal the section titles in order. Click each → the first step of that section.                                                                                                                                   |
| **AC-8**    | `timeScale(50)`, holds of 50 ms, `autoplay.start()`. The run reaches `end` at the last index. Then start again and dispatch ArrowRight → `autoplay.running === false`.                                                                 |
| **History** | After two `next()` calls, `history.back()` → the index goes −1; `history.forward()` → +1.                                                                                                                                              |

- **`design.test.ts`** scans `src/**/*.css`, `src/**/*.ts` and `decks/**/*.{ts,md}` for:
  - `font-style: italic`, or `<em>` inside headings;
  - `monospace` outside an element with class `k-retro`;
  - `border-radius` ≥ 999px or 50% on `button`;
  - the regex `\b0[1-9]\b` in labels;
  - background colours in a cream or off-white list (`#fff8e7`, `#faf3e0`, `#fdf6e3`, `#f5f5dc`, `ivory`, `beige`, `linen`, `oldlace`).
  - It also flags any `http(s)://` in `src` outside `strings.ts` comments (no runtime CDN).

- [ ] **Step 1.** Write `acceptance.e2e.test.ts`. It calls `runSelftest(BASE_URL + '/?selftest=ac')` and checks that every check from `AC-1` to `AC-8` plus `History` is present and `ok`, using `expect(names).toEqual([...])`, so a missing check fails.
  - **If Playwright won in Task 2,** add one real-input test that opens the main window and `?speaker=1` as two pages in one context and checks the sync both ways.
- [ ] **Step 2.** Write `design.test.ts`. Seed it with a fixture string per rule and check that each one is caught; then run it over the repo.
- [ ] **Step 3.** Run `npm test`. Expected: FAIL (no `ac` mode).
- [ ] **Step 4.** Implement the `ac` mode.
- [ ] **Step 5.** Run `npm test`. Expected: PASS: unit, lint, walk at 3 viewports, acceptance.
- [ ] **Step 6.** Commit: `test: acceptance suite AC-1..8 and design lint`.

### Task 17: M1 close-out

- [ ] **Step 1.** Run `npm test` and `node bin/klappe.mjs build`, and check the deep link by hand: `vite preview`, then `#/value-stream/clarification/2`.
- [ ] **Step 2.** The user does the manual check: smoothness at 60 fps on a laptop, and the speaker view in two real windows.
- [ ] **Step 3.** Update `README.md` with deck format quick reference: folders, `scene.md` rules, the `scene.ts` API (`build`, `steps`, `place`, `ctx.camera.to`).
- [ ] **Step 4.** Update `DECISIONS.md` with anything decided during M1.
- [ ] **Step 5.** Finish the branch with superpowers:finishing-a-development-branch. Pushing needs the user's confirmation.
