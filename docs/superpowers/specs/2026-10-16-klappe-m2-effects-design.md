# klappe M2: effects, design

## Intent

In M1 the engine got its core: canvases, a camera, steps, deep links and tools for the presenter. M2 gives it the effects that make a room go quiet. That matters for both target decks:

- **Hackathon training:** "I can do this with AI?!"
- **AI@RD for the board:** calm, but clear.

The user picked two signature moments:

- **The dramatic opening:** the title slide cracks and shatters, the screen goes black, and a CRT boots.
- **Line art that draws itself:** large SVG drawings, and the advisor-style icon draw-on.

A throwaway spike (`docs/superpowers/spikes/opening/opening.html` (open it from a folder that also holds `gsap.min.js`; screenshots `shot-*.png` next to it), 2026-10-16) set the bar. The user called it "really awesome". The M2 versions must look at least that good.

## Scope (user decision: everything in M2)

1. **Transitions between canvases:** cut and fade (both exist already), plus crack, shatter, zoom-through, blackout and CRT power-on.
2. **CRT terminal:** scanlines, glow and flicker. Boot text types itself line by line, then a blinking cursor.
3. **Line illustrations:** SVG files in the deck that draw themselves stroke by stroke.
4. **Icons:** Lucide glyphs in the advisor v2 treatment: 2 px non-scaling strokes, a duotone tint inside closed shapes, and an optional tile (gradient well, hairline edge, glow). Plus the draw-on effect.
5. **Shout-out questions:** four phases (enter, hold, fade, answer), in two strengths, `calm` and `bold`.
6. **Charts from CSV or JSON:** bar, stacked bar, line, waterfall and timeline. They draw themselves: axes first, then bars grow, lines draw and values count up. When data is missing they show "DATA MISSING", and the gap goes into `data/TODO.md`.
7. **World map:** built from bundled `world-atlas` data, with site markers, arcs between sites, and a camera zoom from the world down to one site.
8. **Character figures:** simple and original, in the same line-art style. They walk along paths using GSAP MotionPathPlugin.
9. **Swarms:** thousands of small objects on a Canvas layer inside the world. Example: documents streaming in.
10. **Morph and move:** an object travels from one place to another and changes form, for example a document becoming a highlighted fact becoming a card.
11. **Speech bubbles and counters,** for example a stack that shrinks to zero.
12. **Media:**
    - Images and animated GIFs from `![alt](media/x.png)`.
    - Video from a link: YouTube, another URL, or a local file. Video plays when its step starts and pauses when the step ends.
    - A missing image shows "IMAGE MISSING", and its line in `media/TODO.md` includes a Copilot prompt.
13. **Demo deck complete:** Examples A, B and C from the original spec, all scenes, using the effects above.
14. **M2 items from `docs/backlog.md`:**
    - Strip duplicate ids from overview clones.
    - Report a problem when a blockquote between `### Q?` and the answer drops the answer.
    - Document that negative offsets are not allowed.
    - Run the legibility check on section-level text too, which the map needs.
    - Make `toDeckRelative` work when a folder named `sections` appears in the path.

## Non-goals

- Themes and the single-file build, PDF export and offline fonts. These belong to M3.
- Audio.
- A WebGL renderer.
- An image API.
- The skill. It will be written later, from experience.

## Anti-goals

- An effect that breaks "seek equals play". Every effect must look identical after a deep link and after playing through.
- Physics simulations that run outside the timeline.
- Numbers on screen without a source.

## Hard rules

### Seekable, always

The M1 timeline rule still holds:

- One GSAP timeline per canvas.
- DOM and SVG exist at load.
- Back means a cut.

It is relaxed in one place: a callback may change the DOM only when the change depends purely on the tween's progress. In GSAP terms that means `onUpdate`, which reads `this.progress()` and writes a value. Three effects need this: typing text, count-up numbers and Canvas swarm frames. `onComplete` and `.call()` must not change state.

The self-test walk must stay green on every scene. That walk checks that play equals seek, legibility at 1366×768, and that text stays inside the frame. The snapshot gains two things:

- `textContent` of elements marked `data-k-text`, for typing and counters.
- A hash of the swarm canvas, or the swarm progress value.

### Effects are deck-agnostic helpers

Deck code uses effects through one import, `klappe/fx`. That is a Vite alias plus a tsconfig path, the same pattern as `klappe/types`. Example:

```ts
import {
  shatter,
  crt,
  drawOn,
  iconTile,
  chart,
  worldMap,
  figure,
  swarm,
  bubble,
  counter,
} from "klappe/fx";
```

Each helper has two parts:

- `build(ctx, opts)`, which creates DOM and SVG, all hidden.
- Step functions that add tweens to `tl`.

Helpers never reach into engine internals.

### Markdown stays plain

These Markdown patterns trigger effects automatically, as the original spec §3 says:

| Markdown                               | Effect                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| `![alt](media/x.png)`                  | Image or GIF.                                                      |
| `[title](link)` to a video URL or file | Video.                                                             |
| `[title](data/x.csv)`                  | Chart. The chart type defaults to bar; `scene.ts` can override it. |
| `### …?` plus a paragraph              | Shout-out.                                                         |

Transitions, chart types, camera paths and figure choreography live in `section.ts` and `scene.ts`, never in Markdown. A section chooses its entry transition with `export default { transition: 'shatter' }` in `section.ts`.

### Design rules

The spec §2 rules apply:

- No cream or off-white.
- No italic headline accents.
- No "01/02" labels.
- No pill buttons.
- No monospace labels.

Monospace is allowed only inside `.k-retro`, which is CRT content. Colours come from theme tokens.

## Decisions (user)

- **Line-art source:** Claude writes the SVG by hand, as single-weight strokes with round caps. No library, no image model.
- **Icon look:** the advisor v2 treatment, kept unchanged ("take that one as well, I liked it").
- **Opening feel:** match the spike. That means:
  - Cracks race out from an impact point, with a flash and a shake.
  - The second hit runs the cracks to the edges of the slide.
  - The slide breaks into about 37 shards, cut along the cracks.
  - The shards pop apart, tumble and fall, and some fly toward the viewer.
  - A black hold follows, then the CRT power-on line flashes, then the boot text types.
- **Approved libraries:**
  - GSAP and its plugins, which ship in the gsap package: MotionPathPlugin, plus DrawSVG or MorphSVG if needed.
  - D3 for scales, shapes and axes.
  - world-atlas and topojson-client.
  - lucide.

  Anything else needs the user's yes.

## Calls I made (check these)

- **Shatter as a transition between canvases:** the old canvas's DOM is cloned into shards when the transition is built, not when it plays, so seek works. The spike used about 37 full clones of the slide, and on weak laptops that may stutter. The shard count is an option (default 30). We measure frame time on the demo, and a test can assert a budget.
- **CRT colour:** green phosphor by default, amber as an option. Boot text comes from the scene's step list, one line per step or typed as a block.
- **Icon set:** Lucide glyphs, with the advisor's 24-grid paint, tint and tile ported. Any custom advisor icon that Lucide lacks gets ported on demand.
- **Figures:** built from line-art parts (head, body, limbs). Walking is a looping limb swing, driven by progress along the path, so it stays seekable.
- **Swarm:** drawn on a `<canvas>` inside the world, as a pure function of progress. Each object's position is `f(seed, progress)`, so the swarm needs no state.
- **Charts:**
  - D3 does the scales and the paths, GSAP does the motion. The pattern is axes draw, bars grow, values count up.
  - The CSV is parsed with a small built-in parser. The `shortcut:` comment notes its limits (no quoted commas). `d3-dsv` is a possible upgrade, but it needs the user's yes.
  - Every chart records its source file in the DOM and in the notes.
- **Video:**
  - Local files and direct URLs use `<video>`. YouTube uses an iframe embed.
  - The selftest snapshot leaves video out, because video is time-based media, not timeline state.
  - A cut pauses the video.
  - An online video shows a visible "needs internet" note in the speaker view.
- **Order of work:**
  1. Shared fx foundation: the `klappe/fx` alias, snapshot extensions, and the transition hook in the stepper.
  2. The signature four: shatter and crack, CRT, line art, icons.
  3. Shout-out.
  4. Charts.
  5. Map.
  6. Figures and swarm, with morph, bubbles and counters.
  7. Media.
  8. The full demo deck.
  9. Backlog items.

## Testing

- **Unit tests (Vitest):**
  - Pure maths: shard polygons from crack lines, with a seeded RNG for determinism; swarm `f(seed, t)`; chart scales and data parsing; the CSV parser; Markdown detection of image, video and chart links.
  - The shout-out parse with the answer-drop problem.
- **Integration (selftest walk):** every demo scene must pass play equals seek at 1920, 1366 and 1024, including transitions and typing.
- **Fixture decks for effects:** `?fixture=fx-shatter`, `fx-chart-missing` and others. Content-dependent tests use fixtures, so `klappe test` stays green in deck repos.
- **Acceptance (demo only, extends AC):**
  - AC-9: the shatter transition plays and reverses by cut.
  - AC-10: a missing chart dataset shows DATA MISSING and is listed in `data/TODO.md`.
  - AC-11: a missing image shows IMAGE MISSING, and the prompt is in `media/TODO.md`.
  - AC-12: the map zoom lands on a site.
  - AC-13: the CRT typing is complete at the step end after a deep link.
- **Performance:** a smoke test measures the average frame time of the shatter and the swarm in headless Chromium and reports it. It does not fail the build in M2. Checking smoothness at 60 fps on a real laptop stays a manual check.
- **Build loop:** an orchestrator, one builder per effect, and three reviewers (technical, look and feel, content). The look reviewer compares the shatter and the CRT against the spike screenshots.

## Left to the builder

- Exact easing and timing values. Start from the spike's values.
- File layout inside `src/fx/`, one file per effect.
- How each effect exposes its knobs, as long as the defaults match the spike.

## Answers after the builder check

**User decision.** The demo uses labelled sample data:
- The datasets are small and made up for the demo.
- Each chart shows "Sample data" on screen.
- Each data file states its source as `klappe demo sample`.
- Example C sites stay `[Site N]` placeholders, placed at plausible coordinates.

**Calls I made (check these):**

1. **The opening is one scene with steps.** Following the bullets in Example A, it runs on one canvas: crack, break, black, then the Boot scene. Each press plays one beat.
   - Crack, shatter and the CRT are therefore effects on the canvas timeline, so they can be seeked.
   - Between two canvases, `transition: 'shatter'` in `section.ts` is a short form. It plays the same effect on the outgoing canvas, then cuts to the next one.
   - The transitions are cut, fade, blackout, zoom-through, shatter and crt.
   - AC-5 stays as it is today: the transition from opening into value-stream is a fade.
2. **Shards are cut at build time.** The shatter helper gets the element it should break, for example the title slide group. When the scene is built, it clones that element in its visible state into N clip-path shards. The shards stay hidden until the shatter step.
3. **The TODO files are written by a Node pass.** `klappe build` and `klappe test` scan the deck's Markdown for links to `media/` and `data/` and check whether each file exists. The pass writes `media/TODO.md` and `data/TODO.md` and lists them in the CLI output.
   - Each image's Copilot prompt comes from the Markdown link title, as in `![alt](media/x.png "prompt")`.
   - If there is no title, the prompt is the alt text, then "for a presentation scene about …" plus the scene title.
   - At runtime, the page shows the placeholders.
4. **Media in plain-Markdown scenes.** A bullet that holds an image, a chart or a video link shows that media at that step.
   - In the default layout the text column sits on the left (≤ 45% width) and the media on the right, fitted to the frame.
   - The legibility check and the in-frame check apply to the media too.
5. **Zoom-through.** `section.ts` can name `zoomTarget: '<ref name>'`.
   - The camera dives into that ref on the old canvas, scaled up about ×8 with a fade to black, and the new canvas scales in from 0.6 to 1.
   - With no target, the camera dives into the frame centre.
