# Review mode: design

Target: klappe 0.6.0, branch `release-0.6.0`.

## Intent

A deck author reviews their own deck before a talk and hands the findings to Claude Code to fix. Today they keep a `feedback.md` by hand, and every entry needs the exact deep link of the step plus the finding; writing down *where* is half the work. Review mode does that bookkeeping. The author steps through the deck as usual, types findings for the step on screen into a second window, and they land in a file in the deck folder, already tied to their step. Claude Code reads that file, fixes each finding, and removes it, so the file is empty again when the rework is done. Clarifying questions happen in the Claude Code chat, not in the file.

This closes the loop between agent and human: the human reviews in the browser, the agent works from the file, the human reviews again.

## Who and where

One author, on their own machine, with the deck running on the dev server (`npm run dev`) and Claude Code in the same repo. That is the only use case. A review covers the whole deck or one section: reviewing a section is just going there (section list, deep link) and stepping through it.

Review and rework take turns: the author goes through the deck (or a section), then tells Claude to work on the findings, then reviews again. They do not type findings while Claude edits the deck.

## Goals

- A review window, opened from the deck with a key, beside the deck window, like the speaker view.
- It follows the deck: stepping in either window moves both.
- For the step shown: its place (section, scene, step N of M, the deep link, `14 / 52`), its text from `scene.md`, and three fields: **Content** (text to correct), **Storytelling** (another effect, another storyline), **Visuals**. Each field shows 3–4 lines without scrolling.
- One entry per category per step, edited in place: coming back to a step shows exactly what was written there.
- Saves as you type, no Save button, into `decks/<id>/review.md`. A status line says where it saved and how many steps have findings.
- Claude Code knows how to work through the file: fix each finding, delete it from the file once dealt with, ask in the chat when a finding is unclear and leave it in the file until answered.

## Non-goals

- Findings at scene, section or deck level. A finding about a whole story arc goes on its first or last step and says so.
- Reviewing a built or published deck, or on another device. Review mode works only with the dev server.
- Several reviewers, comment threads, statuses (open, done), history. The file holds what is still open; git holds history.
- Marking an element or region on the stage.

## Anti-goals (a failure even if it works)

- Anything of review mode showing in presentation mode, the speaker view, `klappe build`, the PDF or `klappe shot`.
- Losing typed text: a save that fails, or one that overwrites what Claude removed or the author typed for another step.
- The deck reloading while the author types (see the constraint below).

## Decided

- **Option C from the mockups:** a separate window that follows the deck, not a panel in the deck window and not an overlay.
- **Three separate fields**, one per category, each 3–4 lines visible.
- **Edit in place** per step and category; stepping back and forth shows that step's findings.
- **On the step**, never above it.
- **Claude removes each finding as it deals with it**, not the whole file at the end, so a stopped session leaves exactly the open findings.
- **Clarifying questions in the Claude Code chat.**

## My calls (the author did not decide these; check them)

- **Key `R`** in the deck window opens the review window (`?review=1`), the way `N` opens the speaker view. `R` is free in `src/input.ts`. The review window is sized like the speaker view's popup.
- **The file is `decks/<id>/review.md`**, Markdown, readable and editable by hand:

  ```markdown
  # Review

  ## #/value-stream/analysis/2

  > Analysis flies into the stream.

  ### Content

  "stream" should be "value stream" in the caption.

  ### Visuals

  The label overlaps the arrow at 1366.
  ```

  One `##` per step with findings, headed by its deep link, in deck order; the step's text as a quote so Claude (and the author) see which step it was even if the deck changed since; a `###` per non-empty category, in the order Content, Storytelling, Visuals. A step whose fields are all empty has no entry. With no findings, the file is just `# Review`. The file is created on the first finding.
- **Writes go through the dev server**, per step and category: the review window sends only the categories the author changed on that step, with the step's current text for the quote; the server reads the file, replaces or removes those categories of that step's entry, and writes it back. A save never rewrites other steps or other categories, so it cannot bring back what Claude removed meanwhile. The write route exists only in the dev server (a Vite plugin `configureServer` middleware), only writes that one file, and takes only a deep link that is a step of the deck plus three strings.
- **The review window re-reads the file** when it shows a step and when its window gets focus, so findings Claude removed disappear without a reload. A field the author is typing in is not overwritten by a re-read.
- **Autosave** shortly after typing stops (about half a second), and at once on a step change, when the window loses focus, and on `pagehide` (a reload or close). A failed save shows in the status line and keeps the text in the field.
- **Deep links are positions**, so an entry can point at another step after Claude adds, removes or merges steps. Two guards: the skill tells Claude to rewrite the deep links of the entries still open in a scene whenever it changes that scene's step count (and to work through a scene's entries from its last step to its first, so its own edits shift nothing still open); and the review window compares an entry's quote with the step's current text and, when they differ, shows the finding under a line "written for: <quote>" so the author sees it may have moved. An entry whose deep link names no step of the deck stays in the file, listed at its end, and the review window's status line counts it.
- **Sync uses the speaker view's channel** (`src/speaker/channel.ts`): the review window hears `state` and sends `cmd`, as the speaker view does. Both can be open at once.
- **Outside the dev server**, `R` does nothing in the deck, and `?review=1` shows one line saying review mode needs `npm run dev`.
- **The klappe skill gets a section "Work through a review"**: read `decks/<id>/review.md`; for each step entry, open the scene its deep link names (`outline` gives the ids), make the change the finding asks, check it (the walk, `npm run shot` on that step), then delete that category's finding, and the step's entry once it is empty; ask in the chat when a finding is unclear and leave it in the file; never add to the file.

## Constraint the build must handle

The deck loader globs `@deck/**/*.md` (`src/deck/load.ts`). A `review.md` in the deck folder would be part of the deck, and every save would make Vite reload both windows mid-typing. The review file must be left out of the deck's glob and of the dev server's reload; an e2e test pins that a save does not reload the deck. (`klappe test` writes `data/TODO.md` and `media/TODO.md`, which the same glob takes in and so reload the deck too. That is out of scope here: add it to `docs/backlog.md`.)

## Left to the builder

- The review window's markup and styles, in the speaker view's look (`src/speaker/speaker.css`), using `--k-*` tokens.
- The route's name and wire format, and how the server parses and rewrites `review.md` (a small parser of the format above; tolerate hand edits: unknown `###` headings and text outside entries are kept).
- The tests. Expected at least: e2e on the dev server for typing in the review window ending up in the file under the right step and category; a re-read after the file changes on disk (an entry removed) showing the field empty; a save for one step leaving another step's entry, written meanwhile, untouched; the deck not reloading on a save; no review UI in presentation mode. Unit tests for the `review.md` parser and writer.
- Docs: a reference page (the key, the file format, the dev-only rule), the keys list, CHANGELOG under 0.6.0, `init` adding nothing new unless needed.
