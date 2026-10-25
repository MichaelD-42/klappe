# Camera: `follow`, `impactShake`, `rackFocus`, `tilt`, `dollyZoom`

Camera moves inside a scene. `follow` closes in on an element that `travel` moves and keeps it in the middle of the screen until it arrives. `impactShake` jolts everything the camera shows once, for "this landed"; it is the camera-level twin of `shake`.

Catalog: section `237-camera` (`#/camera/follow/2`).

Only in `scene.ts`. Shortened from `decks/demo/sections/237-camera/10-follow/scene.ts` (the scene also draws the tiles in a first step):

```ts
import { follow, iconTile, impactShake, travel } from "klappe/fx";

build: (ctx) => {
  const parcel = iconTile(ctx, "package", { x: 0, y: 0, size: 88, tone: "warn" });
  const ship = travel(ctx, parcel.el, { path: "M410 700 C 800 260, 1150 900, 1546 420", route: "draw", duration: 3 });
  return { ship, cam: follow(ctx, ship, { zoom: 1.8 }), land: impactShake(ctx), back: (tl) => ctx.camera.to(tl, ctx.rect) };
},
steps: [
  (tl, r) => (r.ship(tl), r.cam(tl), r.land(tl)), // the shake starts when the travel ends
  (tl, r) => r.back(tl),
],
```

## `follow`

`follow(ctx, travelAdder, opts)` returns a step adder. Pass it what `travel` returned. Add it after the travel's adder, in the same step: it starts with the travel and lasts as long.

Over the first 30 % of the move the camera closes in from its view at the step's start; after that the element stays at the centre of the screen. The camera stays there when the move ends: the next scene flies in from there. To go back within the scene, call `ctx.camera.to(tl, ctx.rect)` in a later step.

| Name   | Type   | Default | Meaning                                                                        |
| ------ | ------ | ------- | ------------------------------------------------------------------------------ |
| `zoom` | number | 1.6     | how much closer than the view at the step's start the camera holds the element |

The camera reads the travel's path at the move's progress, not the element's place on screen, so a deep link, a walk and a step back land the same. With reduced motion the camera cuts to the end frame, as the element jumps to the end.

Limits:

- It follows `travel` only. A travel whose path has no length gives `follow: add the travel's step before follow, in the same step`, as does a follow added before its travel. A travel added in an earlier step gives `follow: the travel is in an earlier step; add follow in the travel's step`.
- The view is not kept inside the canvas: near a canvas edge, the camera shows the empty stage past it.

`ctx.camera.follow(tl, point, { duration, at, zoom })` is the engine move under it, for an element that moves another way: `point(t)` gives the place in canvas units at time share `t` (0 to 1). It must be a pure function of `t`.

## `impactShake`

`impactShake(ctx)` returns a step adder: a damped jolt down and up for 0.4 s that ends exactly at rest. It starts when the tweens added to the step so far end, so add it after the move that lands. It moves the world's layers, not the world, so it does not fight the camera. The pinned background stays still. With reduced motion it does nothing.

## `rackFocus`

`rackFocus(ctx, items, opts)` returns `{ on(item), clear }`, like [focus](focus.md). `on(item)` keeps one item sharp while the others blur and dim, as a lens pulls focus. `item` is an index or one of the elements. A later `on` moves the focus; `clear` makes all sharp again. Catalog: `#/camera/rack-focus/2`.

```ts
import { flow, rackFocus } from "klappe/fx";

build: (ctx) => {
  const f = flow(ctx, { /* nodes plan, build, ship */ });
  return { f, x: rackFocus(ctx, ["plan", "build", "ship"].map((id) => f.node(id))) };
},
steps: [(tl, r) => r.f.show()(tl), (tl, r) => r.x.on(0)(tl), (tl, r) => r.x.on(2)(tl), (tl, r) => r.x.clear(tl)],
```

| Name   | Type   | Default | Meaning                                  |
| ------ | ------ | ------- | ---------------------------------------- |
| `dim`  | number | 0.6     | the opacity of the items out of focus    |
| `blur` | number | 6       | px of blur on the items out of focus     |

Only each item's `opacity` and CSS `filter` tween. The blur sits on the items, never on a layer, so the browser redraws only their boxes while it tweens; a blur over the whole scene would redraw the full stage every frame (see `docs/perf-m2.md`). Use it on a few items, not on a whole picture. Measured roughly on 2026-10-25 (headless Chromium, software renderer, the demo scene with three flow nodes): the pull ran at 16.7 ms a frame, 54 frames, no long frame, in 3 runs. With reduced motion it stays: nothing moves.

Limits:

- It owns the items' `filter`: an item's own filter is lost. At load it sets `filter: blur(0px)` on every item.
- As with `focus`, the owner must have shown the items before the first `on` and must not tween their opacity after it.
- An item not in the list gives `rackFocus: the item is not in the list`.

## `tilt`

`tilt(ctx, rect, opts)` returns a step adder: a camera flight to `rect` (canvas units) that leans a little into its direction, most at mid-flight, and lands flat. A long flight feels less flat. Catalog: `#/camera/tilt/2`.

```ts
import { tilt } from "klappe/fx";

build: (ctx) => ({ there: tilt(ctx, { ...ctx.rect, x: ctx.rect.x - 3840 }), back: tilt(ctx, ctx.rect) }),
steps: [null, (tl, r) => r.there(tl), (tl, r) => r.back(tl)],
```

| Name       | Type   | Default         | Meaning                          |
| ---------- | ------ | --------------- | -------------------------------- |
| `deg`      | number | 4               | the lean at its peak, in degrees |
| `duration` | number | the camera time | seconds of the flight            |

It is opt-in: the engine's flights between scenes do not lean. `ctx.camera.to(tl, rect, { tilt: 4 })` is the same move. The lean turns the whole stage about its centre, pinned background included, with a 3D perspective; a horizontal flight turns about the vertical axis, a vertical one about the horizontal. A pure zoom does not lean. With reduced motion the flight is a cut, with no lean.

## `dollyZoom`

`dollyZoom(ctx, { target, amount, duration })` returns a step adder: the "vertigo" move, for a big reveal. The camera pulls back from `target` while the target grows by as much, so it holds its size and place. The rest of the scene shrinks around it, and the pinned background grows. Catalog: `#/camera/dolly/2`.

```ts
import { dollyZoom, iconTile } from "klappe/fx";

build: (ctx) => {
  const rocket = iconTile(ctx, "rocket", { x: 960, y: 470, size: 240, tone: "accent" });
  return { out: dollyZoom(ctx, { target: rocket.el, amount: 1.8 }), back: dollyZoom(ctx, { target: rocket.el, amount: 1 }) };
},
```

| Name       | Type    | Default  | Meaning                                                                   |
| ---------- | ------- | -------- | ------------------------------------------------------------------------- |
| `target`   | Element | required | the element that holds its size and place                                 |
| `amount`   | number  | 1.6      | how far the camera pulls back and the background grows; 1 goes back home |
| `duration` | number  | 2        | seconds                                                                   |

It is an approximation. A real dolly zoom shifts the perspective of a 3D scene; the klappe world is flat. So three planes at three scales stand in for it: the target holds, the scene shrinks by `amount`, the background grows by `amount`. The background needs to be there for the full effect: give the scene or section a `background`.

The camera, the target's scale and the background's scale stay at the end of the step. Call `dollyZoom` again with `amount: 1` to go back. With reduced motion it cuts to the same end.

Limits:

- It assumes the camera is on the scene's frame when the first dolly starts, and that nothing else moves the camera between two dollies.
- It scales the target and the canvas's whole pinned layer. A later scene on the same canvas sees the background still grown: go back with `amount: 1` before the scene ends.
- A target with no size gives `dollyZoom: the target has no size to measure`.
