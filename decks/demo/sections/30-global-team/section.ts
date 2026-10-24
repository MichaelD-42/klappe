import { gsap } from "gsap";
import { figure, worldMap, type Site } from "klappe/fx";
import type { Ctx, Rect, SectionModule } from "klappe/types";

const SVG = "http://www.w3.org/2000/svg";

// Both scenes share this frame, right of the value stream (which stays left of x = 5760).
export const FRAME: Rect = { x: 7680, y: 0, w: 1920, h: 1080 };
// The map sits centred under the scene title. Canvas coordinates: a section draws on the whole canvas.
const MAP: Rect = { x: FRAME.x + 20, y: 240, w: 1800, h: 800 };
// Placeholder sites at plausible land coordinates; not real locations of anyone.
// lift: how far each flight arc bows up (a share of its length; below 0 bows down), so the four read as spokes.
// Every arc leaves its site upward or sideways, above the figures; the site's name sits under them.
// Our sites always have a label: we draw them ourselves, so the map gets none (see build).
type Named = Site & { label: string };
const SITES: (Named & { lift: number })[] = [
  { id: "s1", label: "[Site 1]", lon: -100, lat: 40, lift: 0.14 },
  { id: "s2", label: "[Site 2]", lon: -50, lat: -10, lift: 0.06 },
  { id: "s3", label: "[Site 3]", lon: 78, lat: 22, lift: 0.04 },
  // Bows well down: it passes south of Site 3 and leaves the host steeper than Site 3's arc.
  { id: "s4", label: "[Site 4]", lon: 135, lat: -25, lift: -0.28 },
];
const HOST: Named = { id: "host", label: "[Host site]", lon: 12, lat: 48 };
const PER_SITE = 2;

// Figures are about 230 units tall at scale 1. The thick stroke keeps them visible at world zoom;
// the zoom thins it to the meeting room's 4 units (figure()'s default), so both rooms look alike.
export const FIG = { scale: 0.23, stroke: 10, zoomed: 4 };
// Arc stroke at world zoom and at the map's 4x zoom, as the map's own arcs.
export const ARC = { world: 1.5, zoomed: 0.75 };
// Map-scale text: 24 units renders at 17 px at 1366x768, over the 14 px minimum.
const LABEL = { site: 26, role: 24 };


// A quadratic arc from a to b whose middle sits `lift` of its length above the straight line.
const curve = ([ax, ay]: [number, number], [bx, by]: [number, number], lift: number) =>
  `Q ${(ax + bx) / 2} ${(ay + by) / 2 - Math.hypot(bx - ax, by - ay) * lift} ${bx} ${by}`;

// Where travellers land: two staggered rows either side of the host, under its dot and label.
const arrivals = ([HX, HY]: [number, number]): [number, number][] =>
  [-125, -95, -65, -35, 35, 65, 95, 125].map((dx, i) => [HX + dx, HY + 72 + (i % 2) * 12]);
// Where they sit at the host table: six behind it (waist at the table top), one at each end.
const seats = ([HX, HY]: [number, number]): [number, number][] => [
  ...[-100, -60, -20, 20, 60, 100].map((dx): [number, number] => [HX + dx, HY + 75]),
  [HX - 160, HY + 92],
  [HX + 160, HY + 92],
];

function svgText(parent: SVGGElement, x: number, y: number, s: string, size: number, anchor: string, weight = 400) {
  const t = document.createElementNS(SVG, "text");
  for (const [k, v] of Object.entries({ x, y, "text-anchor": anchor, "font-size": size, "font-weight": weight })) t.setAttribute(k, String(v));
  // A halo in the background colour, so coastlines and arcs never cut through the letters.
  Object.assign(t.style, { fill: "var(--k-fg)", fontFamily: "var(--k-font)", stroke: "var(--k-bg)", strokeWidth: "6", paintOrder: "stroke", strokeLinejoin: "round" });
  t.textContent = s;
  parent.append(t);
  return t;
}

function title(html: HTMLElement, s: string) {
  const box = document.createElement("div");
  box.className = "k-scene"; // the default scene title style
  Object.assign(box.style, { left: `${FRAME.x}px`, top: `${FRAME.y}px`, width: `${FRAME.w}px`, height: `${FRAME.h}px` });
  const h = box.appendChild(document.createElement("h2"));
  h.textContent = s;
  html.append(box);
  gsap.set(h, { autoAlpha: 0 });
  return h;
}

function build(ctx: Ctx) {
  const g = ctx.svg;
  // The map in its own group, so the table step can dim land, dots and arcs together.
  const mapLayer = g.appendChild(document.createElementNS(SVG, "g"));
  gsap.set(mapLayer, { opacity: 1 }); // written at load, as a seek back to the start leaves it
  // No map labels: the map puts them right of the dot, where the east arcs leave. Ours sit clear of the arcs.
  const map = worldMap({ ...ctx, svg: mapLayer }, { rect: MAP, sites: [...SITES, HOST].map(({ id, lon, lat }) => ({ id, lon, lat })) });
  // The map's own positions, so sites and routes land on the drawn map.
  const at = (s: Site) => map.point(s.id)!;
  const host = at(HOST);
  const [HX, HY] = host;
  const [ARRIVALS, SEATS] = [arrivals(host), seats(host)];
  let n = 0;
  const sites = SITES.map((s) => {
    const [sx, sy] = at(s);
    // Hidden by its dash until drawn (pathLength 1: one dash pattern fits every arc).
    const arc = mapLayer.appendChild(document.createElementNS(SVG, "path"));
    for (const [k, v] of Object.entries({ d: `M ${sx} ${sy} ${curve([sx, sy], host, s.lift)}`, pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }))
      arc.setAttribute(k, String(v));
    Object.assign(arc.style, { fill: "none", stroke: "var(--k-accent)", strokeWidth: String(ARC.world) });
    gsap.set(arc, { opacity: 1 }); // written at load, as a seek back before the zoom leaves it
    const members = Array.from({ length: PER_SITE }, (_, k) => {
      const side = k ? 1 : -1;
      const home: [number, number] = [sx + 16 * side, sy + 62];
      const fig = figure(ctx, { x: home[0], y: home[1], scale: FIG.scale, color: "var(--k-fg)", strokeWidth: FIG.stroke });
      const body = fig.el;
      // The role on a faint backing, so coastlines stay behind it.
      const role = g.appendChild(document.createElementNS(SVG, "g"));
      const back = role.appendChild(document.createElementNS(SVG, "rect"));
      const rx = sx + 34 * side;
      for (const [k, v] of Object.entries({ x: side < 0 ? rx - 70 : rx - 6, y: sy + 22, width: 76, height: 30, rx: 4 })) back.setAttribute(k, String(v));
      Object.assign(back.style, { fill: "var(--k-bg)", opacity: "0.85" });
      svgText(role, rx, sy + 44, "[Role]", LABEL.role, side < 0 ? "end" : "start");
      // A short step onto the site, the site's arc to the host, then a step to a free spot by the host.
      const arrive = ARRIVALS[n];
      const route = `M ${home[0]} ${home[1]} L ${sx} ${sy} ${curve([sx, sy], host, s.lift)} L ${arrive[0]} ${arrive[1]}`;
      return { fig, body, role, route, seat: SEATS[n++] };
    });
    const label = svgText(g, sx, sy + 92, s.label, LABEL.site, "middle", 700); // under the figures, away from the arc
    return { id: s.id, arc, label, members };
  });

  // The host table: a front panel and a top, drawn after the figures so it hides the legs behind it.
  const table = document.createElementNS(SVG, "g");
  for (const [x, y, width, height] of [
    [HX - 120, HY + 58, 240, 34],
    [HX - 132, HY + 52, 264, 6],
  ]) {
    const r = document.createElementNS(SVG, "rect");
    for (const [k, v] of Object.entries({ x, y, width, height })) r.setAttribute(k, String(v));
    Object.assign(r.style, { fill: "var(--k-bg)", stroke: "var(--k-accent)", strokeWidth: "2", strokeLinejoin: "round" });
    table.append(r);
  }
  g.append(table);

  // Above-right of the dot: the east arcs bow down and the west ones come in from the left, so none crosses it.
  const hostLabel = svgText(g, HX + 12, HY - 14, HOST.label, LABEL.site, "start", 700);
  // The same label at the 4x zoom: 8 units renders at 23 px at 1366x768.
  const zoomLabel = svgText(g, HX + 7, HY - 7, HOST.label, 8, "start");
  zoomLabel.style.strokeWidth = "2";
  gsap.set([table, hostLabel, zoomLabel,...sites.flatMap((s) => [s.label, ...s.members.map((m) => m.role)])], { autoAlpha: 0 });
  return {
    map,
    mapLayer,
    titles: [title(ctx.html, "Where we are"), title(ctx.html, "Coming together")],
    sites,
    members: sites.flatMap((s) => s.members),
    host: HOST.id,
    hostLabel,
    zoomLabel,
    table,
    // The zoom into the meeting room dives here: the host table, in canvas coordinates.
    hostSite: { x: HX - 170, y: HY + 20, w: 340, h: 80 },
  };
}
export type GlobalTeam = ReturnType<typeof build>;

const section: SectionModule = {
  build: (ctx) => {
    const globalTeam = build(ctx);
    return { globalTeam, hostSite: globalTeam.hostSite };
  },
};
export default section;
