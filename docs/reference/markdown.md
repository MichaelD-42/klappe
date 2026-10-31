# Markdown triggers

What `scene.md` turns into an effect without a `scene.ts`. The folder and key rules are in [deck format](deck-format.md). Each list item is a step unless the row says otherwise; a `> note` after it is the speaker note.

| Trigger | Minimal example | Result | Reference |
| --- | --- | --- | --- |
| plain list items | `- Ship small.` and `- Ship often.` | one item at a time, large; the next replaces it. Frontmatter `stack: true` builds them up as a list | [deck format](deck-format.md#scenemd) |
| image | `- ![An engineer at a desk](media/desk.png "Prompt for the generator")` | the picture in the right-hand slot; the text in a left column | [image](effects.md#image) |
| video | `- [Intro clip](https://www.youtube.com/watch?v=dQw4w9WgXcQ)` or a link to a `.mp4` or `.webm` | a video box with the title as caption | [video](effects.md#video) |
| chart | `- [Units by quarter](data/chart-bar.csv)` | a bar chart beside the text. Other types need `scene.ts` | [chart](effects.md#chart) |
| shout-out | `### Who owns the release?` and a paragraph `The team that ships it.` | two steps: the question, then the answer; a `> note` goes on the answer | [shout](effects.md#shout) |
| code fence with groups | ```` ```ts {1-2\|4} ```` | one step per group, its lines lit; list items after the block are the steps' text | [code](elements/code.md) |
| console fence | ```` ```console ```` with `$ npm test` and output lines | each `$ ` line types and its output appears; one step per command | [terminal](elements/terminal.md) |
| chat fence | ```` ```chat ```` with `user: Where do I start?` and `Start with the tests.` | a messenger thread in the right-hand slot; one step per message line; list items after the block are the steps' text; a line `![Ana](media/ana.jpeg)` gives that sender an avatar | [chat](elements/chat.md) |
| task list | `- [ ] Restore tested`, `- [x] Backup verified` and `- [!] Owners told` | a checklist; each item is a step that ticks its box; `[x]` starts ticked; `[!]` fails on its step | [checklist](elements/checklist.md) |
| table | `\| \| Basic \| Team \|`, a `\| --- \|` line, then rows such as `\| SSO \| ✗ \| ✓ \|` | a comparison table; each row is a step that lands its marks. `✓` (or `✔`) ticks, `✗` (or `✘`) crosses, `~` is partly, other cells show as written; the first header cell is ignored. One table per scene; a `> note` after it goes on the last row | [compareTable](elements/compareTable.md) |
| agenda rows | `- 09:45–10:30 Practice ←` | all list items start with a time range: one step shows an agenda; `←` marks the current row | [agenda](elements/agenda.md) |
| deck component | ```` ```speakerProfile ```` with `email: carla@example.com` | the deck's own fence from its `components.ts`: it draws the whole scene from the fence and the list items; the steps are the list items, as with a code fence | [deck components](#deck-components) |

Notes:

- A scene has one code, console or chat block.
- `**bold**` in a list item marks key words for `reveal` (scene.ts); a plain scene shows the asterisks.
- A mix of time ranges and plain items stays plain steps.
- A missing image, video or data file shows a placeholder and a deck problem; `klappe test` and `klappe build` list it in `media/TODO.md` or `data/TODO.md`.
- A full-frame picture, a background, a flow, a sequence, swimlanes, a decision tree, a callout and a timer have no Markdown form: use `scene.ts`.

Examples to copy are in the demo deck's catalog: `110-chart/60-markdown`, `190-media`, `210-shout`, `240-code/10-walkthrough`, `250-terminal/10-replay`, `217-chat/30-chat-md`, `298-table-card/15-compare-md`, `310-checklist-agenda`, `109-speaker`.

## Deck components

A deck registers its own fences in `components.ts` at the deck root, next to `deck.md`. Its default export maps a fence name to a builder (`import type { Components } from "klappe/types"`). A `scene.md` with a ```` ```<name> ```` fence then gets the builder's scene and needs no `scene.ts`. Use it for a shape the deck repeats: a speaker, a product card, a team member.

```ts
import type { Components } from "klappe/types";
import { text } from "klappe/fx";

export default {
  // ```quote with the source as body; the first list item is the quote.
  quote: (ctx, body, info) => {
    const q = text(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 300, w: 1600, size: 64, weight: 700 });
    const by = text(ctx, { text: body.trim(), x: 160, y: 600, w: 1600, color: "--k-muted" });
    return [(tl) => (q.show(tl), by.show(tl))];
  },
} satisfies Components;
```

- A builder is `(ctx, body, info) => StepAdder[]`: `ctx` is the scene's, as in a `scene.ts` `build`; `body` is the fence's text; `info` is the info string after the name (```` ```quote wide ```` gives `"wide"`). Read the title and the step words from `ctx.doc`. Build hidden, then return the step functions, one per scene step from the first; a step past the end of the array plays nothing.
- The component draws the whole scene: klappe sets no title and no step text of its own. A `scene.ts` with `build` in the same folder wins.
- The steps are counted from `scene.md` as for a code fence, so `outline` counts them without loading `components.ts`: each list item is a step, and a fence with no list item after it is one step.
- A builder that throws shows EFFECT MISSING and a deck problem. A name klappe draws itself (`console`, `chat`, a code language) is a deck problem, and the built-in fence wins. A fence name nobody registered is a code block in a language Shiki does not bundle, as before.
- A component is deck code: the effects it imports load as a `scene.ts`'s do. A scene factory from `shared/` (see [deck format](deck-format.md#reuse-a-scene-with-options)) runs in a component by calling its `build`, then its steps with the refs; the demo's `decks/demo/components.ts` does this for `speakerProfile`.

Catalog: `109-speaker/10-profile` (```` ```speakerProfile ````) and `109-speaker/20-plan-chip` (```` ```planChip ````), both from `decks/demo/components.ts`, neither with a `scene.ts`.
