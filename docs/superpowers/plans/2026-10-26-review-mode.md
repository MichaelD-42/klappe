# Review Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A review window, opened with `R` from a deck on the dev server, where the author types findings per step in three categories; they land in `decks/<id>/review.md`, which Claude Code works through and empties.

**Architecture:** A pure module (`src/review/file.ts`) reads and edits the `review.md` format, used by both the browser and the dev server. A Vite plugin (`bin/review-plugin.mjs`), registered in `vite.config.ts`, serves `GET`/`POST /__klappe/review` in dev only and applies one step's edit per request. The review window (`src/review/view.ts`) mounts like the speaker view (`?review=1`), follows the deck over the speaker channel, and autosaves.

**Tech Stack:** TypeScript, Vite 8 dev-server middleware (Node `http`), Vitest (unit + Playwright e2e), the existing `src/speaker/channel.ts`.

**Spec:** `docs/superpowers/specs/2026-10-26-review-mode-design.md`

## Global Constraints

- Review mode exists only with the dev server; nothing of it in presentation mode, the speaker view, `klappe build`, the PDF or `klappe shot`.
- File: `decks/<id>/review.md`; a step entry is `## <deep link>`, the step's text as a `>` quote, then `### Content`, `### Storytelling`, `### Visuals` (that order, only non-empty ones); steps in deck order; with no findings the file is `# Review\n`.
- A save writes only the categories changed on one step; it never rewrites other steps or other categories.
- Entries whose deep link names no step of the deck stay in the file, after all others.
- A save must not reload the deck (the `@deck/**/*.md` glob in `src/deck/load.ts` must not take `review.md`).
- Each field shows 3–4 lines without scrolling.
- UI words come from `src/strings.ts` (`t(key, lang)`), colours only from `--k-*` tokens.
- Every user-visible change gets a CHANGELOG line under 0.6.0; e2e tests assert properties, never where text wraps.

## Review Focus

1. A finding whose text has lines starting with `#` (a pasted Markdown heading, `## #/a/b/1`) must round-trip and must not split the entry: Task 1 escapes and pins it.
2. A field cleared to whitespace removes that category, and a step with no categories left loses its entry: Task 1.
3. A hand-edited `review.md` (CRLF, an unknown `### Note` heading, text before the first entry) keeps what it does not understand after a save: Task 1.
4. A `POST` from another origin (any web page the author visits can reach `localhost`) is rejected: Task 2.
5. Fast typing sends saves that could arrive out of order and store older text: Task 3 keeps one save in flight and sends the latest values after it.

---

### Task 0: Open 0.6.0

**Files:**
- Modify: `package.json`, `package-lock.json` (version), `CHANGELOG.md` (heading), `docs/backlog.md` (one entry)

- [ ] **Step 1:** `npm version 0.6.0 --no-git-tag-version`; add `## 0.6.0 (unreleased)` above `## 0.5.1` in `CHANGELOG.md`.
- [ ] **Step 2:** Add to `docs/backlog.md`, in its ranking style: `klappe test` writes `data/TODO.md` and `media/TODO.md`, which the `@deck/**/*.md` glob in `src/deck/load.ts` takes in, so a `klappe test` run reloads an open deck.
- [ ] **Step 3:** Commit: `chore: version 0.6.0 (unreleased)`.

### Task 1: The `review.md` format

**Files:**
- Create: `src/review/file.ts`
- Test: `tests/unit/review-file.test.ts`

**Interfaces:**
- Produces:
  - `type Category = "content" | "storytelling" | "visuals"`; `const CATEGORIES: Category[]` in that order; headings `Content`, `Storytelling`, `Visuals`.
  - `interface Entry { hash: string; quote: string; findings: Partial<Record<Category, string>> }`
  - `parseReview(text: string): Entry[]` — entries in file order; a finding's text unescaped and trimmed.
  - `interface Edit { hash: string; quote: string; set: Partial<Record<Category, string>> }`
  - `applyEdit(text: string, edit: Edit, order: string[]): string` — `order` is every step's deep link in deck order.
  - `stepsWithFindings(text: string): number`

- [ ] **Step 1: Write the failing tests** in `tests/unit/review-file.test.ts`:

```ts
const T = (n: number) => `#/a/s/${n}`
const order = [T(1), T(2), T(3)]
test('the first finding creates the file with its step, quote and category', () => {
  expect(applyEdit('', { hash: T(2), quote: 'Two.', set: { visuals: 'Too dark.' } }, order))
    .toBe('# Review\n\n## #/a/s/2\n\n> Two.\n\n### Visuals\n\nToo dark.\n')
})
test('entries stay in deck order; a step not in the deck goes last', () => {
  let t = applyEdit('', { hash: '#/gone/x/1', quote: 'Old.', set: { content: 'A' } }, order)
  t = applyEdit(t, { hash: T(3), quote: 'Three.', set: { content: 'C' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: 'B' } }, order)
  expect(parseReview(t).map((e) => e.hash)).toEqual([T(1), T(3), '#/gone/x/1'])
})
test('a save sets only the categories it names', () => {
  let t = applyEdit('', { hash: T(1), quote: 'One.', set: { content: 'C', visuals: 'V' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: 'C2' } }, order)
  expect(parseReview(t)[0].findings).toEqual({ content: 'C2', visuals: 'V' })
})
test('categories come out Content, Storytelling, Visuals whatever the save order', () => { /* set visuals, then content, then storytelling; assert heading order in the text */ })
test('a whitespace-only field removes its category; an empty step loses its entry; no entries leaves "# Review\\n"', () => { /* … */ })
test('a finding with lines that start with # round-trips and does not split the entry', () => {
  const text = '## #/a/s/2 is wrong\n### Visuals\n# heading'
  const t = applyEdit('', { hash: T(1), quote: 'One.', set: { storytelling: text } }, order)
  expect(parseReview(t)).toEqual([{ hash: T(1), quote: 'One.', findings: { storytelling: text } }])
})
test('multi-line findings, quotes, pipes and non-ASCII round-trip', () => { /* "Zeile 1\n\n„Zitat“ | 3 > 2" */ })
test('a hand edit survives a save: CRLF, text before the first entry, an unknown ### heading', () => {
  const hand = '# Review\r\n\r\nNotes for Friday.\r\n\r\n## #/a/s/1\r\n\r\n> One.\r\n\r\n### Note\r\n\r\nKeep me.\r\n'
  const t = applyEdit(hand, { hash: T(2), quote: 'Two.', set: { content: 'X' } }, order)
  expect(t).toContain('Notes for Friday.')
  expect(t).toContain('### Note\n\nKeep me.')
})
test('the quote is updated to the step text the save sends', () => { /* … */ })
test('stepsWithFindings counts entries with at least one category', () => { /* … */ })
```

- [ ] **Step 2:** Run `npx vitest run tests/unit/review-file.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `src/review/file.ts`.** Escaping: on write, a finding line that starts with `#` or `\` gets a leading `\`; on read, one leading `\` is dropped. Read normalises CRLF to LF. An unknown `###` heading and its text stay with their entry, written after the known categories; text between `# Review` and the first `##` is kept. A `##` heading that is not a deep link (`#/…/…/<n>`) is kept as text.
- [ ] **Step 4:** Run the test file. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(review): read and edit the review.md format`.

### Task 2: The dev-server route

**Files:**
- Create: `bin/review-plugin.mjs`, `bin/review-plugin.d.mts`
- Modify: `vite.config.ts` (register the plugin), `src/deck/load.ts:37` (glob), `tests/e2e/setup.ts` (a temp review file)
- Test: `tests/e2e/review-route.e2e.test.ts`

**Interfaces:**
- Consumes: `applyEdit`, `CATEGORIES` from `src/review/file.ts` (Task 1).
- Produces:
  - `klappeReview({ file }: { file: string }): import('vite').Plugin` — `apply: 'serve'` only.
  - `GET /__klappe/review` → `200 { path: string; text: string }` (`path` relative to the server's cwd; `text` is `''` when the file does not exist).
  - `POST /__klappe/review` with JSON `{ hash, quote, set, order }` (types as Task 1's `Edit` plus `order: string[]`) → `200 { path, text }` with the new text; `400` for a body that is not that shape (`hash` must match `/^#\/[\w-]+\/[\w-]+\/\d+$/`, every string in `set` at most 20 000 characters, `order` at most 10 000 such hashes); `403` when the `Origin` header is present and not the server's own origin.
  - `vite.config.ts`: `file = process.env.KLAPPE_REVIEW_FILE ?? path.join(deckDir, 'review.md')`.
  - `tests/e2e/setup.ts`: sets `KLAPPE_REVIEW_FILE` to a file in a fresh temp dir before `createServer`, and `project.provide('REVIEW_FILE', file)`.

- [ ] **Step 1: Write the failing tests** in `tests/e2e/review-route.e2e.test.ts` (each test deletes the review file first; requests from a page on `BASE_URL`, so they are same-origin):
  - `'a POST writes the step\'s finding to the review file and returns it'`: POST `{ hash: '#/a/first/2', quote: 'Step 2.', set: { content: 'Typo.' }, order: [...] }`; expect the file on disk to equal the returned `text` and contain `### Content\n\nTypo.`.
  - `'a GET returns empty text before the first finding'`.
  - `'a POST from another origin is refused and writes nothing'`: Node `fetch` with `Origin: http://evil.test` → 403; the file does not exist.
  - `'a malformed body is refused'`: `hash: '../../etc'` → 400.
  - `'a save does not reload the deck'`: open `?fixture=two-scenes#/a/first/2`, set `window.marker = 1`, POST a finding from the page, wait 1 s, expect `window.marker` still `1`.
- [ ] **Step 2:** Run `npx vitest run tests/e2e/review-route.e2e.test.ts`. Expected: FAIL (404 / reload).
- [ ] **Step 3: Implement** the plugin (`configureServer` → `server.middlewares.use('/__klappe/review', …)`; synchronous read-modify-write so two requests never interleave); register it in `vite.config.ts`; change the glob to `import.meta.glob(["@deck/**/*.md", "!@deck/review.md"], …)`.
- [ ] **Step 4:** Run the test file, then `npx vitest run --project unit`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(review): a dev-server route that saves one step's findings to review.md`.

### Task 3: The review window

**Files:**
- Create: `src/review/view.ts`, `src/review/review.css`
- Modify: `src/main.ts` (mount on `?review=1`; an `R` opener), `src/input.ts` (`Action` `"review"`, key `r`), `src/strings.ts` (en keys below)
- Test: `tests/e2e/review.e2e.test.ts`, `tests/e2e/build.e2e.test.ts` (one test)

**Interfaces:**
- Consumes: Task 1's `parseReview`, `stepsWithFindings`, `CATEGORIES`; Task 2's routes; `Channel` from `src/speaker/channel.ts` (`state` in, `cmd` out); `formatHash` from `src/router.ts`.
- Produces:
  - `mountReview(root: HTMLElement, deck: Deck, steps: StepAddr[], channel: Channel): { readonly index: number }`.
  - DOM hooks for tests: `.k-review`, `textarea[data-k-review="content|storytelling|visuals"]`, `.k-rv-place` (place line), `.k-rv-moved` ("written for" line), `.k-rv-status`.
  - `src/strings.ts` en keys: `review: "Review"`, `content: "Content"`, `storytelling: "Storytelling"`, `visuals: "Visuals"`, `savedTo: "Saved to"`, `saveFailed: "Not saved"`, `stepsWithFindings: "steps with findings"`, `notInDeck: "for steps not in the deck"`, `writtenFor: "written for"`, `reviewNeedsDev: "Review mode needs the dev server: npm run dev"`.
  - `window.klappe.reviewView` on the review page, like `speakerView`.

- [ ] **Step 1: Write the failing tests** in `tests/e2e/review.e2e.test.ts` on `?fixture=two-scenes` (open the deck, press `r`, take the popup from `context.waitForEvent('page')`, as `tests/e2e/speaker.e2e.test.ts` `pair()` does; delete the review file before each test; polls get explicit timeouts):
  - `'R opens the review window on the deck\'s step, with three empty fields'`: place line contains `#/a/first/2`; three textareas empty; each textarea's `clientHeight` ≥ 3.5 × its line height.
  - `'typing saves to the step and category, without a button'`: type in Visuals; poll the file until it has `## #/a/first/2` … `### Visuals` … the text.
  - `'stepping in either window moves both, and each step shows its own findings'`: write on step 2, Next in the review window → deck index 2 and empty fields; `ArrowLeft` in the deck → the review window shows step 2's text again.
  - `'a finding removed on disk disappears on the next step or focus'`: write a finding, delete the entry from the file in Node, step away and back → field empty.
  - `'a field being typed in is not overwritten by a re-read'`.
  - `'an entry whose quote differs from the step text shows "written for"'`: write the file in Node with a wrong quote for `#/a/first/2`; `.k-rv-moved` contains the quote.
  - `'presentation mode shows no review UI'`: the deck page has no `.k-review`, and `r` there opens a popup only (the deck page's DOM is unchanged).
  - `'keys typed in a field do not step the deck'`: type `" "` and Enter in a field → deck index unchanged.
  - In `build.e2e.test.ts`: `'the built deck has no review mode'`: `?review=1` on the build shows `reviewNeedsDev`'s text; `R` on the deck opens no window.
- [ ] **Step 2:** Run `npx vitest run tests/e2e/review.e2e.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `main.ts`: `?review=1` mounts `mountReview` (dev) or one line with `reviewNeedsDev` (`!import.meta.env.DEV`), before the deck starts, as `?speaker=1` does; the deck's `review.open()` opens `?review=1` like `speaker.open()` with window name `klappe-review:<title>`, passed to `bindInput` only when `import.meta.env.DEV`. `view.ts`: layout from the spec mockup (place line, step text, three labelled textareas with `rows="4"`, Prev/Next buttons, status line); keys in a textarea are left alone, elsewhere `keyAction` drives `cmd`; re-read via `GET` on each `state` and on `focus`, skipping a field that has focus or unsaved text; autosave 500 ms after the last input, at once on a step change and `blur`, and with `fetch(…, { keepalive: true })` on `pagehide`; one save in flight at a time, the latest values sent after it (Review Focus 5); a failed save shows `saveFailed` in the status line and keeps the text; status: `savedTo` path · `stepsWithFindings` count, plus the `notInDeck` count when there are any. `review.css` in the look of `src/speaker/speaker.css`, `--k-*` tokens only.
- [ ] **Step 4:** Run `npx vitest run tests/e2e/review.e2e.test.ts tests/e2e/build.e2e.test.ts tests/e2e/speaker.e2e.test.ts`, then `npx tsc --noEmit` and `npm test`. Expected: PASS.
- [ ] **Step 5:** Look at it: `npm run dev`, open the demo deck, press `R`, type a finding; read `decks/demo/review.md`, then delete it.
- [ ] **Step 6:** Commit: `feat(review): a review window that follows the deck and saves findings per step`.

### Task 4: Claude's side and the docs

**Files:**
- Modify: `.claude/skills/klappe/SKILL.md` (new section), `docs/reference/deck-format.md:252` (keys line) and a `## Review mode` section, `CHANGELOG.md`, `DECISIONS.md`
- Test: `npx vitest run --project unit` (the docs and skill lints)

- [ ] **Step 1:** Skill section **"Work through a review"**, its rules from the spec: read `decks/<id>/review.md`; work a scene's entries from its last step to its first; for each finding, open the scene its deep link names (`npm run outline` gives the ids), make the change, check it (the walk, `npm run shot -- <section>/<scene>/<step>`), then delete that category, and the entry once empty; when a change adds, removes or merges steps in a scene, rewrite the deep links of that scene's entries still open; when a finding is unclear, ask in the chat and leave it in the file; never add to the file.
- [ ] **Step 2:** `deck-format.md`: add `` `R`: review window (dev server only) `` to the keys line; a `## Review mode` section with what the window does, the file format (Task 1's example), and the dev-only rule.
- [ ] **Step 3:** CHANGELOG under 0.6.0 `### Added`: one line for review mode (the key, the three categories, the file, dev-only, Claude works through it). DECISIONS: review findings are saved through a dev-server route, one step and only changed categories per write, positional deep links guarded by the skill rule and the "written for" line.
- [ ] **Step 4:** Run `npx vitest run --project unit`. Expected: PASS.
- [ ] **Step 5:** Commit: `docs(review): the skill works through review.md; review mode in the reference`.
