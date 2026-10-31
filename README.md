<p align="center"><img src="docs/klappe-icon.png" width="140" alt="klappe icon: a film clapperboard"></p>

<h1 align="center">klappe</h1>

<p align="center"><b>Animated presentations as code.</b><br>
Write scenes in Markdown, add motion in TypeScript, and present on one infinite canvas: the camera flies from scene to scene.</p>

<p align="center">
<a href="https://github.com/MichaelD-42/klappe/actions/workflows/ci.yml"><img src="https://github.com/MichaelD-42/klappe/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a><br>
<a href="https://michaeld-42.github.io/klappe/"><b>Live demo</b></a> ·
<a href="docs/reference/index.md">Reference</a> ·
<a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center"><img src="docs/readme/tour.gif" width="800" alt="A tour of the demo deck: the camera flies along a value stream, a bar race reorders year by year, and a spotlight moves from one box of a flow diagram to the next"></p>

## Why klappe

klappe is for conference talks and other presentations where motion carries the message, from a keynote to an engineering walkthrough. A section is one large canvas, and each scene is a place on it, so the room sees how one idea connects to the next instead of a stack of separate slides.

Every step is a label on a GSAP timeline, and an effect only adds tweens to it. That one rule buys a lot: any step has a deep link (`#/section/scene/step`), jumping back and forth always lands on the same picture, the speaker view in a second window stays in sync, and a self-test walks every step to prove that playing a step and jumping to it look the same.

A deck is a folder of Markdown and TypeScript in git, so it diffs, reviews and merges like code. It is also easy for an AI agent to write: klappe ships a Claude Code skill and builder and reviewer agents that know the deck format and its rules.

It is not a WYSIWYG editor, and it does not export PowerPoint files. It does export a PDF, one page per step.

## What you write

A scene is a folder. Its `scene.md` holds the steps: each list item is one click, a `> quote` is the speaker note.

````md
## Code walkthrough

> Explain the function one part at a time.

```js {1-2|3-5|6}
function total(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price;
  }
  return sum;
}
```

- Start the sum at zero.
- The loop adds each price.
- The function returns the sum.
````

That is a complete scene: the code is highlighted, and each click lights the next group of lines. When Markdown is not enough, a `scene.ts` next to it builds effects and gives each step its tweens:

```ts
import { chart, type ChartHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";

const scene: SceneModule = {
  build: (ctx) => chart(ctx, { src: "data/lead-time.csv", type: "slope", rect: { x: 160, y: 100, w: 1600, h: 820 } }),
  steps: [(tl, c: ChartHandle) => c.axes(tl), (tl, c: ChartHandle) => c.grow(tl), (tl, c: ChartHandle) => c.values(tl)],
};
export default scene;
```

## What's in the box

- **Markdown that animates:** bullets that step in, code walkthroughs, console sessions that type themselves, checklists, agendas, shout-outs (`### Question?`), pictures, video and charts from a CSV link.
- **Charts and numbers:** bar, stacked, line, waterfall, timeline, donut, slope and bar race; KPI tiles with a sparkline, waffle, progress ring. Each reads a `data/` file and puts its source in the speaker notes.
- **Diagrams:** flow with travelling packets, a dependency graph laid out for you, sequence, swimlanes, decision tree, git history, mind map, fishbone, layer stack, a month calendar, world map with arcs, line art that draws itself, Lucide icons.
- **Pointing:** callout, numbered hotspots on a picture, spotlight, focus, a mouse pointer that clicks, types, drags and scrolls, hand-drawn marks (ring, underline, frame, strike, arrow).
- **Effects:** shatter, CRT, zoom and blackout transitions; shout-out, swarm, morph, counters, a decoding line, before/after wipe, people figures, a QR code.
- **Backgrounds:** pictures with a slow push, looping video, animated SVG files, an aurora, your own loop, parallax.
- **Presenting:** speaker view, overview, section list, autoplay, exercise timers, deep links, and reduced motion respected (with a `?reducedmotion=0` override).
- **Checks:** a missing picture or data file shows a placeholder on stage and a line in `media/TODO.md`; the self-test and a design lint run in CI.
- **Themes:** seven built in (`calm`, `bold`, `sorbet`, `lavender`, `daylight`, `forest`, `ink`; dark, light and pastel), built from `--k-*` tokens with bundled fonts; a deck can bring its own.

Every effect has a scene in the demo deck's catalog, the sections after the story. Open the [live demo](https://michaeld-42.github.io/klappe/) and press `S` for the list.

## Quick start

You need Node with npm and Git (Git Bash on Windows). A deck repo holds your decks and carries klappe as a git subtree in `klappe/`.

```sh
git init && git commit --allow-empty -m init
git subtree add --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
node klappe/bin/klappe.mjs init --deck my-talk     # decks/my-talk/ from klappe/template/, package.json, Claude agents
npm i
npx playwright install chromium                    # once per machine, for the tests and the PDF
npm run dev                                        # http://localhost:5173
```

`npm run build -- --deck my-talk` writes a static site to `dist/my-talk/` with relative asset paths, so it works from any folder of a web server (not from `file://`, where browsers block its modules); `npm run pdf` writes `dist/my-talk.pdf`, one page per step at 1920x1080, each step as it ends (`-- --handout` writes `dist/my-talk-handout.pdf` instead: one A4 page per scene, its last step with the speaker notes under it, to send after the talk); `npm test` runs the checks, and `npm test -- --only <section>[/<scene>]` walks only those scenes, in seconds, and prints their look warnings (`--bail` stops at the first failing step). `npm run shot -- <section>[/<scene>[/<step>]]` writes PNGs of those steps at 1920x1080 and 1366x768 to `dist/shots/my-talk/` (`--last` for each scene's last step only, `--sheet` for a contact sheet per section, `--theme <name>`, `--size 1366x768` for one size, `--at <ms>` for a step that far into its play, `--url <dev server>` to reuse a running `npm run dev`); with no target it shoots every step. `npm run video` writes `dist/my-talk.mp4`, the deck played in full motion with each step held for its `auto` time or 3 s (`-- --out <file.mp4>`, `--fps`, `--hold <s>`, `--size <w>x<h>`); it needs `ffmpeg` on `PATH`. `npm run outline` prints the deck as text, every step with its note and deep-link ids, and a timing estimate against `duration` in `deck.md`. `outline`, `pdf`, `video` and `test` take `-- --cut <name>` for a cut from `deck.md` `cuts` (see [cuts and the appendix](docs/reference/deck-format.md#cuts-and-the-appendix)). With several decks in one repo, add `-- --deck <id>` to each command. `init` refuses to overwrite `decks/<id>/` and keeps an existing `package.json`, adding the klappe dependency and scripts.

## Presenting

Open the deck full screen (F11) and press `N` for the speaker view in a second window: the current step in large type, its notes, the next step, a clock and where you are (`12 / 40`).

| Key | Action |
| --- | --- |
| `→` `Space` `Enter` `Page Down`, click | next step (a presentation clicker sends these) |
| `←` `Page Up` | previous step |
| `Home` / `End` | first / last step |
| `O` / `S` | overview / section list |
| `N` | speaker view |
| `R` | review window (dev server only) |
| `A` | autoplay; any step key stops it |
| `T` | start or pause the scene's timer |
| `Esc` | close a panel |

The deck window keeps the screen awake while it shows, and a video starts on its step, so a clicker is all you need.

URL flags such as `?theme=bold`, `?autoplay=1` and `?selftest=walk` are in the [deck format](docs/reference/deck-format.md#url-flags).

## Reviewing a deck

Run the deck with `npm run dev` and press `R`: a review window opens beside it and follows the deck step by step. For each step it has a field for **Content** (text to correct), **Storytelling** (another effect, another storyline) and **Visuals**; what you type is saved as you type to `decks/<id>/review.md`. Then ask Claude Code to work through the review. It fixes each finding and marks it fixed with a line on what changed and the commit; in the window you **Approve** a fix, which removes the finding, or **Reopen** it with a note on what is still wrong. The status line counts the fixes waiting for you. See [review mode](docs/reference/deck-format.md#review-mode).

## Keeping klappe up to date

klappe follows semantic versioning; before 1.0.0 a minor version may change the deck format, so read the [changelog](CHANGELOG.md) first. Releases are `vX.Y.Z` tags on `main`.

```sh
git subtree pull --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
npm i
npm run klappe:sync    # refresh the Claude agents and skill
```

Claude Code does not find a `.claude` folder nested in `klappe/`, so `init` and `klappe:sync` copy the `klappe*` agents and skills to the deck repo's `.claude/`. A sync replaces those copies and leaves your own agents alone.

To send a fix back, commit it to `klappe/` alone, then push the subtree to a branch and open a pull request:

```sh
git subtree push --prefix klappe https://github.com/MichaelD-42/klappe.git my-fix
```

## Documentation

- [Reference](docs/reference/index.md): the deck format, every element and effect, themes, motion and the timeline rule.
- [Markdown triggers](docs/reference/markdown.md): what `scene.md` does without any code.
- [Decisions](DECISIONS.md): why klappe works the way it does.
- [Backlog](docs/backlog.md): what is planned and what is known to be missing.

## License

[MIT](LICENSE) © Michael Dold
