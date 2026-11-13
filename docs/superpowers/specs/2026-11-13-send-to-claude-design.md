# Send to Claude: design

For klappe 1.1.0, branch `release/1.1.0`.

## Why

The author reviews a deck step by step and wants Claude Code to fix findings while the review goes on, instead of after a full pass. `review.md` is saved on every keystroke, so Claude can't just watch the file. The author needs to say when a finding is finished.

## Approaches

- **A, picked: a button in the review window plus a waiting Claude session.** Send marks findings ready in `review.md`. A Claude Code session the author keeps open waits on `npm run review:wait`, works the ready findings, then waits again. Nothing new runs inside klappe, and Claude can still ask in the chat when a finding is unclear.
- **B, dropped: the dev server spawns `claude -p` per Send.** It needs the CLI installed and logged in, permissions settled and a rule for concurrent sends. Fixes come from a process the author can't talk to.

## Design

- **File format.** A sent finding gets `#### Sent` (no body) as its last log note, beside the existing `#### Fixed` and `#### Reopened`. The last note is still the state: Sent means ready for Claude, Fixed means waiting for approval, Reopened means ready again. A finding with no note is a draft.
- **Review window.** A **Send to Claude** button for the step on screen sends all of that step's drafts. Editing the text of a sent finding makes it a draft again, because Claude must not work a finding that is still changing. The status line adds "N sent to Claude".
- **Server.** `readEdit` takes `send: Category[]`. `applyEdit` adds `Sent` only to drafts. As with approve and reopen, it checks the state on disk.
- **`npm run review:wait [deck]`** (`bin/review-wait.mjs`, also synced into deck repos like `walk`). It exits as soon as `review.md` has a finding whose last note is Sent or Reopened, and prints their deep links. It waits on `fs.watch`, not a poll loop. Claude runs it in the background and is notified when it exits.
- **Skill.** "Work through a review" gains a watch mode: when the author says "watch my review", Claude loops wait → work the ready findings (the existing rules) → wait. The author stops it in the chat. A plain "work through my review" still works every open finding, drafts included, as today.
- **Known cost.** Each fix commits and the deck reloads while the author is reviewing. That's accepted for 1.1.0.

## Checks

- Unit tests, written first: `file.ts` Sent parsing and writing, send on drafts only, an edit dropping Sent, and the counts; `readEdit` with `send`; the ready-finding check behind `review:wait`.
- e2e: Send in the review window writes `#### Sent` and the status line counts it.
- Docs, changelog and decisions: the review-mode section in `docs/reference/deck-format.md`, the README review section, a CHANGELOG 1.1.0 entry and a DECISIONS entry on why not `claude -p`.

## Left to the builder

The button's place and label styling in the review window, following the existing Approve/Reopen buttons.
