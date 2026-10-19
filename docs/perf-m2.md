# M2 performance report

Measured 2026-10-19 on branch `feat/m2-effects`. These are headless Chromium numbers. They are not a 60 fps proof.

**60 fps manual check: pending by the user.** Run the demo in a real browser on a laptop and watch the shatter (`#/opening/old-way/2`, then Right) and the swarm (`#/value-stream/analysis/1`, then Right).

## Machine

- Windows 11 Enterprise, Intel Core Ultra 7 165H, Intel Arc Pro Graphics, 63 GB RAM.
- Playwright Chromium 156.0.8078.4, headless, viewport 1920 x 1080.
- Nothing else ran: no other dev server or Chromium. One Vite dev server served the demo deck.
- Two renderers:
  - **Software:** the Playwright default. WebGL reports SwiftShader, so the page draws on the CPU.
  - **GPU:** launched with `--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist`. WebGL reports the Intel Arc over Direct3D 11. This is closer to a real browser.

## What was measured

- **Frame time:** the gaps between `requestAnimationFrame` calls while `stepper.next()` plays one step at real speed. One frame at 60 fps is 16.7 ms.
- **Long frames:** frames over 20 ms, as a count and as the time they take together (measured in the second round; the swarm GPU value for round 1 is derived from frame count and average).
- **Draw cost:** the time of one `tl.seek()` plus the swarm redraw, over 120 seeks across the stream step.
- Each demo row is the range over 6 runs (two rounds of 3). The numbers vary a lot from run to run.

## Demo deck

| Effect | Renderer | Frames | Avg (ms) | p95 (ms) | Max (ms) | Frames > 20 ms | Time in long frames |
|---|---|---|---|---|---|---|---|
| Shatter fall (old-way 2 to 3, 30 shards, step about 2.2 s) | GPU | 103 to 132 | 17.6 to 27.5 | 16.7 to 50 | 50 to 667 | 1 to 14 | 0.2 to 1.2 s |
| Shatter fall | Software | 22 to 44 | 61 to 106 | 200 to 733 | 217 to 867 | 11 to 13 | 3.7 s of about 4.2 s |
| Swarm stream (analysis 1 to 2, 2000 points, step about 3.5 s) | GPU | 129 to 211 | 16.7 to 28.8 | 16.8 | 16.8 to 467 | 0 to 5 | 0 to 0.07 s (round 2); about 1 s (round 1, derived) |
| Swarm stream | Software | 200 to 211 | 16.7 to 17.5 | 16.7 to 33.3 | 16.8 to 49.9 | 0 to 10 | 0.27 to 0.33 s |

| Swarm draw cost (analysis 2, 2000 points) | Median (ms) | p95 (ms) |
|---|---|---|
| GPU | 0.3 to 0.4 | 0.5 to 0.6 |
| Software | 0.2 to 0.4 | 0.5 to 0.6 |

## Fixture decks (the Task 1 and Task 8 report tests, software renderer)

- Shatter fall, fixture `fx-shatter`: 49 frames, avg 44.2 ms, p95 183.3 ms.
- Swarm stream, fixture `fx-swarm`, 2000 points: 186 frames, avg 16.7 ms, max 16.8 ms.
- Swarm draw cost, fixture `fx-swarm`: median 0.20 ms, p95 0.50 ms.

Run them with `npx vitest run tests/e2e/fx-shatter.e2e.test.ts tests/e2e/fx-swarm.e2e.test.ts -t "report|frame time"`. The numbers print to stdout.

## Reading

- **Swarm draw cost:** cheap. One redraw costs under 1 ms.
- **Swarm stream:** mostly 60 fps. In the first GPU round, each run lost about 1 s to 3 to 5 long frames, worst 467 ms. That is derived from 129 to 136 frames at avg 26 to 29 ms for a 3.5 s step, not measured directly. In the second GPU round, it held 60 fps. The cause of the first round's stall is not known.
- **Shatter fall, GPU:** p95 is about one frame in most runs, but 1 to 14 frames run long, worst 667 ms. Up to 1.2 s of a 2.2 s step went to long frames in one run. That would show on stage as a stutter or a short freeze.
- **Shatter fall, software:** too slow (about 10 fps). The fall moves 30 clones of the slide with 3D transforms and blur. A CPU renderer cannot keep up.
- **Shard count:** `shatter(ctx, { shards })` lowers it if the laptop stutters. The demo uses the default 30.
- **Not measured:** a real headed browser and a weaker laptop. The user's manual check covers both.
