# Markdown triggers

What `scene.md` turns into an effect without a `scene.ts`. The folder and key rules are in [deck format](deck-format.md). Each list item is a step unless the row says otherwise; a `> note` after it is the speaker note.

| Trigger | Minimal example | Result | Reference |
| --- | --- | --- | --- |
| image | `- ![An engineer at a desk](media/desk.png "Prompt for the generator")` | the picture in the right-hand slot; the text in a left column | [image](effects.md#image) |
| video | `- [Intro clip](https://www.youtube.com/watch?v=dQw4w9WgXcQ)` or a link to a `.mp4` or `.webm` | a video box with the title as caption | [video](effects.md#video) |
| chart | `- [Units by quarter](data/chart-bar.csv)` | a bar chart beside the text. Other types need `scene.ts` | [chart](effects.md#chart) |
| shout-out | `### Who owns the release?` and a paragraph `The team that ships it.` | three steps: enter, fade, answer; a `> note` goes on the answer | [shout](effects.md#shout) |
| code fence with groups | ```` ```ts {1-2\|4} ```` | one step per group, its lines lit; list items after the block are the steps' text | [code](elements/code.md) |
| console fence | ```` ```console ```` with `$ npm test` and output lines | each `$ ` line types and its output appears; one step per command | [terminal](elements/terminal.md) |
| chat fence | ```` ```chat ```` with `user: Where do I start?` and `Start with the tests.` | a messenger thread in the right-hand slot; one step per message line; list items after the block are the steps' text; a line `![Ana](media/ana.jpeg)` gives that sender an avatar | [chat](elements/chat.md) |
| task list | `- [ ] Restore tested`, `- [x] Backup verified` and `- [!] Owners told` | a checklist; each item is a step that ticks its box; `[x]` starts ticked; `[!]` fails on its step | [checklist](elements/checklist.md) |
| table | `\| \| Basic \| Team \|`, a `\| --- \|` line, then rows such as `\| SSO \| ✗ \| ✓ \|` | a comparison table; each row is a step that lands its marks. `✓` (or `✔`) ticks, `✗` (or `✘`) crosses, `~` is partly, other cells show as written; the first header cell is ignored. One table per scene; a `> note` after it goes on the last row | [compareTable](elements/compareTable.md) |
| agenda rows | `- 09:45–10:30 Practice ←` | all list items start with a time range: one step shows an agenda; `←` marks the current row | [agenda](elements/agenda.md) |

Notes:

- A scene has one code, console or chat block.
- `**bold**` in a list item marks key words for `reveal` (scene.ts); a plain scene shows the asterisks.
- A mix of time ranges and plain items stays plain steps.
- A missing image, video or data file shows a placeholder and a deck problem; `klappe test` and `klappe build` list it in `media/TODO.md` or `data/TODO.md`.
- A full-frame picture, a background, a flow, a sequence, swimlanes, a decision tree, a callout and a timer have no Markdown form: use `scene.ts`.

Examples to copy are in the demo deck's catalog: `110-chart/60-markdown`, `190-media`, `210-shout`, `240-code/10-walkthrough`, `250-terminal/10-replay`, `217-chat/30-chat-md`, `298-table-card/15-compare-md`, `310-checklist-agenda`.
