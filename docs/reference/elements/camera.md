# Camera: `follow`, `impactShake`

Two camera moves inside a scene. `follow` closes in on an element that `travel` moves and keeps it in the middle of the screen until it arrives. `impactShake` jolts everything the camera shows once, for "this landed"; it is the camera-level twin of `shake`.

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

`impactShake(ctx)` returns a step adder: a damped jolt down and up for 0.4 s that ends exactly at rest. It starts when the tweens added to the step so far end, so add it after the move that lands. It moves the world's layers, not the world, so it does not fight the camera. The pinned background stays still. In a deck with `intensity: bold` the jolt is 1.5 times as deep. With reduced motion it does nothing.
