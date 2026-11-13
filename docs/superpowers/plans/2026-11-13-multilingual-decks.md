# Multilingual Decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One deck shown and exported in any language it has a `lang/<code>.md` for.

**Architecture:** `src/deck/lang.ts` parses translation files and maps every translatable field of the assembled deck; `assembleDeck(files, modules, lang)` applies it, so the browser, `outline` and the fixtures share it. `ctx.t()` looks a literal up scene → section → deck. `klappe lang <code>` writes the file from the source deck. `--lang` travels like `--cut`.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-multilingual-decks-design.md`

## Global Constraints

- No deck breaks: no `lang/` folder and no `?lang=` means today's behaviour, byte for byte.
- `meta.lang` is the language shown (UI words, number formats); `meta.source` is `deck.md` `lang:`; `meta.languages` is the source first, then each `lang/*.md`.
- Scopes: `deck`, `<section>`, `<section>/<scene>`. Keys compare with whitespace collapsed.
- Stale marker: `<!-- was: <old source> -->` between the quote and the translation (a comment, not `> was:`, so it can't be mistaken for a quoted note).
- Missing and stale translations are walk warnings (`--strict` fails); the source text shows in their place.

## Review Focus

- A step whose text is also a table row label: one entry translates both. Task 1.
- A note over several paragraphs: the multi-line quote and translation survive a parse/write round trip. Task 1.
- `klappe lang` run twice: the second run changes nothing. Task 3.
- `?lang=` naming a language the deck lacks: a deck problem, source shown. Task 1.
- `--only` walk in a language: only the walked scenes' translation warnings. Task 2.

---

### Task 1: `src/deck/lang.ts` and `assembleDeck`

Files: create `src/deck/lang.ts`, `tests/unit/lang.test.ts`; modify `src/deck/assemble.ts`, `src/types.ts` (`DeckMeta.source`, `DeckMeta.languages`, `Deck.translate`, `Deck.langWarnings`), `src/deck/load.ts` (`?lang=`).

Produces: `parseLang(md): Map<scope, Map<key, { source, text, was? }>>`; `eachText(deck, fn: (scope, text) => string)`; `assembleDeck(files, modules, lang?: string | null)`.

- [ ] Tests first: titles, steps, notes, alt, table, agenda and section/deck titles translate; missing and stale warn; unknown heading and source-language file are problems; unknown `?lang=` is a problem. Implement. Pass. Commit.

### Task 2: `ctx.t`, the walk, the language list, review edit

Files: `src/types.ts` (`Ctx.t`), `src/render/world.ts`, `src/render/overlay.ts`, `src/selftest.ts`, `src/main.ts`, `src/ui/selector.ts`, `src/review/edit.ts`, `src/strings.ts`, a fixture with a `lang/de.md`, e2e tests in `tests/e2e/fx-options.e2e.test.ts`-style shared file or a new `tests/e2e/lang.e2e.test.ts`.

- [ ] e2e first: `?lang=de` shows the German title, step text and `ctx.t` string; the walk reports a missing translation as a warning; the section list switches language; double-click edit is off in a translation. Implement. Pass. Commit.

### Task 3: CLI

Files: create `bin/lang.mjs`; modify `bin/klappe.mjs` (`lang` command, `--lang` for outline, pdf, shot, video, test), `bin/outline.mjs` (reads `lang/*.md`, takes `lang`), `bin/shot.mjs`/`openDeck` (lang param), `tests/e2e/walk.e2e.test.ts` (`KLAPPE_LANG`); tests in `tests/unit/cli.test.ts` and `tests/unit/lang.test.ts`.

- [ ] Tests first: `klappe lang de` writes every text with empty translations, keeps filled ones, marks a changed source stale, drops gone ones, is idempotent, picks up `ctx.t` literals by scope; `outline --lang de` prints German. Implement. Pass. Commit.

### Task 4: Demo, docs

Files: `decks/demo/lang/de.md` (deck title and a catalog scene), a catalog scene using `ctx.t`, `docs/reference/deck-format.md`, skill, README, CHANGELOG, DECISIONS; remove the backlog entry.

- [ ] Write. `npm run shot` the catalog scene in both languages and read the PNGs. `npx tsc --noEmit`, full `npm test`. Commit.
