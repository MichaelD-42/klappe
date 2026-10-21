# Deck format

The folders and files of a deck, and what each Markdown form does. The demo deck in `decks/demo` shows every rule.
It covers spec examples A (old way), B (value stream), C (global team). Boot, Coming together and Working on the topic come in M2.

## Folders

Use numeric prefixes. They set the order. The prefix is not part of the id.

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
```

## deck.md

Frontmatter keys:

- `title`: required.
- `lang`: default `en`.
- `theme`: a theme name: `calm` (default), `bold`, or your own. See [themes](themes.md).
- `intensity`: `calm` or `bold`. Default is the theme.
- `confidential`: `true` or `false`. Default `false`.
- `shared-canvas`: section ids that share one canvas, for example `[value-stream, global-team]`. Use a list of lists for several groups.

## deck.css

Optional. Put `decks/<id>/deck.css` next to `deck.md` for a corporate look.
A theme file holds tokens only; deck.css holds the deck's fonts (`@font-face`) and its own component classes, and it loads after the theme.
It may also override `--k-*` tokens. The contrast check measures the result.
A `url()` is relative to the deck folder, for example `url(./fonts/brand.woff2)` or `url(./media/logo.png)`. The build bundles these files.
The design lint checks deck.css too. In-code test fixtures (`?fixture=`) ignore it.

## scene.md

- `## Title` names the scene. It is required.
- Each list item is one step.
- A `> note` is a speaker note. It belongs to the step above it. Before the first step, it belongs to the scene. A note indented under a list item belongs to that item. Several notes on one step are kept in order, and a blank `>` line starts a new paragraph.
- A `### Question?` followed by a paragraph is a shout-out. The heading must end with `?`. It makes 4 steps: enter, hold, fade, answer. A `> note` after it attaches to the answer step.
- A scene with no list items gets one step with the title.
- A list item with `![alt](media/x.png "prompt")` shows an image. A link to YouTube, Vimeo, or a `.mp4` or `.webm` file shows a video. A link to `data/x.csv` or `data/x.json` shows a chart. The link shows as its label in the text. Without `scene.ts` `build()`, the text goes in a left column and the media on the right.
- An image on the next line of a video link, in the same list item, is the video's offline fallback: `- [A talk](https://youtu.be/x)` then `  ![A still](media/still.jpeg)`. With no network (`navigator.onLine` is false, or `?offline=1`), an online video shows that image with the caption "Video needs a network connection". Without a fallback, it shows the empty video box and a deck problem. klappe cannot tell when a YouTube or Vimeo embed fails to load, so on a network without internet use `?offline=1`. An image in its own list item is a separate step, not a fallback.
- A fenced code block with a language shows code in the right-hand slot, highlighted for ts, js, python, bash, json, yaml, sql, html and css. Another language shows plain, with the problem `language "<lang>" not bundled; shown plain`. Highlight groups after the language, ```` ```ts {1-2|4} ````, make one step per group: its lines light up and the others dim. The list items after the block are those steps' text, in order. More groups than items gives steps without text; more items than groups gives plain steps. Without groups, the block is one step. One code or console block per scene.
- A ```` ```console ```` block replays a terminal session. Each `$ ` line is a command: it types itself, then its output lines appear. Each command is one step, and the list items after the block are their text, as for code. A console block with no `$ ` line is a problem.
- Task-list items, `- [ ] Backup verified`, build one checklist: each item is a step that ticks its box. `- [x]` starts ticked.
- A scene whose list items all start with a time range, `- 09:00–09:45 Basics`, shows an agenda in one step. A trailing `←` marks the current row. A mix of time ranges and plain items stays plain steps.
- A missing file shows a placeholder box (IMAGE MISSING, VIDEO MISSING or DATA MISSING) and a deck problem, not a blank slide. `klappe test` and `klappe build` write `media/TODO.md` and `data/TODO.md` with one line per missing file. They read the links in `scene.md` and the `href: "media/..."` values in `scene.ts` and `section.ts`. For an image, the line holds a prompt made from the scene heading and the link's title (the `"prompt"` part, else the alt text), or the `alt` next to the `href` in a `.ts` file. A title stays as written. A prompt from alt text gets a shape: ", square, 1024x1024, no text, no logos" for a `scene.md` image, which shows in a near-square column, and ", 16:9, 1920x1080, no text, no logos" for an image in a `.ts` file, the shape of a full-frame picture or background; edit the line for an image with a smaller `rect`. A `.ts` file only counts an `href` written as a plain string in the call's `{ ... }`; a path built at run time is not listed. Full-frame pictures and backgrounds need `scene.ts` or `section.ts` (see Effects); there is no Markdown syntax for them.

## scene.ts

Use `import type { SceneModule } from "klappe/types"`. Export a default `SceneModule`.

- `place(rects)` returns the scene's home frame. The engine flies the camera there when the scene starts. `rects` holds the home frames of the scenes before this one on the same canvas, keyed by scene id. Use it to place a scene relative to an earlier one. Without `place()`, a scene gets a 1920x1080 frame at x = its position on the canvas times 1920.
- `build(ctx)` creates all DOM, hidden. Return the refs you need. Steps receive them.
- `steps` is an array with one function or `null` per step. It lines up with the list items by position. `null` or a missing entry gives the default step, which shows the step text. A step function is `(tl, refs, ctx) => void`.
- `auto` is an array with one number or `null` per step. It lines up with the steps by position. A number N advances the deck by itself N seconds after the step has played forward. It also goes into the next scene and through a section transition. `null` or a missing entry waits for a press. A deep link, a jump, a back move and `?instant=1` never advance by themselves. A press during the wait advances one step at once. Opening the overview or the section list stops the wait. Autoplay holds a step for its `auto` time. Example: `auto: [null, 1, 0.5]`.
- In a step, only add tweens to `tl`. Do not use `.from()`; use `fromTo`. Do not change the DOM in callbacks, with one exception: `onUpdate` may write the DOM as a pure function of the tween's progress. Mark such an element with `data-k-text` (text) or `data-k-progress` (a progress value), so the self-test compares it.
- `"<"` is fine after a tween this step added. Never use `"-="` or `"<"` as a step's first position. A step starts at its own label, and an offset before it can pull the tween into the previous step.
- Use `ctx.camera.to(tl, rect, { duration, at })` for camera moves inside a scene, after the entry.
- Keep one master timeline per canvas. The engine owns it.

## section.ts

Export a default `SectionModule`. `build(ctx)` draws the backdrop for the whole canvas and returns refs. Scenes read them from `ctx.canvas.refs`. `ctx.canvas.rects` holds each scene's home frame, keyed by scene id. The layout supplies it, not the section.

- `transition` sets how the deck enters this section when it moves forward by one step onto a new canvas. Default `fade`. A back move, a jump and `?instant=1` always cut.
- `zoomTarget` names a ref on the old canvas for `transition: "zoom"`.
- `transitionOptions` passes extra options to the transition, for example `{ shards: 20 }`.
- `background` puts a full-frame picture from `media/` behind every scene of the section: `{ href: "media/sky.png", alt: "A night sky over a plant", scrim: 0.6, kenBurns: true }`. The background is pinned to the screen: the camera moves the scene content over a still picture. A `scene.ts` can set its own `background` too; it replaces the section's while that scene is in view, and the two cross-fade as the camera flies in and out. The first scene's background is visible from load and fades in with its canvas; no step shows it. Canvas transitions carry it along: the zoom dives into it, the shatter breaks it. `scrim` (0 to 1) darkens it for text on top; use 0.6 or more, so theme text keeps 4.5:1 contrast even over white. `kenBurns` adds a slow push of 6 s, once, from the first step of the first scene that shows the background; reduced motion leaves it out. `alt` describes the picture: a missing file then shows a prompt in its placeholder and in `media/TODO.md`.

## Effects

Import effects from `"klappe/fx"`, for example `import { shatter, crt, chart } from "klappe/fx"`.

- A helper is `name(ctx, opts)`. Call it in `build()`. It builds its DOM, hidden, in `ctx.svg` or `ctx.html`.
- A helper's `rect` and `x`, `y` are scene-local: the origin is the top-left of the scene frame, in 1920x1080 units.
- Files that ship with the effects import from `klappe/fx/...`, for example `klappe/fx/art/engineer-desk.svg?raw`.
- It returns a handle with named steps, for example `{ crack, crack2, fall }`. Each one is `(tl) => void` and only adds tweens. Call them from your step functions.
- Helpers: `shatter`, `crt`, `drawOn`, `lineArt`, `icon`, `iconTile`, `shout`, `chart`, `parseCsv`, `worldMap`, `figure`, `swarm`, `mesh3d`, `morph`, `bubble`, `counter`, `image`, `video`, and the elements in `elements/`, among them [crt](elements/crt.md) (colour, `settle`, prompts, `cursorAt`), [bubble](elements/bubble.md) (`side`, `maxWidth`), [mesh3d](elements/mesh3d.md) and [timer](elements/timer.md). Options and limits of each are in [effects](effects.md) and the element pages; see also [Markdown triggers](markdown.md) and [Motion and tweens](motion.md).
- Transitions for `section.ts`: `cut`, `fade`, `blackout`, `zoom`, `shatter`, `crt`. A transition that fails plays `fade` and logs the error. With `cut` and `fade`, the first step of the new section plays at once. With the others, it waits for the transition to end, unless the transition's timeline has a label `reveal`: then the step starts at that label. `zoom` sets `reveal`, so the new content shows while the canvas grows in. A new transition in `src/fx` can set `reveal` the same way.
- Shout-out intensity: `intensity` in `deck.md` sets every shout-out, including one a `scene.ts` builds with `shout(ctx, { question, answer })`. Pass `intensity` to set it for one shout-out (see the example below).
- `ctx.doc` is the scene's parsed `scene.md`: `title`, `notes`, and `steps`, each with its `text`, `notes` and Markdown `part` (code group, console command, checklist item, agenda rows). Read text from here instead of copying it into `scene.ts`, so `scene.md` stays the one source: `title(ctx, ctx.doc!.title)`. Step functions must still exist before `build` runs, so a step count cannot come from `ctx.doc`.
- `ctx.deck` holds `lang` and `intensity` from `deck.md`. Effects use `lang` for their words and number formats (a `de` deck counts to `2.000`).
- `ctx.files.data` and `ctx.files.media` hold the deck's `data/` files (text) and `media/` files (URL), keyed like the link: `"data/x.csv"`.
- `ctx.problem(msg)` reports a deck problem. `ctx.onStep(fn)` hears every move; video uses it to play and pause.

### Examples

Each example is a `scene.ts` default export: `build` returns the handle, `steps` play it. The rect and position values are scene-local.

```ts
// shatter: the target (an element you built, shown in an earlier step) cracks twice, then falls apart in shards.
{ build(ctx) { const card = document.createElement("div"); ctx.html.append(card); gsap.set(card, { autoAlpha: 0 }); return { card, fx: shatter(ctx, { target: card }) } },
  steps: [(tl, r) => tl.to(r.card, { autoAlpha: 1 }), (tl, r) => r.fx.crack(tl), (tl, r) => r.fx.crack2(tl), (tl, r) => r.fx.fall(tl)] }

// crt: a retro terminal powers on, types its lines one step at a time, then shows the ready line.
{ build: (ctx) => crt(ctx, { color: "amber", lines: ["DEMO-OS v1.0", { text: "MEMORY TEST: 640K OK", count: true }] }),
  steps: [(tl, h) => h.powerOn(tl), (tl, h) => h.type(tl, 0), (tl, h) => h.type(tl, 1), (tl, h) => h.ready(tl)] }

// lineArt and drawOn: draw a shipped SVG and make one part glow; drawOn draws any stroked SVG elements.
// Not a sanitizer: lineArt is for trusted, author-supplied SVG only.
import desk from "klappe/fx/art/engineer-desk.svg?raw";
{ build: (ctx) => lineArt(ctx, { src: desk, x: 260, y: 120, w: 1400 }), steps: [(tl, a) => a.draw(tl), (tl, a) => a.glow(tl, ".bulb")] }
steps: [(tl, r) => drawOn(r.path, { duration: 0.6 })(tl)] // r.path: an SVG path you built in build()

// icon and iconTile: a Lucide icon by name draws on, then lights up.
// iconTile also returns el, the tile's SVG group: a scene moves the tile with tl.to(i.el, { x: 200 }).
{ build: (ctx) => iconTile(ctx, "lightbulb", { x: 960, y: 540, tone: "accent" }), steps: [(tl, i) => i.draw(tl), (tl, i) => i.light(tl)] }
{ build: (ctx) => icon(ctx, "rocket", { x: 960, y: 540, size: 160, color: "var(--k-fg)" }), steps: [(tl, i) => i.draw(tl)] }

// chart: bar, stacked, line, waterfall or timeline from data/. "Sample data" shows when sample is true
// or the data's source is "klappe demo sample".
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
// doc and fact are elements you built first in build().
{ build: (ctx) => ({ m: morph(ctx, { from: doc, to: fact }),
                     b: bubble(ctx, { x: 400, y: 520, text: "A question for [Site 1]?", side: "right" }),
                     n: counter(ctx, { x: 960, y: 540, from: 0, to: 120, label: "Sample units" }) }),
  steps: [(tl, r) => r.m.play(tl), (tl, r) => r.b.show(tl), (tl, r) => (r.b.hide(tl), r.n.run(tl))] }

// image and video: a file from media/ (or a YouTube or Vimeo link for video), with a placeholder when it is missing.
// A video box has a thin frame and its title as a caption underneath, so it reads as a video even offline.
// fallback: an image in media/ that an online video shows when there is no network (see scene.md).
// A click into a YouTube or Vimeo player reaches the player; klappe then takes keyboard focus back, so the clicker keeps working.
{ build: (ctx) => image(ctx, { href: "media/desk.png", alt: "An engineer at a desk", rect: { x: 960, y: 140, w: 800, h: 800 } }), steps: [(tl, i) => i.show(tl)] }
{ build: (ctx) => video(ctx, { href: "media/clip.mp4", title: "A short clip", rect: { x: 960, y: 140, w: 800, h: 450 } }), steps: [(tl, v) => v.show(tl)] }

// A full-frame picture: fit "cover" with no rect fills the whole scene frame and crops to keep the aspect.
// Its show() starts with the step and fades in over the camera flight (`motion.camera`), slowly at first, so the
// picture is there while the camera flies in, but its hard photo edge crosses the frame faint. hide() fades out quickly.
// kenBurns: true adds a slow push (1.0 to 1.08 with a slight drift) to show(), after the fade-in; the step lasts the fade plus 6 s.
// Pass { from, to } poses ({ scale, x, y }) for your own; a drift stays inside the push's overscan.
// move(tl, { duration }) plays the push on its own. hide(tl) fades the picture out. Reduced motion leaves the push out.
// For a sharp push at 1920 wide, use a source of at least about 2080x1170 px (1.08 times the frame).
// scrim (0 to 1) darkens the picture; use 0.6 or more for text on top. Text (h1 to h3, p, lists) built
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

// shout with its own intensity: the scene.md has the 4 steps of a shout-out (### Question? and an answer).
{ build: (ctx) => shout(ctx, { question: "Why now?", answer: "Because the data says so.", intensity: "bold" }),
  steps: [(tl, s) => s.enter(tl), (tl, s) => s.hold(tl), (tl, s) => s.fade(tl), (tl, s) => s.answer(tl)] }

// A transition, in a section.ts default export: the camera dives into a ref of the old canvas, the new one grows in.
{ transition: "zoom", zoomTarget: "hostSite" }
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
- `O`: overview. `S`: section list. `N`: speaker view. `A`: autoplay. `T`: start or pause the scene's timer. `Esc`: close a panel.

## URL flags

- `?instant=1`: every play becomes a seek.
- `?reducedmotion=1`: camera moves become cuts, pictures leave out the Ken Burns push, and the `zoom`, `crt` and `shatter` transitions play a fade. This is also the default when the system asks for reduced motion (on Linux, desktop animations turned off).
- `?reducedmotion=0`: full motion even when the system asks for reduced motion, for a presenter laptop with animations off.
- `?autoplay=1`: start autoplay.
- `?speaker=1`: open the speaker view.
- `?theme=<name>`: try another theme without editing the deck; see [themes](themes.md).
- `?selftest=walk` or `?selftest=ac`: run the self-test.
- `?offline=1`: online videos show their fallback image (see scene.md).

## Deep links

Use `#/section/scene/step`. The step number starts at 1. Example: `#/value-stream/clarification/2`.
