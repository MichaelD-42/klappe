import { gsap } from "gsap";
import { arcPath, figure, fitProjection, worldMap, type Site } from "klappe/fx";
import type { Ctx, Rect, SectionModule } from "klappe/types";

const SVG = "http://www.w3.org/2000/svg";

// Both scenes share this frame, right of the value stream (which stays left of x = 5760).
export const FRAME: Rect = { x: 7680, y: 0, w: 1920, h: 1080 };
// The map sits under the scene title. Canvas coordinates: a section draws on the whole canvas.
const MAP: Rect = { x: FRAME.x + 60, y: 260, w: 1800, h: 780 };
// Placeholder sites at plausible land coordinates; not real locations of anyone.
const SITES: Site[] = [
  { id: "s1", label: "[Site 1]", lon: -100, lat: 40 },
  { id: "s2", label: "[Site 2]", lon: -50, lat: -10 },
  { id: "s3", label: "[Site 3]", lon: 78, lat: 22 },
  { id: "s4", label: "[Site 4]", lon: 135, lat: -25 },
];
const HOST: Site = { id: "host", label: "[Host site]", lon: 12, lat: 48 };
const PER_SITE = 2;

// Figures are about 230 units tall at scale 1. The thicker stroke keeps them visible at this size.
const FIG = { scale: 0.18, stroke: "10" };
// Map-scale text: 24 units renders at 17 px at 1366x768, over the 14 px minimum.
const LABEL = { site: 26, role: 24 };

// fitProjection and arcPath are the map's own: routes follow the drawn arcs in the same coordinates.
const proj = fitProjection(MAP);
const at = (s: Site) => proj([s.lon, s.lat]) as [number, number];
const [HX, HY] = at(HOST);

// Where the travellers sit at the host table: six behind it, one at each end.
const SEATS: [number, number][] = [
  ...[-100, -60, -20, 20, 60, 100].map((dx): [number, number] => [HX + dx, HY + 70]),
  [HX - 160, HY + 92],
  [HX + 160, HY + 92],
];

function svgText(parent: SVGGElement, x: number, y: number, s: string, size: number, anchor: string, weight = 400) {
  const t = document.createElementNS(SVG, "text");
  for (const [k, v] of Object.entries({ x, y, "text-anchor": anchor, "font-size": size, "font-weight": weight })) t.setAttribute(k, String(v));
  Object.assign(t.style, { fill: "var(--k-fg)", fontFamily: "var(--k-font)" });
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
  const map = worldMap(ctx, { rect: MAP, sites: [...SITES, HOST], arcs: SITES.map((s) => ({ from: s.id, to: HOST.id })) });
  const g = ctx.svg;
  let seat = 0;
  const sites = SITES.map((s) => {
    const [sx, sy] = at(s);
    const label = svgText(g, sx, sy - 16, s.label, LABEL.site, "middle", 700);
    const members = Array.from({ length: PER_SITE }, (_, k) => {
      const side = k ? 1 : -1;
      const home: [number, number] = [sx + 14 * side, sy + 48];
      const fig = figure(ctx, { x: home[0], y: home[1], scale: FIG.scale, color: "var(--k-fg)" });
      (g.lastElementChild as SVGGElement).style.strokeWidth = FIG.stroke; // the figure's root group
      const role = svgText(g, sx + 30 * side, sy + 34, "[Role]", LABEL.role, side < 0 ? "end" : "start");
      // A short step onto the site, then the site's arc to the host.
      const route = `M ${home[0]} ${home[1]} L ${arcPath([sx, sy], [HX, HY]).replace(/^M/, "")}`;
      return { fig, role, route, seat: SEATS[seat++] };
    });
    return { id: s.id, label, members };
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

  const hostLabel = svgText(g, HX, HY - 16, HOST.label, LABEL.site, "middle", 700);
  gsap.set([table, hostLabel, ...sites.flatMap((s) => [s.label, ...s.members.map((m) => m.role)])], { autoAlpha: 0 });
  return {
    map,
    titles: [title(ctx.html, "Where we are"), title(ctx.html, "Coming together")],
    sites,
    members: sites.flatMap((s) => s.members),
    host: HOST.id,
    hostLabel,
    table,
  };
}
export type GlobalTeam = ReturnType<typeof build>;

const section: SectionModule = {
  build: (ctx) => ({
    globalTeam: build(ctx),
    // The zoom into the meeting room dives here: the host table, in canvas coordinates.
    hostSite: { x: HX - 170, y: HY + 20, w: 340, h: 80 },
  }),
};
export default section;
