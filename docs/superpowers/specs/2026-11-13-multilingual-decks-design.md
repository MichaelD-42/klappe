# Multilingual decks: design

For klappe 1.1.0, branch `release/1.1.0`. Breaks no deck: a deck without translations works as today.

## Why

One deck is given in German one week and in English the next. Today that means copying the deck and making every fix twice. The goal is one deck, one structure and one set of fixes, with a language chosen when it is shown or exported.

## Goals, non-goals, anti-goals

- Goals: every word on stage and in the notes can be translated, including strings in `scene.ts`. Switching language changes nothing but the words. Missing and stale translations are found by the walk, not by the audience.
- Non-goals: switching mid-talk with the timeline held in place (a reload at the same deep link is fine). Translating pictures, videos or data files. Machine translation inside klappe (Claude fills the file).
- Anti-goals: a language with its own steps or scene order. Two places to fix one typo.

## Approaches

- **A, picked: one translation file per language.** The deck is written in its source language (`deck.md` `lang:`), and `lang/<code>.md` maps each source text to its translation. The structure comes from the source alone, so steps cannot drift.
- **B, dropped: parallel `scene.<code>.md` files per scene.** The translations would spread over every scene folder, and a language could get its own step count, which the walk would then have to check per language.
- **Dropped: a copied deck per language.** Every fix made twice.

## Design

**The translation file**, `decks/<id>/lang/<code>.md`, one per language other than the source, mirrors the `review.md` style: a heading per scene, the source text quoted, and the translation under it.

```markdown
# de

## opening/old-way

> The usual title slide, the way every update starts.

Die übliche Titelfolie, wie jedes Update beginnt.

> This is how work flows today.

So fließt die Arbeit heute.
```

- `## <section>/<scene>` scopes a scene's texts, so the same English word can have two German translations in two scenes. `## <section>` holds that section's title, and `## deck` holds the deck title.
- What is translated: the scene title, each step's text, notes, `###` questions, list and task items, table cells, alt text, and every string `scene.ts` passes through `ctx.t()`.
- Multi-line notes are multi-line quotes and multi-line translations.

**In `scene.ts`**, `ctx.t("This is how work flows today.")` returns the translation for the scene being built, or the source text when there is none. Strings not wrapped in `ctx.t()` stay as written. That is the migration path for existing decks: wrap the strings you want translated. A `scene.md` fence component gets its text through the same lookup.

**Choosing the language.** `deck.md` `lang:` is the source language and the default. `?lang=<code>` shows another, with the same deep link. The section list (`S`) lists the deck's languages when it has more than one, and picking one reloads at the current step. There's no new key: the language is set once per talk. The chosen language also picks klappe's UI words and number formats, as `lang:` does today. `build` writes one site with every language. `pdf`, `outline`, `shot`, `video` and `test` take `--lang <code>`.

**`klappe lang <code>`** writes or updates `lang/<code>.md` from the source deck. New source texts get an empty translation, texts whose source changed are marked stale (the old quote kept under `> was:`), and texts that left the deck are dropped. Claude, or a person, fills in the blanks. This is what makes the file workable on a 195-scene deck.

**Checks.** `klappe test --lang de` walks the deck in that language, which matters because German runs longer and can trip the safe-area and clipped-text checks. A missing or stale translation is a look warning naming the scene, so `--strict` fails on it. A `lang/` file for the source language, or a heading that names no scene, is a deck problem.

**Review mode** works in any language: deep links don't change, and the quote is the text shown. The in-place text edit (double click) only writes `scene.md` in the source language; in another language it's off, and the window says so.

## Constraints

- 1.x: no deck may break. `lang:` keeps its meaning (source language, UI words, number formats).
- Seek must equal play: the language is chosen before the deck builds, never swapped on a live timeline.
- Every user-visible change gets docs (`docs/reference/deck-format.md`, the klappe skill's translation rules), a CHANGELOG line and a demo catalog scene with a `de` translation.

## Left to the builder

- Where the lookup lives in the parse and render pipeline, as long as `scene.md` text and `ctx.t()` share it.
- Matching rules for whitespace and Markdown inline marks in the source text (normalise them; never translate by position).
- The exact look of the language list in the section list, following the existing panel.
