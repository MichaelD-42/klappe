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
- **Draw cost:** the time of one `tl.seek()` plus the swarm redraw, over 120 seeks across the stream step.
- Each demo row is the range over 3 runs.

## Demo deck

| Effect                                      | Renderer | Frames     | Avg (ms)     | p95 (ms)     | Max (ms)     | Frames > 20 ms |
| ------------------------------------------- | -------- | ---------- | ------------ | ------------ | ------------ | -------------- |
| Shatter fall (old-way 2 to 3, 30 shards)    | GPU      | 103 to 132 | 20.1 to 27.5 | 16.7 to 16.8 | 233 to 667   | 1 to 5         |
| Shatter fall                                | Software | 22 to 36   | 61 to 100    | 200 to 317   | 217 to 367   | 11 to 13       |
| Swarm stream (analysis 1 to 2, 2000 points) | GPU      | 129 to 136 | 25.9 to 28.8 | 16.8         | 450 to 467   | 3 to 5         |
| Swarm stream                                | Software | 207 to 211 | 16.7 to 17.0 | 16.7 to 16.8 | 16.8 to 49.9 | 0 to 3         |

| Swarm draw cost (analysis 2, 2000 points) | Median (ms) | p95 (ms)   |
| ----------------------------------------- | ----------- | ---------- |
| GPU                                       | 0.3 to 0.4  | 0.5 to 0.6 |
| Software                                  | 0.2 to 0.4  | 0.5 to 0.6 |

## Fixture decks (the Task 1 and Task 8 report tests, software renderer)

- Shatter fall, fixture `fx-shatter`: 49 frames, avg 44.2 ms, p95 183.3 ms.
- Swarm stream, fixture `fx-swarm`, 2000 points: 186 frames, avg 16.7 ms, max 16.8 ms.
- Swarm draw cost, fixture `fx-swarm`: median 0.20 ms, p95 0.50 ms.

Run them with `npx vitest run tests/e2e/fx-shatter.e2e.test.ts tests/e2e/fx-swarm.e2e.test.ts -t "report|frame time"`. The numbers print to stdout.

## Reading

- **Swarm:** cheap. One redraw costs under 1 ms. The stream holds 60 fps on both renderers once it runs.
- **Shatter, software:** too slow (avg 61 to 100 ms). The fall moves 30 clones of the slide with 3D transforms and blur. A CPU renderer cannot keep up.
- **Shatter and swarm, GPU:** p95 is one frame (16.8 ms). But each step starts with one long stall: 233 to 667 ms for the shatter, about 450 ms for the swarm. It is most likely the first raster of the new layers, but this was not proven. A stall that long would show on stage as a short freeze.
- **Shard count:** `shatter(ctx, { shards })` lowers it if the laptop stutters. The demo uses the default 30.
- **Not measured:** a real headed browser and a weaker laptop. The user's manual check covers both.
