import type { Point as Pt, Rect } from "../types";

// Arrow routing shared by flow and swimlanes: boxes sit in the cells of a grid, so the lines between the cells
// (xs across, ys down) are free channels an arrow can take round a box in its way.

// Whether an axis-aligned segment runs through the inside of a box; along its edge is not through.
const through = (p: Pt, q: Pt, b: Rect) =>
  Math.max(p.x, q.x) > b.x && Math.min(p.x, q.x) < b.x + b.w && Math.max(p.y, q.y) > b.y && Math.min(p.y, q.y) < b.y + b.h;
const clear = (pts: Pt[], boxes: Rect[]) => pts.slice(1).every((q, i) => boxes.every((b) => !through(pts[i], q, b)));
// Drops the corners a route does not turn at.
const tidy = (pts: Pt[]) =>
  pts.filter((p, i) => i === 0 || i === pts.length - 1 || !((pts[i - 1].x === p.x && p.x === pts[i + 1].x) || (pts[i - 1].y === p.y && p.y === pts[i + 1].y)));
const swap = (p: Pt) => ({ x: p.y, y: p.x });

// The route, or one round the boxes in its way (the arrow's own two boxes left out): first its middle run in
// another channel between the ends, then out to the channel beside the start, along a cross channel and in from
// the channel beside the end. Channels nearest the route come first. With no clear way, the route as it was.
export function detour(pts: Pt[], boxes: Rect[], xs: number[], ys: number[]): Pt[] {
  if (clear(pts, boxes)) return pts;
  // A route that leaves its box vertically is the same problem turned a quarter.
  if (pts[0].x === pts[1].x) return detour(pts.map(swap), boxes.map((b) => ({ x: b.y, y: b.x, w: b.h, h: b.w })), ys, xs).map(swap);
  const [S, E] = [pts[0], pts[pts.length - 1]];
  const s = Math.sign(E.x - S.x);
  const between = xs.filter((x) => (x - S.x) * s > 0 && (E.x - x) * s > 0).sort((a, b) => (a - b) * s);
  const mx = (S.x + E.x) / 2;
  const tries = [...between].sort((a, b) => Math.abs(a - mx) - Math.abs(b - mx)).map((x) => [S, { x, y: S.y }, { x, y: E.y }, E]);
  const [xa, xb] = [between[0], between[between.length - 1]];
  const cost = (y: number) => Math.abs(y - S.y) + Math.abs(y - E.y);
  if (xa !== undefined)
    for (const y of [...ys].sort((a, b) => cost(a) - cost(b))) tries.push([S, { x: xa, y: S.y }, { x: xa, y }, { x: xb, y }, { x: xb, y: E.y }, E]);
  return tries.map(tidy).find((t) => clear(t, boxes)) ?? pts;
}

// Runs inside routes (all but the first and last segment) on one line move apart into side-by-side lanes `gap`
// apart, in route order, so no two arrows share a segment. Moves the points in place.
export function spread(routes: Pt[][], gap: number): void {
  const runs = new Map<string, [number, number][]>();
  routes.forEach((pts, i) => {
    for (let k = 1; k < pts.length - 2; k++) {
      const key = pts[k].x === pts[k + 1].x ? `v${pts[k].x}` : `h${pts[k].y}`;
      runs.set(key, [...(runs.get(key) ?? []), [i, k]]);
    }
  });
  for (const list of runs.values())
    list.forEach(([i, k], n) => {
      const d = (n - (list.length - 1) / 2) * gap;
      const v = routes[i][k].x === routes[i][k + 1].x;
      for (const j of [k, k + 1]) routes[i][j] = v ? { x: routes[i][j].x + d, y: routes[i][j].y } : { x: routes[i][j].x, y: routes[i][j].y + d };
    });
}
