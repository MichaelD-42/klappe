# Deck format

The folders and files of a deck, and what each Markdown form does. The demo deck in `decks/demo` shows every rule.
It covers spec examples A (old way), B (value stream), C (global team). Boot, Coming together and Working on the topic come in M2.

## Folders

Use numeric prefixes. They set the order. The prefix is not part of the id.

A section or scene folder whose name starts with `_` (`_30-backup`) is parked: its files stay in `sections/`, but the deck, `outline` and `klappe test` leave it out and its `scene.ts` is not loaded. Rename it back to bring it in.

```
decks/<id>/
  deck.md
  sections/
    10-opening/
      section.md          # "# Title", optional "> notes"
      section.ts          # optional: canvas-wide backdrop
      10-old-way/
        scene.md
        scene.ts          # optional
  components.ts           # optional: the deck's own scene.md fences, see markdown.md#deck-components
  shared/                 # optional: helpers and scene factories, not loaded as scenes
  icons/                  # optional: own icons, <name>.svg on Lucide's 24 grid, used by name in icon(); <repo>/icons/ is shared by all decks
```

## deck.md

Frontmatter keys:

- `title`: required. It is also the page title in the browser tab.
- `lang`: default `en`. klappe's own words (the speaker view, "Sample data", "Time's up", the likert scale) come in English and German (`de`, also `de-DE`); any other language shows English. Numbers and dates follow `lang` in every language.
- `theme`: a theme name: `calm` (default), `bold`, or your own. See [themes](themes.md).
- `intensity`: `calm` or `bold`. Default is the theme.
- `confidential`: `true` or `false`. Default `false`.
- `shared-canvas`: section ids that share one canvas, for example `[value-stream, results]`. Use a list of lists for several groups.
- `safe-area`: the frame inset that `?selftest=walk` keeps ink inside, in scene px, in CSS order: `48`, `[48, 64]` (top and bottom, sides), `[48, 120, 155]` (top, sides, bottom) or `[top, right, bottom, left]`. Default `[48, 64]`. Raise the bottom value for a logo or footer. See [Look checks](#look-checks).
- `max-words`: the most words a step's on-screen text may have, for example `12`. Only the list item counts, not its notes. `klappe test` fails for each step over it and names it: `#/<section>/<scene>/<step>: 14 words > 12`. Without the key, nothing is checked.
- `frame`: the stage's shape: `16:9` (default, 1920x1080 scene px), `4:3` (1440x1080), `1:1` (1080x1080) or `9:16` (1080x1920, vertical). Scene frames, the camera, backgrounds, the overlay, transitions, the overview cards, `shot`, `pdf` and the safe-area check follow it, and full-frame picture prompts in `media/TODO.md` name it. Landscape frames stay 1080 high, so text sizes read the same. Effects and `scene.ts` coordinates are in scene px: a scene written for 16:9 needs its positions redone for another frame; use `ctx.rect.w` and `ctx.rect.h` rather than 1920 and 1080. Another value is a deck problem and gives 16:9.
- `tempo`: `slow`, `normal` (default) or `fast`. Scales the step fade (0.6 s), the camera flight (1.6 s) and the `autoplay` hold (2.5 s) by 1.4, 1 or 0.75: a slower board talk, a quicker demo day. Effects with their own fixed times, and your own tweens in `scene.ts`, keep their durations.
- `duration`: the talk's planned length in minutes, for example `45`. `klappe outline` compares its timing estimate with it, and the speaker view's [rehearsal](#keys) compares the run total.

## deck.css

Optional. Put `decks/<id>/deck.css` next to `deck.md` for a corporate look.
A theme file holds tokens only; deck.css holds the deck's fonts (`@font-face`) and its own component classes, and it loads after the theme.
It may also override `--k-*` tokens. The contrast check measures the result.
A `url()` is relative to the deck folder, for example `url(./fonts/brand.woff2)` or `url(./media/logo.png)`. The build bundles these files.
The design lint checks deck.css too. In-code test fixtures (`?fixture=`) ignore it.

## scene.md

- `## Title` names the scene. It is required.
- Each list item is one step. In a scene of plain text items (no media, code, task list, table or agenda), each item gets the stage to itself, set large under the title, and fades out when the next one shows. To build them up as a list instead, start the file with frontmatter `stack: true`:

  ```markdown
  ---
  stack: true
  ---
  ## Three reasons
  ```

- Frontmatter `story: <one sentence>` is the scene's takeaway for the room, what they should know or believe after it; not what it shows. It is optional. `klappe outline --story` prints one line per scene in deck order, its deep link and story point (`(no story point)` where missing), and nothing else; plain `outline` shows it under the scene title. The content review reads that list to judge the deck's arc.
- Frontmatter `layout:` picks a named composition for the scene (catalog: `191-layouts`); without it, the column, or text left and media right, stays. Pick one by name before you place anything by hand. `thirds`: the text in the left third, the image, video or chart in the right two thirds. `full-bleed`: the first image fills the frame and its step text is a caption at the bottom on a `--k-scrim` layer of 0.7, so the text reads on any picture; the scene needs an image. `big-number`: the first step must start with a number (a sign or currency sign before it and a unit after, written without a space: `42%`, `$1.2M`, `3.5x`); that word is set large, filling the width within the side padding, and the rest of the step and every later step are footnotes under it, which add up rather than replace each other. Any other name is a deck problem that lists these three.
- A `> note` is a speaker note. It belongs to the step above it. Before the first step, it belongs to the scene. A note indented under a list item belongs to that item. Several notes on one step are kept in order, and a blank `>` line starts a new paragraph.
- A `### Question?` followed by a paragraph is a shout-out. The heading must end with `?`. It makes 2 steps: the question, then the answer. A `> note` after it attaches to the answer step. For a pause between them, build it in `scene.ts` and call `fade` on a step of its own.
- A scene with no list items gets one step with the title.
- A list item with `![alt](media/x.png "prompt")` shows an image. A link to YouTube, Vimeo, or a `.mp4` or `.webm` file shows a video. A link to `data/x.csv` or `data/x.json` shows a chart. The link shows as its label in the text. Without `scene.ts` `build()`, the text goes in a left column and the media on the right.
- An image on the next line of a video link, in the same list item, is the video's offline fallback: `- [A talk](https://youtu.be/x)` then `  ![A still](media/still.jpeg)`. With no network (`navigator.onLine` is false, or `?offline=1`), an online video shows that image with the caption "Video needs a network connection". Without a fallback, it shows the empty video box and a deck problem. klappe cannot tell when a YouTube or Vimeo embed fails to load, so on a network without internet use `?offline=1`. An image in its own list item is a separate step, not a fallback.
- A fenced code block with a language shows code in the right-hand slot, highlighted for ts, js, python, bash, json, yaml, sql, html and css. Another language shows plain, with the problem `language "<lang>" not bundled; shown plain`. Highlight groups after the language, ```` ```ts {1-2|4} ````, make one step per group: its lines light up and the others dim. The list items after the block are those steps' text, in order. More groups than items gives steps without text; more items than groups gives plain steps. Without groups, the block is one step. One code, console, chat or [deck component](markdown.md#deck-components) block per scene.
- A ```` ```console ```` block replays a terminal session. Each `$ ` line is a command: it types itself, then its output lines appear. Each command is one step, and the list items after the block are their text, as for code. A console block with no `$ ` line is a problem.
- A ```` ```chat ```` block replays a messenger thread in the right-hand slot. Each non-empty line is one message and one step: `user: …` sits on the right, `Name: …` on the left under the name, and a line with no prefix is the assistant's. The list items after the block are the steps' text, as for code. A chat block with no message is a problem.
- Task-list items, `- [ ] Backup verified`, build one checklist: each item is a step that ticks its box. `- [x]` starts ticked.
- A scene whose list items all start with a time range, `- 09:00–09:45 Basics`, shows an agenda in one step. A trailing `←` marks the current row. A mix of time ranges and plain items stays plain steps.
- A missing file shows a placeholder box (IMAGE MISSING, VIDEO MISSING or DATA MISSING) and a deck problem, not a blank slide. `klappe test` and `klappe build` write `media/TODO.md` and `data/TODO.md` with one line per missing file. They read the links in `scene.md` and the `href: "media/..."` values in `scene.ts` and `section.ts`. For an image, the line holds a prompt made from the scene heading and the link's title (the `"prompt"` part, else the alt text), or the `alt` next to the `href` in a `.ts` file. A title stays as written. A prompt from alt text gets a shape: ", square, 1024x1024, no text, no logos" for a `scene.md` image, which shows in a near-square column, and ", 16:9, 1920x1080, no text, no logos" for an image in a `.ts` file, the shape of a full-frame picture or background; edit the line for an image with a smaller `rect`. A `.ts` file only counts an `href` written as a plain string in the call's `{ ... }`; a path built at run time is not listed. Full-frame pictures and backgrounds need `scene.ts` or `section.ts` (see Effects); there is no Markdown syntax for them.

## scene.ts

Use `import type { SceneModule } from "klappe/types"`. Export a default `SceneModule`.

- `place(rects)` returns the scene's home frame. The engine flies the camera there when the scene starts. `rects` holds the home frames of the scenes before this one on the same canvas, keyed by scene id. Use it to place a scene relative to an earlier one. Without `place()`, a scene gets a frame the size of the stage (1920x1080 for the default `frame`) at x = its position on the canvas times the frame width.
- `build(ctx)` creates all DOM, hidden. Return the refs you need. Steps receive them.
- `steps` is an array with one function or `null` per step. It lines up with the list items by position. `null` or a missing entry gives the default step, which shows the step text. A step function is `(tl, refs, ctx) => void`.
- `auto` is an array with one number or `null` per step. It lines up with the steps by position. A number N advances the deck by itself N seconds after the step has played forward. It also goes into the next scene and through a section transition. `null` or a missing entry waits for a press. A deep link, a jump, a back move and `?instant=1` never advance by themselves. A press during the wait advances one step at once. Opening the overview or the section list stops the wait. Autoplay holds a step for its `auto` time. Example: `auto: [null, 1, 0.5]`.
- `overviewLabel` replaces the scene's title on its button in the overview (`O`). Without it, a scene title that repeats in the deck shows as `<section> · <title>`, for example `Lab · Today`.
- In a step, only add tweens to `tl`. Do not use `.from()`; use `fromTo`. Do not change the DOM in callbacks, with one exception: `onUpdate` may write the DOM as a pure function of the tween's progress. Mark such an element with `data-k-text` (text) or `data-k-progress` (a progress value), so the self-test compares it.
- `"<"` is fine after a tween this step added. Never use `"-="` or `"<"` as a step's first position. A step starts at its own label, and an offset before it can pull the tween into the previous step.
- Use `ctx.camera.to(tl, rect, { duration, at })` for camera moves inside a scene, after the entry.
- Use `follow(ctx, travel(…))` to keep a travelling element centred, and `impactShake(ctx)` for a jolt when it lands: see [camera](elements/camera.md).
- `camera: { duration, ease, whip }` sets how the camera flies into the scene: seconds, a GSAP ease name, or a whip, a fast pan with motion blur for far scenes. `ctx.camera.to` takes the same three. See [camera](elements/camera.md#pacing-ease-duration-whip).
- `ctx.camera.to` also takes `tilt` (degrees): the flight leans a little into its direction and lands flat. `tilt(ctx, rect)` is the step adder for it; see [camera](elements/camera.md).
- Keep one master timeline per canvas. The engine owns it.

### Put an effect inside a box

An effect builds in `ctx.html`. To build one inside your own element (a card, a band), pass a context with that element as `html` and its size as `rect`: `timer({ ...ctx, html: box, rect: { ...ctx.rect, w: 600, h: 320 }, safe: { x: 0, y: 0, w: 600, h: 320 } }, …)` (set `safe` too, or `bigType`, `lowerThird` and `endRoll` default to the scene's safe area; or pass their `rect`). Its `x` and `y` are then relative to the box, and an effect that measures or fits its text reads the box's size from `rect`. The box must be positioned (`position: absolute` or `relative`). An effect that draws in `ctx.svg` still draws in the scene's SVG layer, so this is for HTML effects. klappe has no `parent` option on effects (DECISIONS, 2026-10-30).

### Reuse a scene with options

When several scenes share one shape and differ only in their words or numbers, write the shape once as a function that takes options and returns a `SceneModule`. Put it in `decks/<id>/shared/`. klappe loads every `.ts` under `sections/` as a scene or section module, so a helper there would be taken for one. Each scene then needs two lines:

```ts
import { transitionCard } from "../../../shared/transition-card";
export default transitionCard("layers", "right");
```

- Return a new object from each call. Keep no DOM or state at module level: two scenes that use the factory can be built at once.
- The factory fixes the number of step functions, so every `scene.md` that uses it needs that many list items. A mismatch is a deck problem.
- `scene.md` still gives the title, the step text and the notes. Read them in `build(ctx)` from `ctx.doc` (`title(ctx)` does), so the options carry only what differs.
- A factory result is a plain `SceneModule`, so another wrapper can take it, as the demo's `captioned(text, scene)` does.
- The path counts folders: from `sections/<section>/<scene>/scene.ts` it is `../../../shared/`.

Catalog: every card of the transition gallery (`#/tr-cut/cut-card/1` to `#/tr-magicmove/magicmove-card/1`) calls `transitionCard()` from `decks/demo/shared/transition-card.ts`.

### A speaker profile

`decks/demo/shared/speaker-profile.ts` is a factory to copy into a deck's `shared/`: a photo (or several, one per statement), the name, the role and company with a logo, a short CV, statements one per step, and a contact step with a QR code, an email and a web address. Catalog: `#/speaker/profile/1`, which calls it from a ```` ```speakerProfile ```` fence that `decks/demo/components.ts` registers (copy that entry too; see [deck components](markdown.md#deck-components)). The words come from `scene.md`: the title is the name, then one list item each for the role line, the CV, every statement, and the contact step's label under the QR code. The options carry the rest; from a `scene.ts`:

```ts
import { speakerProfile } from "../../../shared/speaker-profile";

export default speakerProfile({
  photos: [{ href: "media/portrait.png", alt: "Carla Rivera on stage" }],
  logo: { href: "media/logo.svg", alt: "Kestrel Labs" },
  linkedin: "https://www.linkedin.com/in/<profile>",
  email: "carla@example.com",
  web: "example.com/talks",
  statements: 2, // the statement items in scene.md
});
```

It is a factory and not an effect because it only lays out `image`, `qr` and `text`, and each deck wants its own arrangement: change the copy, not an API.

## section.ts

Export a default `SectionModule`. `build(ctx)` draws the backdrop for the whole canvas and returns refs. Scenes read them from `ctx.canvas.refs`. `ctx.canvas.rects` holds each scene's home frame, keyed by scene id. The layout supplies it, not the section.

- `tokens: { "--k-bg": "#ffffff", "--k-fg": "#0f1b2d", … }` overrides `--k-*` tokens for this section's scenes only, so a deck can pace like a magazine: an inverted run between diagram sections. Any token works (colours, `--k-size-*`, `--k-radius`, `--k-font`); effects that read a size in code follow it too. A key that does not start with `--k-` is a deck problem. With `--k-bg` and no `background` of its own, the section pins a plain `--k-bg` layer behind its scenes, so the whole frame is inverted, not just the boxes; it fades with the canvas and cross-fades with a neighbouring section's backdrop. A section with a `background` picture keeps the picture as its backdrop. A section that overrides colours is contrast-checked like the theme (see [themes](themes.md#contrast-rules)): only the pairs that touch an overridden token, against the deck theme for the rest. An inverted section should also set the code and series tokens (a `klappe theme --light` file is a source to copy). A section `background` picture and the overlay keep the deck's tokens. Catalog: `#/rhythm/inverted/1`.
- `transition` sets how the deck enters this section when it moves forward by one step onto a new canvas: one of the twelve names (see Transitions below) or your own function. Default `fade`. A back move, a jump and `?instant=1` always cut.
- `zoomTarget` names a ref on the old canvas for `transition: "zoom"`.
- `overviewLabel` replaces the section's title in the overview: the row title and the prefix of a repeated scene title.
- `transitionOptions` passes extra options to the transition, for example `{ shards: 20 }`; an own function gets them as its third argument.
- An own transition is a function `(from, to, opts) => timeline` (type `OwnTransition` from `klappe/types`). klappe calls it once per forward move onto this section's canvas, not at load. `from` and `to` are the old and the new canvas: `.el` is what to show, hide or move, `.world` the camera's layer inside it. `opts` is `transitionOptions`, plus `target` when `zoomTarget` is set. The GSAP timeline it returns must end with `from.el` hidden and `to.el` shown, and carry a label `reveal` where the first step of the new section starts: `addLabel("reveal")`, at 0 for a transition that shows the new canvas at once. `to.el` must be shown by then. Only the timeline moves things (no wall clock), so `klappe video` and a seek see the same frames. A layer the function adds, such as the bar below, is found or made under `from.el.parentElement` by a `data-k-*` attribute, so the next call reuses it; the timeline shows and hides it with tweens or `.set`, and nothing removes it. A function without a `reveal` label is a deck problem naming the section and plays a `fade`; so does one that throws (the error is logged). With reduced motion an own transition is not called: a `fade` plays. Colours from `--k-*` tokens only. Example, a bar in the accent colour that sweeps over the frame (catalog: `#/tr-own/own-card/1`):

```ts
const wipe: OwnTransition = (from, to) => {
  const back = from.el.parentElement!;
  let bar = back.querySelector<HTMLElement>(":scope > [data-k-wipe]");
  if (!bar) {
    bar = back.appendChild(document.createElement("div"));
    bar.dataset.kWipe = "";
    Object.assign(bar.style, { position: "absolute", inset: "0", zIndex: "2", background: "var(--k-accent)" });
    gsap.set(bar, { autoAlpha: 0 });
  }
  return gsap.timeline()
    .fromTo(bar, { xPercent: -100, autoAlpha: 1 }, { xPercent: 0, duration: 0.4 })
    .set(from.el, { autoAlpha: 0 }).set(to.el, { autoAlpha: 1 })
    .addLabel("reveal")
    .to(bar, { xPercent: 100, duration: 0.4 })
    .set(bar, { autoAlpha: 0 });
};
export default { transition: wipe } satisfies SectionModule;
```
- `background` puts a full-frame picture from `media/` behind every scene of the section: `{ href: "media/sky.png", alt: "A night sky over a plant", scrim: 0.6, kenBurns: true }`. The background is pinned to the screen: the camera moves the scene content over a still picture. A `scene.ts` can set its own `background` too; it replaces the section's while that scene is in view, and the two cross-fade as the camera flies in and out. The first scene's background is visible from load and fades in with its canvas; no step shows it. Canvas transitions carry it along: the zoom dives into it, the shatter breaks it. `scrim` (0 to 1) lays the theme's `--k-scrim` over it for text on top (black, or white in a light theme); use 0.6 or more, so theme text keeps 4.5:1 contrast over any picture. `scrimSide` (`"bottom"`, `"left"` and so on) lays it on that side only, full over 45% of the frame and clear by 85%, so the rest of the picture keeps its light; keep the text on that side. `kenBurns` adds a slow push of 6 s, once, from the first step of the first scene that shows the background; reduced motion leaves it out. `alt` describes the picture: a missing file then shows a prompt in its placeholder and in `media/TODO.md`.
- An animated background: an `href` to a `.mp4` or `.webm` file in `media/` plays muted in a loop and covers the stage (`kenBurns` is for pictures only); `{ animate: "aurora" }` instead of `href` draws a slow drift of light in the theme's accent colours, with no file. `scrim` works for both. They move on the wall clock, not with the steps: under `data-k-ignore`, so the self-test leaves them out. Only the background on screen moves; the one the camera leaves stops once the flight has landed. With reduced motion and in the self-test they stay still. Two more kinds move the same way. An `.svg` `href` whose file animates itself (CSS keyframes or SMIL) is inlined, sanitised as `lineArt` is but with its animations kept, in a shadow root, so its styles and ids stay its own; its `<style>` can use the theme tokens (`stroke: var(--k-line)`). A still `.svg` stays a picture. And `animate` takes a function, `(el) => ({ play, pause })`: it draws into `el` (the whole stage) and returns how to play and pause its loop, which it starts paused; klappe calls them. Catalog: `#/fullscreen/svg-loop/1`, `#/fullscreen/own-loop/1`. Catalog for a video: `#/fullscreen/video-loop/1`. A missing video shows VIDEO MISSING and a deck problem; a background with neither `href` nor `animate` reports `background: needs an href or animate`. Catalog: `#/fullscreen/aurora/1`.
- `parallax: true` makes a background drift a little with each camera flight, the way the content moves: up to 40 px from rest at either end of the canvas, so it reads as a far layer. It is scaled up 7 % so its edges never show. A deep link lands it where the flights would have; with reduced motion it moves at once, as the camera does. A number instead of `true` is a depth: `parallax: 2` drifts twice as far (up to 4, 160 px). `layers: [{ href, alt, parallax }]` stacks pictures with transparent parts over the background, each drifting by its own depth, so a near layer (`parallax: 3`) moves further than the far background and the frame reads as several planes; each is scaled up enough to hide its edges, and fades with its background. A depth outside above 0 to 4 reports `background: parallax <n> out of range` (for a layer, `background: layer <i>: parallax …`) and the layer is left out. Keep near layers at the frame's edges: they sit over the scrim and can lower the contrast of text under them. Catalog: `#/parallax/near/1`.

## overlay.ts

Optional, at the deck root next to `deck.md`. What stays on screen over every scene while the camera moves: a logo, a brand frame, a footer, a chapter label. It is a stage-size layer (1920x1080 for the default `frame`) over the canvases and under klappe's own UI, and clicks go through it to the stage. Export a default `OverlayModule` (`import type { OverlayModule } from "klappe/types"`).

- `build(ctx)` makes the overlay's DOM once and returns refs. `ctx.html` and `ctx.svg` are the layer; effects that build in them work (`text`, `image`, `icon`). The camera and `onStep` do nothing here and report a problem.
- `update(at, refs)` runs on every move with where the deck lands: `at.index` and `at.total` (steps in the deck), `at.section`, `at.scene`, `at.step` (from 1), `at.sectionTitle`, `at.sceneTitle`. Set the overlay with `gsap.set` or styles, never a tween, and from `at` alone: then a jump shows what a play does, and `?selftest=walk` checks it as it checks a canvas.
- The overlay is not part of the look checks. Its ink may sit in the margin, so raise `safe-area` to keep scenes clear of it. The overlay that `klappe theme --logo` writes places its logo and footer inside `ctx.safe`.

```ts
import { gsap } from "gsap";
import { image, text } from "klappe/fx";
import type { OverlayModule } from "klappe/types";

export default {
  build: (ctx) => ({
    logo: image(ctx, { href: "media/logo.svg", alt: "Company logo", rect: { x: 1680, y: 990, w: 176, h: 50 } }).el,
    chapter: text(ctx, { text: "", x: 64, y: 1000, w: 1200, size: 24, color: "--k-muted" }).el,
  }),
  update: (at, r) => {
    r.chapter.textContent = at.sectionTitle;
    gsap.set([r.logo, r.chapter], { autoAlpha: at.section === "opening" ? 0 : 1 }); // a bare title section
  },
} satisfies OverlayModule;
```

Catalog: section `234-overlay` (`#/overlay/pinned/1`), with the demo's `decks/demo/overlay.ts`.

## Effects

Import effects from `"klappe/fx"`, for example `import { shatter, crt, chart } from "klappe/fx"`.

- A helper is `name(ctx, opts)`. Call it in `build()`. It builds its DOM, hidden, in `ctx.svg` or `ctx.html`.
- A helper's `rect` and `x`, `y` are scene-local: the origin is the top-left of the scene frame, in scene px (1920x1080 for the default `frame`, see `frame` in deck.md).
- Files that ship with the effects import from `klappe/fx/...`, for example `klappe/fx/art/engineer-desk.svg?raw`.
- It returns a handle with named steps, for example `{ crack, crack2, fall }`. Each one is `(tl) => void` and only adds tweens. Call them from your step functions.
- Helpers: `shatter`, `crt`, `drawOn`, `lineArt`, `icon`, `iconTile`, `shout`, `chart`, `parseCsv`, `worldMap`, `figure`, `swarm`, `mesh3d`, `morph`, `bubble`, `counter`, `image`, `video`, and the elements in `elements/`, among them [crt](elements/crt.md) (colour, `settle`, prompts, `cursorAt`), [bubble](elements/bubble.md) (`side`, `maxWidth`), [mesh3d](elements/mesh3d.md) and [timer](elements/timer.md). Options and limits of each are in [effects](effects.md) and the element pages; see also [Markdown triggers](markdown.md) and [Motion and tweens](motion.md).
- Transitions for `section.ts`: `cut`, `fade`, `blackout`, `zoom`, `shatter`, `crt`, `push`, `iris`, `glitch`, `cube`, `pageTurn`, `magicMove`. `push` takes `transitionOptions: { direction }` (`left`, the default, `right`, `up` or `down`); `iris` takes `transitionOptions: { origin: [x, y] }` in frame pixels (default the centre). A transition that fails plays `fade` and logs the error. `fade` takes 0.4 s: the old canvas fades out in the first half, then the new one fades in, so two titles at the same spot do not overlap. With `cut` and `fade`, the first step of the new section plays at once. With the others, it waits for the transition to end, unless the transition's timeline has a label `reveal`: then the step starts at that label. `zoom`, `cube` and `pageTurn` set `reveal`, so the new content shows while the canvas grows or turns in. `push` and `iris` set it at their start, so the new content shows while it moves or opens in. `magicMove` flies each element that both sections show with the same `data-k-match` key from its old place to its new one, while the rest fades; a `scene.ts` sets the key in `build`, as in `el.dataset.kMatch = "logo"` (for an icon, `tile.el.dataset.kMatch`). It sets `reveal` when the flight lands. With no shared key it plays a fade. A new transition in `src/fx` or an own function in `section.ts` can set `reveal` the same way.
- Shout-out intensity: `intensity` in `deck.md` sets every shout-out, including one a `scene.ts` builds with `shout(ctx, { question, answer })`. Pass `intensity` to set it for one shout-out (see the example below).
- `ctx.doc` is the scene's parsed `scene.md`: `title`, `notes`, and `steps`, each with its `text`, `notes` and Markdown `part` (code group, console command, chat message, checklist item, agenda rows). Read text from here instead of copying it into `scene.ts`, so `scene.md` stays the one source: `h: title(ctx)` in `build` builds the `scene.md` title as a hidden `h2`, then `r.h.show(tl)` in step 1 (see [basics](elements/basics.md)). With `build()`, klappe draws nothing for the scene, not even its title, so a scene that wants one calls `title`. Step functions must still exist before `build` runs, so a step count cannot come from `ctx.doc`.
- `ctx.safe` is the deck's `safe-area` as a rect `{ x, y, w, h }` inside `ctx.rect`, in the coordinates of `ctx.html` (default `{ x: 64, y: 48, w: 1792, h: 984 }` on a 16:9 frame). `bigType`, `lowerThird` and `endRoll` default to it; use it to place your own elements clear of the margin.
- `ctx.deck` holds `lang` and `intensity` from `deck.md`, and `sources`, the origins that charts and stats record. Effects use `lang` for their words and number formats (a `de` deck counts to `2.000`).
- `ctx.files.data` and `ctx.files.media` hold the deck's `data/` files (text) and `media/` files (URL), keyed like the link: `"data/x.csv"`.
- `ctx.problem(msg)` reports a deck problem, named after its file and, while a step is being added, the step: `sections/10-intro/20-why/scene.ts step 2: msg`. One reported after load (once a web font is in, or while a step plays) joins the on-screen list too. `ctx.onStep(fn)` hears every move, as `{ play, span, scene, next }`: `next` is the scene of the step after it, for a helper that gets ready one step early. Video uses it to play, pause and load.

### Examples

Each example is a `scene.ts` default export: `build` returns the handle, `steps` play it. The rect and position values are scene-local.

```ts
// shatter: the target (an element you built, shown in an earlier step) cracks twice, then falls apart in shards.
{ build(ctx) { const card = document.createElement("div"); ctx.html.append(card); gsap.set(card, { autoAlpha: 0 }); return { card, fx: shatter(ctx, { target: card }) } },
  steps: [(tl, r) => tl.to(r.card, { autoAlpha: 1 }), (tl, r) => r.fx.crack(tl), (tl, r) => r.fx.crack2(tl), (tl, r) => r.fx.fall(tl)] }

// crt: a retro terminal powers on, types its lines one step at a time, then shows the ready line.
{ build: (ctx) => crt(ctx, { color: "amber", lines: ["DEMO-OS v1.0", { text: "MEMORY TEST: 640K OK", count: true }] }),
  steps: [(tl, h) => h.powerOn(tl), (tl, h) => h.type(tl, 0), (tl, h) => h.type(tl, 1), (tl, h) => h.ready(tl)] }

// lineArt and drawOn: draw a shipped SVG and make one part glow; drawOn draws any stroked SVG elements; a dashed stroke ends on its own dash.
// Not a sanitizer: lineArt is for trusted, author-supplied SVG only.
import desk from "klappe/fx/art/engineer-desk.svg?raw";
{ build: (ctx) => lineArt(ctx, { src: desk, x: 260, y: 120, w: 1400 }), steps: [(tl, a) => a.draw(tl), (tl, a) => a.glow(tl, ".bulb")] }
steps: [(tl, r) => drawOn(r.path, { duration: 0.6 })(tl)] // r.path: an SVG path you built in build()

// icon and iconTile: a Lucide icon by name draws on, then lights up.
// iconTile also returns el, the tile's SVG group: a scene moves the tile with tl.to(i.el, { x: 200 }).
// icon also returns el, the glyph's SVG group.
{ build: (ctx) => iconTile(ctx, "lightbulb", { x: 960, y: 540, tone: "accent" }), steps: [(tl, i) => i.draw(tl), (tl, i) => i.light(tl)] }
{ build: (ctx) => icon(ctx, "rocket", { x: 960, y: 540, size: 160, color: "var(--k-fg)" }), steps: [(tl, i) => i.draw(tl)] }

// chart: bar, stacked, line, waterfall or timeline from data/. "Sample data" shows when sample is true
// or the data's source is "klappe demo sample". It is in --k-warn, top right, inside rect.
// chart also returns bars, the bar SVG rects in data order, for an effect that starts at a bar: one per row
// (waterfall: then the total; stacked: the first series' rows, then the next series'). A line chart or a placeholder has none.
{ build: (ctx) => chart(ctx, { src: "data/units.csv", type: "bar", rect: { x: 160, y: 140, w: 1600, h: 800 }, title: "Units by quarter" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)] }

// worldMap: draw the land, then sites and an arc between them.
{ build: (ctx) => worldMap(ctx, { rect: { x: 60, y: 60, w: 1800, h: 960 }, sites: [{ id: "s1", label: "[Site 1]", lon: 9, lat: 48 }, { id: "s2", label: "[Site 2]", lon: 121, lat: 31 }] }),
  steps: [(tl, m) => m.draw(tl), (tl, m) => (m.site(tl, "s1"), m.site(tl, "s2")), (tl, m) => m.arc(tl, "s1", "s2"),
          (tl, m) => m.zoomTo(tl, "s1"), (tl, m) => m.world(tl)] } // the camera zooms to a site and shows its label, then back

// parseCsv: read a data/ file yourself, for an effect that is not a chart. A "# source: ..." line rides along as .source.
{ build: (ctx) => ({ rows: parseCsv(ctx.files.data["data/units.csv"] ?? "") }), steps: [] }

// figure: a stick figure appears, then walks along a path (scene-local SVG path data).
{ build: (ctx) => figure(ctx, { x: 260, y: 960, color: "var(--k-fg)" }), steps: [(tl, f) => f.appear(tl), (tl, f) => f.walk(tl, "M 260 960 L 1600 960", { duration: 3 })] }

// swarm: seeded dots stream from one rect to another.
{ build: (ctx) => swarm(ctx, { rect: { x: 0, y: 0, w: 1920, h: 1080 }, from: { x: 100, y: 400, w: 300, h: 300 }, to: { x: 1500, y: 400, w: 300, h: 300 }, seed: 1 }),
  steps: [(tl, s) => s.stream(tl, { duration: 2 })] }

// morph, bubble, counter: one element turns into another; a speech bubble shows and hides; a number counts up.
// doc and fact are elements you built first in build(). counter also returns el, its box, and caption, the label under the number.
{ build: (ctx) => ({ m: morph(ctx, { from: doc, to: fact }),
                     b: bubble(ctx, { x: 400, y: 520, text: "A question for [Site 1]?", side: "right" }),
                     n: counter(ctx, { x: 960, y: 540, from: 0, to: 120, label: "Sample units" }) }),
  steps: [(tl, r) => r.m.play(tl), (tl, r) => r.b.show(tl), (tl, r) => (r.b.hide(tl), r.n.run(tl))] }

// image and video: a file from media/ (or a YouTube or Vimeo link for video), with a placeholder when it is missing.
// A video box has a thin frame and its title as a caption underneath, so it reads as a video even offline.
// fallback: an image in media/ that an online video shows when there is no network (see scene.md).
// A click into a YouTube or Vimeo player reaches the player; klappe then takes keyboard focus back, so the clicker keeps working.
// A YouTube or Vimeo player loads one step before its scene, so it is ready when the scene shows, not at deck start. Until then the box shows the
// fallback image (or stays black). In a section.ts build() (no scene), the player loads at deck start.
// image() also returns el, the picture's box (or the IMAGE MISSING box).
// An animated GIF, APNG or WebP loops by itself and needs no option: the self-test compares styles and marked text, not pixels.
{ build: (ctx) => image(ctx, { href: "media/desk.png", alt: "An engineer at a desk", rect: { x: 960, y: 140, w: 800, h: 800 } }), steps: [(tl, i) => i.show(tl)] }
{ build: (ctx) => video(ctx, { href: "media/clip.mp4", title: "A short clip", rect: { x: 960, y: 140, w: 800, h: 450 } }), steps: [(tl, v) => v.show(tl)] }

// A full-frame picture: fit "cover" with no rect fills the whole scene frame and crops to keep the aspect.
// Its show() starts with the step and fades in over the camera flight (`motion.camera`), slowly at first, so the
// picture is there while the camera flies in, but its hard photo edge crosses the frame faint. hide() fades out quickly.
// kenBurns: true adds a slow push (1.0 to 1.08 with a slight drift) to show(), after the fade-in; the step lasts the fade plus 6 s.
// Pass { from, to } poses ({ scale, x, y }) for your own; a drift stays inside the push's overscan.
// move(tl, { duration }) plays the push on its own. hide(tl) fades the picture out. Reduced motion leaves the push out.
// For a sharp push at 1920 wide, use a source of at least about 2080x1170 px (1.08 times the frame).
// scrim (0 to 1) lays --k-scrim over the picture; use 0.6 or more for text on top. Text (h1 to h3, p, lists) built
// after the image paints on top.
// A missing file shows IMAGE MISSING over the picture's area; a cover image with alt text also shows a prompt.
{ build: (ctx) => image(ctx, { href: "media/hero.png", alt: "A dawn sky over a factory", fit: "cover", kenBurns: true }),
  steps: [(tl, i) => i.show(tl), (tl, i) => i.hide(tl)] }
{ build: (ctx) => { const img = image(ctx, { href: "media/hero.png", alt: "A dawn sky over a factory", fit: "cover", scrim: 0.6 });
                    const text = document.createElement("h2"); text.textContent = "Why now";
                    Object.assign(text.style, { position: "absolute", left: "160px", top: "700px" });
                    ctx.html.append(text); gsap.set(text, { autoAlpha: 0 }); return { img, text } },
  steps: [(tl, r) => (r.img.show(tl), tl.to(r.text, { autoAlpha: 1 }, "<"))] }

// A background, in a section.ts (or scene.ts) default export. Plain scene.md text shows on top.
{ background: { href: "media/sky.png", alt: "A night sky over a plant", scrim: 0.6, kenBurns: true } }
// An animated background: a looping video, or an aurora with no file.
{ background: { href: "media/waves.mp4", scrim: 0.6 } }
{ background: { animate: "aurora" } }

// shout with its own intensity: the scene.md has the 2 steps of a shout-out (### Question? and an answer).
{ build: (ctx) => shout(ctx, { question: "Why now?", answer: "Because the data says so.", intensity: "bold" }),
  steps: [(tl, s) => s.enter(tl), (tl, s) => s.answer(tl)] }

// A transition, in a section.ts default export: the camera dives into a ref of the old canvas, the new one grows in.
{ transition: "zoom", zoomTarget: "countsAim" }
{ transition: "shatter", transitionOptions: { shards: 20 } }
```

## Types in deck repos

Import types from `"klappe/types"` and effects from `"klappe/fx"`. `klappe init` writes a `tsconfig.json` with these mappings if none exists:

```json
{ "compilerOptions": { "strict": true, "noEmit": true, "types": ["vite/client"], "paths": { "klappe/types": ["./klappe/src/types"], "klappe/fx": ["./klappe/src/fx"], "klappe/fx/*": ["./klappe/src/fx/*"] } }, "include": ["decks"] }
```

If you have your own `tsconfig.json`, add the `paths` entries yourself.

## Keys

- Next: Right arrow, Space, Page Down, Enter, click.
- Previous: Left arrow, Page Up.
- Home, End: first and last step.
- `O`: overview. One row per section, a 16:9 card per scene. `S`: section list. `N`: speaker view. `R`: review window (dev server only, see [review mode](#review-mode)). `A`: autoplay. `T`: start or pause the scene's timer. `Esc`: close a panel.
- In the speaker view, `P` (or the Rehearse button) starts a rehearsal run: it records the wall-clock seconds on each scene, adding up when you return to one, and lists them against the plan, the `outline` estimate per scene (notes at 130 words a minute, at least 15 s a step). A scene over its estimate shows in `--k-warn`, one over by half again in `--k-bad`; with `duration` set in `deck.md`, the run total shows against it. Press `P` again to stop; the last run stays in the browser's `localStorage`, per deck, until the next run or Reset times. Nothing is written to the deck, and a browser that blocks storage still rehearses for the session.

While the deck window shows, it keeps the screen awake: no screensaver or sleep mid-talk. The browser allows this on `localhost` and `https`, not on a built deck served over plain `http` from another machine.

## URL flags

- `?instant=1`: every play becomes a seek.
- `?reducedmotion=1`: camera moves become cuts, pictures leave out the Ken Burns push, and the `zoom`, `crt`, `shatter`, `push`, `glitch`, `cube`, `pageTurn` and `magicMove` transitions and a deck's own transition play a fade. This is also the default when the system asks for reduced motion (on Linux, desktop animations turned off).
- `?reducedmotion=0`: full motion even when the system asks for reduced motion, for a presenter laptop with animations off.
- `?autoplay=1`: start autoplay.
- `?speaker=1`: open the speaker view.
- `?review=1`: open the review window; see [review mode](#review-mode).
- `?theme=<name>`: try another theme without editing the deck; see [themes](themes.md).
- `?selftest=walk` or `?selftest=ac`: run the self-test. It starts one frame after the web fonts load. A `ctx.problem` call made before the self-test ends still counts, such as one after `document.fonts.ready`. The walk also runs the [look checks](#look-checks).
- `?offline=1`: online videos show their fallback image (see scene.md).

## Video export

`npm run video -- [--deck <id>] [--out <file.mp4>] [--fps 30] [--hold <s>] [--size 1920x1080]` renders the deck to an H.264 MP4 (yuv420p), `dist/<id>.mp4` by default. It needs `ffmpeg` on `PATH` (no npm package); without it the command stops with `klappe video needs ffmpeg on PATH`. The file is written only when the export finishes: a failure or Ctrl-C leaves an earlier export as it was.

Each step plays as it does live, in full motion: camera flights, whips and every section transition included. No frame is recorded in real time: each one is a seek of the timeline to the frame's time, so two runs give the same file and a slow machine gives the same video, only later. After its play, a step's last frame holds for its `auto` seconds, else for `--hold` (default 3). `--size` is the viewport; a deck `frame` other than 16:9 keeps its shape at that width.

What moves on the wall clock holds still, as with reduced motion: video and aurora backgrounds, animated SVG files, a deck's own background loop, `mesh3d`, the `crt` decoration, the breathing `glow` and videos in scenes show one frame. A `timer` is not started, so it shows its full time; one with `until` shows the time left at the moment of the export. Online players (YouTube, Vimeo) run outside klappe, so they record however far they got: avoid them in a deck you export. CSS animations hold their first frame and CSS transitions are not recorded exactly, so animate step content with GSAP on the timeline.

## Review mode

To review your own deck, run it with `npm run dev` and press `R`. A review window opens beside the deck, like the speaker view, and follows it: stepping in either window moves both. For the step shown it gives its place and text and a field each for **Content** (text to correct), **Storytelling** (another effect, another storyline) and **Visuals**. Whatever you type is saved as you type, with no Save button, to `decks/<id>/review.md`; coming back to a step shows what you wrote there. Review one section by going to it and stepping through.

```markdown
# Review

## #/value-stream/analysis/2

> Thousands of documents stream in.

### Content

"stream" should be "value stream" in the caption.
```

One entry per step with findings, in deck order, each with the step's text as a quote. Then ask Claude Code to work through the review: it fixes each finding, marks it fixed with a line on what changed and the commit, and asks in the chat when one is unclear (the klappe skill says how). A fixed finding stays in the file:

```markdown
### Content

"stream" should be "value stream" in the caption.

#### Fixed

Caption reads "value stream" (a1b2c3d).
```

In the window a fixed finding is read-only, with Claude's line under it. **Approve** removes it from the file. **Reopen** takes a note on what is still wrong and adds it as `#### Reopened`, and the finding is open again. The status line counts the fixed findings waiting for your approval. When the window shows "Written for: …" over a finding, its step's text has changed since: check it is still on the right step.

`R` also turns on edit mode in the deck window, for findings that are easier to show than to say. A click selects what an effect built in the scene on screen (a dashed box and its scene rect show over it); a drag moves it, the square at its corner resizes it from its top-left corner, and the arrow keys nudge it by 1 px (10 with Shift) instead of stepping. Escape lets it go. It is a preview: the timeline never changes, and the next step puts the element back. Each move writes one line into the step's **Visuals** finding, `Move chart "Units by quarter" from [160, 100, 1600, 820] to [200, 140, 1600, 820]` (the drawn box in scene px, x, y, w, h; it can sit a little inside the code's `rect`); moving the same element again on that step updates its line. Claude finds the position in the code and changes it, as for any finding. In edit mode a click on the stage selects instead of stepping; the keys still step.

A double click on a step's text or the scene title that `scene.md` gave (a scene without its own `build`) edits it in place. Enter writes it straight back to `scene.md`, and the dev server reloads the deck; Escape keeps the old text. A step whose line holds a link, or text that is on several lines of the file, is not written and goes back to the old text.

Review mode exists only on the dev server, which saves the file: a built deck has no `R`, and `?review=1` says so. The deck does not load `review.md`, so a save never reloads it.

## Look checks

`?selftest=walk` checks the look of the current scene at every step, once the step has settled. The findings are warnings: they go to `warnings` in the self-test result (the `script#klappe-selftest` JSON) and never fail the self-test. `klappe test --strict` fails the walk on any warning; without `--strict`, warnings never fail a test. Each finding is listed once, at the first step that shows it.

- Safe area: ink that crosses the deck's `safe-area` inset (default 48 px top and bottom, 64 px left and right, in the frame, 1920x1080 by default). Ink is each line of text (the text itself, not its box), each picture and SVG shape, and each HTML box with a fill or a border. Ink is cut to its parents' `overflow: hidden` first.
- Clipped text: shown text that a parent's `overflow: hidden` or `clip` cuts off, which includes `text-overflow: ellipsis` and line clamps. Text that a mask hides completely is not counted.

These are not checked:

- Ink off the stage, and a stroke that is not drawn yet.
- Ink that spans the whole frame width or height, such as a band or a full-frame picture.
- Section layers and backgrounds.
- Anything inside an element with `data-k-ignore` or `data-k-bleed`.

To mark an intended bleed, set `data-k-bleed` on its element, for example `el.setAttribute("data-k-bleed", "")`. Use it for a picture that runs off the edge. It turns off both checks for that element and everything inside it. `worldMap`, the shards of `shatter` and the route of a `travel` that `follow` rides along mark themselves.

## Deep links

Use `#/section/scene/step`. The step number starts at 1. Example: `#/value-stream/clarification/2`.
