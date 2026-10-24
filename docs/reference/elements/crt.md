# Retro terminal: `crt`

An 80s computer screen. It powers on, types boot lines one step at a time, shows `READY.`, and can type prompt lines after that.

Catalog: section `180-crt` (`#/crt/power-on/1`, `#/crt/teal-prompt/1`).

## `crt`

In `scene.ts`: `crt(ctx, { color, lines, prompts })` returns the handle below. From `decks/demo/sections/180-crt/20-teal-prompt/scene.ts`:

```ts
build: (ctx) => crt(ctx, { color: "teal", lines: ["DEMO-OS v1.0", "", "Loading: AI agents ............ OK"], prompts: ["> who are you?", "I read. I plan. I act. You approve."] }),
steps: [(tl, h) => h.settle(tl), (tl, h) => h.type(tl, "all"), (tl, h) => h.ready(tl),
  (tl, h) => { h.prompt(tl, 0); h.prompt(tl, 1, { cps: 136, at: "+=0.5" }) }, (tl, h) => h.hideCursor(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `color` | `"green" \| "amber" \| "teal"` or a CSS colour | `green` | the text colour. `green` is `--k-phosphor`, `amber` is `--k-phosphor-amber`, `teal` is #009A9B. Any other string is used as a CSS colour |
| `lines` | `(string \| { text, count: true })[]` | required | the boot lines. `{ text: "MEMORY TEST: 640K OK", count: true }` types the label, then counts up to the number |
| `prompts` | string[] | none | lines that type after `READY.`, on the cursor row, one `prompt()` each. They are declared here, so their DOM exists at build |
| `flash` | `"full" \| "soft"` | `full` | `soft` makes the power-on gentler: the screen opens at 1.4 times its brightness instead of 2.2, and the beam keeps more of the phosphor colour. For a calm deck, or a CRT that powers on often |

The font size fits all rows (lines, `READY.`, prompts and the cursor row) in the screen, up to 46 px. Below 20 px, the deck gets a problem.

### Step adders

| Handle | Step |
| --- | --- |
| `powerOn(tl)` | the beam flashes, then the screen settles to full brightness |
| `settle(tl)` | only the brightness settle of `powerOn`, with no beam. Use it after a `crt` transition, which already flashed the line |
| `type(tl, line)` | types line `line` (an index), or every line with `"all"` |
| `ready(tl)` | shows `READY.` and the blinking cursor |
| `prompt(tl, index, { cps?, at? })` | types `prompts[index]` on the cursor row. The cursor then rests on the next row. `cps`: characters per second, default 8 (a human) |
| `hideCursor(tl, at?)` | hides the cursor block |
| `dim(tl, { to?, at? })` | dims the screen (text and scanlines) with a brightness filter, to `to` (default 0.3) over 0.6 s. Each call starts at the level the call before it left, so `dim(tl, { to: 1 })` brings the screen back. It is a `fromTo`, so seek equals play |
| `cursorAt()` | not a step: the cursor block's centre, scene-local, on its row after the last prompt. Use it to start another effect there, for example `mesh3d`'s `show(tl, at, { from: h.cursorAt() })` |

### `root`

The handle's `root` is the `.k-retro` element, the whole CRT. A scene moves or fades it with its own tweens.

### The crt transition

`{ transition: "crt" }` in `section.ts` squashes the old canvas to a line and opens the new one. As it squashes, the old canvas fades into the line colour: the chosen colour, 70 % toward white. It takes the same colour: `{ transition: "crt", transitionOptions: { color: "teal" } }`. `flash: "soft"` in `transitionOptions` opens the new canvas at 1.4 times its brightness instead of 3, so it does not wash out to near white.

### `crtColor`

`crtColor(color)` returns the CSS colour for a `color` option: a named colour, else the string itself, else green. The transition uses it too.

### `cursorCentre`

`cursorCentre(row, size)` returns the cursor block's centre on text row `row` at font size `size`, scene-local. `cursorAt()` uses it. It is arithmetic from the layout, not a DOM measure, so it works in `build()`.

### Limits

- Monospace is allowed only under `.k-retro`.
- The typed text writes the DOM from `onUpdate`, as a pure function of progress, so seek equals play.
- Flicker and blink are CSS loops under `data-k-ignore`.
