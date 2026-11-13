# Send to Claude Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The author sends a step's findings to Claude from the review window; a waiting Claude session picks them up.

**Architecture:** A `#### Sent` log note in `review.md` beside Fixed and Reopened. The window posts `send`; `applyEdit` marks drafts. `klappe review-wait` blocks on `fs.watch` until a Sent or Reopened finding exists, and the skill loops on it.

**Tech Stack:** TypeScript, Node ESM, Vite 8 (`runnerImport` to load `src/review/file.ts` from the CLI on any supported Node), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-send-to-claude-design.md`

## Global Constraints

- The last `####` note is a finding's state: none is a draft, `Sent` and `Reopened` are ready for Claude, `Fixed` waits for approval.
- `Sent` has no body. Only a draft can be sent; the server checks the state on disk.
- Changing the text of a Sent finding drops its Sent note (it is a draft again).
- Script name `review:wait`, CLI command `review-wait`; in deck repos `node klappe/bin/klappe.mjs review-wait`, added by `init` and `klappe:sync` like `walk`.
- English and German UI strings in `src/strings.ts`.

## Review Focus

- A finding reopened, then edited: it stays ready (Reopened is the last note); only Sent is dropped by an edit. Pinned in Task 1.
- `review-wait` started when `review.md` does not exist yet: it waits instead of failing. Pinned in Task 2.
- `review-wait` started with ready findings already present: it exits at once. Pinned in Task 2.
- An editor that saves by rename (fs.watch on the file loses it): watch the folder, not the file. Pinned in Task 2 by writing via rename.
- Send pressed while text is still unsaved: the text goes first, in the same queue. Pinned in Task 3.

---

### Task 1: Sent in the file model and the server

**Files:** Modify `src/review/file.ts`, `bin/review-plugin.mjs` (`readEdit`). Test: `tests/unit/review-file.test.ts`, the readEdit tests (wherever `readEdit` is tested today).

**Produces:** `Edit.send?: Category[]`; `Entry.sent?: Category[]`; `readyFindings(text: string): string[]` (deep links with a Sent or Reopened finding, deck order of the file); `sentToClaude(text: string): number` (findings whose last note is Sent).

- [ ] Tests: send on a draft writes `### Content\n\nX\n\n#### Sent\n`; send on a Fixed finding does nothing; a `set` that changes a Sent finding's text drops Sent, the same text keeps it; a `set` on a Reopened finding keeps Reopened; `readyFindings` lists Sent and Reopened, not drafts or Fixed; `sentToClaude` counts; `stepsWithFindings` still counts Sent steps as open; `readEdit` accepts `send: ['content']` and refuses `send: ['x']`.
- [ ] Run `npx vitest run --project unit tests/unit/review-file.test.ts`: fail.
- [ ] Implement: `LOG` takes `Sent`; `applyEdit` handles `send` after approve/reopen; drop a trailing Sent in the `set` loop when the text changes.
- [ ] Run: pass. Commit.

### Task 2: `klappe review-wait`

**Files:** Create `bin/review-wait.mjs`. Modify `bin/klappe.mjs` (command list, usage, `init` scripts), `bin/sync-claude.mjs` (adds `review:wait` like `walk`), `package.json` (`"review:wait": "node bin/klappe.mjs review-wait --deck demo"`). Test: `tests/unit/review-wait.test.ts`, `tests/unit/cli.test.ts` for the sync script.

**Consumes:** `readyFindings` from Task 1. **Produces:** `waitForReady(file: string, ready: (text: string) => string[]): Promise<string[]>`.

- [ ] Tests: resolves at once when ready findings exist; resolves after a later write (including via rename into place, and with the file absent at start); does not resolve on a draft-only write; sync adds `review:wait` and keeps an author's own.
- [ ] Run: fail. Implement: `fs.watch` on the folder, re-check on each event; `klappe.mjs` loads `file.ts` with `runnerImport`, prints the deep links, exits 0.
- [ ] Run: pass. Commit.

### Task 3: The Send button

**Files:** Modify `src/review/view.ts`, `src/review/review.css` if needed, `src/strings.ts`. Test: `tests/e2e/review.e2e.test.ts`.

- [ ] Tests: typing a finding and pressing **Send to Claude** writes `#### Sent` under it (text unsaved before the click still lands first); the status line shows `sent to Claude: 1`; the button is disabled on a step with no drafts.
- [ ] Run `npx vitest run tests/e2e/review.e2e.test.ts`: fail. Implement through `act`/queue like Approve. Pass. `npm run shot` is not needed (the review window is not a deck scene); look at a Playwright screenshot of the window once. Commit.

### Task 4: Docs, skill, changelog, decisions

**Files:** `docs/reference/deck-format.md` (review mode), `README.md` (review section), `.claude/skills/klappe/SKILL.md` (watch mode in "Work through a review"), `CHANGELOG.md` (open `## 1.1.0 (unreleased)`), `DECISIONS.md` (why not `claude -p`).

- [ ] Write them. Run `npx tsc --noEmit` and `npm test`: pass. Commit.
