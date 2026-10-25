# Chat thread: `chat`

Replays a messenger thread, one message per step. The user's messages land whole on the right. Everyone else's sit on the left: typing dots hop, then the message streams in.

Catalog: section `217-chat` (`#/chat/thread/1`).

## scene.ts

From `decks/demo/sections/217-chat/10-thread/scene.ts`, with one message per list item in `scene.md`:

```ts
import type { gsap } from "gsap";
import { chat, chatMessage, type ChatHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("chat(ctx, { messages }) — next() shows typing dots, then the answer streams in", {
  build: (ctx) => chat(ctx, { x: 360, y: 100, w: 1200, h: 800, messages: ctx.doc!.steps.map((s) => chatMessage(s.text)) }),
  steps: [
    (tl, h: ChatHandle) => {
      h.show(tl);
      h.next()(tl);
    },
    ...[1, 2, 3, 4].map(() => (tl: gsap.core.Timeline, h: ChatHandle) => h.next()(tl)),
  ],
});
```

```md
- user: Our release checklist has 40 items. Where do I start?
- Start with the three that block a release: tests green, changelog written, version tagged.
- Ana: I can take the changelog.
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | number | required | the thread's corner and size, in scene units. Messages fill it from the top |
| `messages` | `{ from, text }[]` | required | `from: "user"` sits right; any other sender sits left. A sender other than `"user"` and `"assistant"` shows its name above the bubble in `--k-muted` |

### Step adders

| Handle | Step |
| --- | --- |
| `show(tl, at?)` | the empty thread fades in. `at`: a GSAP position; default: the end |
| `next()` | the next message, in step order. A user message fades in whole. Any other message shows typing dots that hop twice (about 1.2 s), then streams in at 50 characters a second. When the message would end below the thread, the thread first scrolls up by just enough |
| `el` | the thread's element |

The adder counts messages when the step is added, not when `next()` is called, so adders made out of step order still show the messages in step order. A `next()` past the last message shows the problem `chat: next() step N has no message (M messages)`.

Colours come from the theme: the user's bubble is `--k-bg` with a 3 px `--k-accent` border, the others are `--k-surface`, text `--k-fg`, the dots `--k-muted`. The text is `--k-font` at 32 px. Each bubble takes its final size at build, so the text never reflows while it streams. The streamed text is a pure function of the tween's progress, so a seek and a deep link show the same text as play.

Reduced motion: no typing dots, and every message fades in whole.

### Limits

- A bubble is at most 72 % of `w` wide. A message taller than `h` shows the problem `chat: message N is taller than the panel (H px)`.
- No Markdown form: the scene needs a `scene.ts`.

## `chatMessage`

`chatMessage(line)` turns a list item into a message: `"Ana: Hi"` gives `{ from: "Ana", text: "Hi" }`. A name is at most 24 characters; a line without a `name: ` prefix is the assistant's. A colon with no space after it (`10:30`, a URL) is not a prefix. An assistant line that starts with a short `Word: ` needs an `assistant: ` prefix.
