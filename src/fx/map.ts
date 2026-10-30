import { gsap } from "gsap";
import { geoNaturalEarth1, geoPath } from "d3";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { MultiPolygon } from "geojson";
import topo from "world-atlas/land-110m.json";
import countryTopo from "world-atlas/countries-110m.json";
import { MARKER_MIX } from "./annotate";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export interface Site {
  id: string;
  label?: string; // none: no text, for a deck that places its own labels
  lon: number;
  lat: number;
  major?: boolean; // its label also reads at world zoom: it shows with site() and hides while zoomTo is in
}
export interface WorldMapOpts {
  rect: Rect;
  sites: Site[];
  // Arcs created at load; arc() then only adds the draw-on tween.
  arcs?: { from: string; to: string }[];
}
export interface WorldMapHandle {
  draw: StepAdder;
  site(tl: gsap.core.Timeline, id: string): void;
  // `at` is the position on the timeline, as in tl.to.
  arc(tl: gsap.core.Timeline, fromId: string, toId: string, at?: gsap.Position): void;
  // A site's position, scene-local: where its dot sits. Undefined (and a deck problem) for an unknown id.
  point(id: string): [number, number] | undefined;
  // The path of the map's arc from one site to another, for your own drawing or a figure's walk.
  arcPath(fromId: string, toId: string): string | undefined;
  zoomTo(tl: gsap.core.Timeline, id: string): void;
  // Fills a country, named as in world-atlas ("Germany") or by its ISO 3166-1 numeric code ("276"). share, 0 to 1,
  // sets how strong the fill is, for a map shaded by value; a later call on the country moves it there.
  region(tl: gsap.core.Timeline, country: string, o?: { share?: number }): void;
  // Back to the whole map: labels fade out, the camera frames the scene again.
  world: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const LAND = feature(topo as unknown as Topology, (topo as unknown as Topology).objects.land as GeometryCollection)
  .features[0].geometry as MultiPolygon;
const COUNTRIES = feature(countryTopo as unknown as Topology, (countryTopo as unknown as Topology).objects.countries as GeometryCollection).features;
// A fixed zoom box (canvas units) gives camera scale 4, so an 8-unit label renders at 8 * 4 * 1366/1920 = 22.8 px.
const ZOOM = { w: 480, h: 270 };
const LABEL_SIZE = 8;
const MAJOR_SIZE = 24; // a major site's label at world zoom (scale 1): 17 px at 1366, over the 14.2 px floor
// Stroke widths in map units at world zoom (scale 1) and at zoom (scale 4): about 1.75 and 3.4 px at 1920.
const STROKE = { world: { land: 1.75, arc: 1.5 }, zoom: { land: 0.85, arc: 0.75 } };

// The whole globe (the sphere) fitted into rect. In a deck, prefer the handle's point().
export const fitProjection = (r: Rect) =>
  geoNaturalEarth1().fitExtent([[r.x, r.y], [r.x + r.w, r.y + r.h]], { type: "Sphere" });

// A quadratic curve from a to b that bows upward by a quarter of its length. In a deck, prefer the handle's arcPath().
export function arcPath([ax, ay]: [number, number], [bx, by]: [number, number]): string {
  const lift = Math.hypot(bx - ax, by - ay) / 4;
  return `M ${ax} ${ay} Q ${(ax + bx) / 2} ${(ay + by) / 2 - lift} ${bx} ${by}`;
}

const node = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return parent.appendChild(e);
};
// pathLength 1 lets one dash pattern hide every path at load and draw it on, without measuring.
const hiddenStroke = { pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1, fill: "none" };

export function worldMap(ctx: Ctx, opts: WorldMapOpts): WorldMapHandle {
  const proj = fitProjection(opts.rect);
  const path = geoPath(proj);
  const g = node(ctx.svg, "g", { "data-k-map": "", "data-k-bleed": "" }); // zoomTo runs the land off the frame by design
  // Rings drawn as lines, not polygons: a polygon closes Antarctica along the map's bottom edge.
  const land = LAND.coordinates.map((coordinates) =>
    node(g, "path", {
      d: path({ type: "MultiLineString", coordinates }) ?? "",
      ...hiddenStroke,
      style: `stroke: color-mix(in srgb, var(--k-fg) 75%, transparent); stroke-width: ${STROKE.world.land}; stroke-linejoin: round`,
    }),
  );
  const arcLayer = node(g, "g", {});

  const sites = new Map<string, { at: [number, number]; dot: SVGCircleElement; label?: SVGTextElement; major?: SVGTextElement }>();
  for (const s of opts.sites) {
    const at = Number.isFinite(s.lon) && Number.isFinite(s.lat) ? proj([s.lon, s.lat]) : null;
    if (!at) {
      ctx.problem(`worldMap: site '${s.id}' has no valid lon/lat`);
      continue;
    }
    const dot = node(g, "circle", { cx: at[0], cy: at[1], r: 3.5, style: "fill: var(--k-accent)" });
    const label = s.label
      ? node(g, "text", { x: at[0] + 6, y: at[1] + LABEL_SIZE * 0.35, style: `fill: var(--k-fg); font-family: var(--k-font); font-size: ${LABEL_SIZE}px` })
      : undefined;
    if (label) {
      label.textContent = s.label!;
      gsap.set(label, { autoAlpha: 0 });
    }
    const major = s.label && s.major
      ? node(g, "text", { x: at[0] + 10, y: at[1] + MAJOR_SIZE * 0.35, "data-k-map-major": "", style: `fill: var(--k-fg); font-family: var(--k-font); font-weight: 600; font-size: ${MAJOR_SIZE}px; paint-order: stroke; stroke: var(--k-bg); stroke-width: 4` })
      : undefined;
    if (major) {
      major.textContent = s.label!;
      gsap.set(major, { autoAlpha: 0 });
    }
    gsap.set(dot, { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%" }); // transform written at load, as seek(0) leaves it
    sites.set(s.id, { at, dot, label, major });
  }

  const get = (id: string) => {
    const s = sites.get(id);
    if (!s) ctx.problem(`worldMap: unknown site '${id}'`);
    return s;
  };

  // Zoom state while the timeline is built, in step order, so a lazily created arc gets the right width.
  let zoomed = false;
  const shown = new Set<SVGTextElement>(); // the major labels the site() steps so far showed
  const arcs = new Map<string, SVGPathElement>();
  const makeArc = (fromId: string, toId: string) => {
    const [a, b] = [get(fromId), get(toId)];
    if (!a || !b) return;
    const width = (zoomed ? STROKE.zoom : STROKE.world).arc;
    const p = node(arcLayer, "path", { d: arcPath(a.at, b.at), ...hiddenStroke, style: `stroke: var(--k-accent); stroke-width: ${width}` });
    arcs.set(`${fromId}>${toId}`, p);
    return p;
  };
  for (const a of opts.arcs ?? []) makeArc(a.from, a.to);

  // Strokes follow the camera so lines keep about the same rendered weight.
  const strokes = (tl: gsap.core.Timeline, w: { land: number; arc: number }) => {
    tl.to(land, { strokeWidth: w.land, duration: motion.camera }, "<");
    if (arcs.size) tl.to([...arcs.values()], { strokeWidth: w.arc, duration: motion.camera }, "<");
  };

  const regions = new Map<string, { p: SVGPathElement; mix: number }>(); // mix: the fill the steps added so far leave
  return {
    region(tl, country, o = {}) {
      const f = COUNTRIES.find((c) => c.id === country || (c.properties as { name?: string } | null)?.name === country);
      if (!f) return ctx.problem(`worldMap: no country '${country}'; use the ISO 3166-1 numeric code or the name in world-atlas`);
      const { share } = o;
      if (share !== undefined && !(share >= 0 && share <= 1)) ctx.problem(`worldMap: region '${country}' share ${share} is not 0 to 1`);
      // The accent mix in %: MARKER_MIX without a share, else from 15 at 0 to 85 at 1.
      const mix = share !== undefined && share >= 0 && share <= 1 ? Math.round(15 + 70 * share) : MARKER_MIX * 100;
      const fill = (m: number) => `color-mix(in srgb, var(--k-accent) ${Math.round(m)}%, transparent)`;
      // Made while the timeline is built at load, hidden, under the coastline (the group's first child).
      const was = regions.get(country);
      if (!was) {
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d", path(f) ?? "");
        p.dataset.kRegion = country;
        p.style.fill = fill(mix);
        g.prepend(p);
        gsap.set(p, { autoAlpha: 0 });
        regions.set(country, { p, mix });
        return void tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false });
      }
      // Filled before: the fill moves from the mix the steps before left to this one, written as a function of progress.
      const from = was.mix;
      was.mix = mix;
      tl.to({}, { duration: motion.step, onUpdate(this: gsap.core.Tween) { was.p.style.fill = fill(from + (mix - from) * this.ratio); } });
    },
    draw: (tl) => tl.fromTo(land, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.4, ease: "power1.inOut" }),
    site(tl, id) {
      const s = get(id);
      if (!s) return;
      tl.fromTo(s.dot, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: motion.step, ease: "back.out(2)" });
      if (s.major && !zoomed) tl.to(s.major, { autoAlpha: 1, duration: motion.step }, "<");
      if (s.major) shown.add(s.major);
    },
    arc(tl, fromId, toId, at) {
      // An arc not declared in opts.arcs is created here, while the timeline is built at load,
      // hidden by its dash, so seek(0) still shows nothing. Declare arcs to keep step functions tween-only.
      const p = arcs.get(`${fromId}>${toId}`) ?? makeArc(fromId, toId);
      if (p) tl.fromTo(p, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, at);
    },
    point: (id) => get(id)?.at,
    arcPath(fromId, toId) {
      const [a, b] = [get(fromId), get(toId)];
      return a && b ? arcPath(a.at, b.at) : undefined;
    },
    zoomTo(tl, id) {
      const s = get(id);
      if (!s) return;
      // Labels are too small to read at world zoom; only the zoomed site's label shows, so none sits off stage.
      const others = [...sites.values()].filter((o) => o !== s).flatMap((o) => (o.label ? [o.label] : []));
      tl.to(s.dot, { autoAlpha: 1, scale: 1, duration: 0.3 });
      if (others.length) tl.to(others, { autoAlpha: 0, duration: 0.3 }, "<");
      if (shown.size) tl.to([...shown], { autoAlpha: 0, duration: 0.3 }, "<"); // world-size labels would be 4 times as big
      const [x, y] = [ctx.rect.x + s.at[0], ctx.rect.y + s.at[1]];
      ctx.camera.to(tl, { x: x - ZOOM.w / 2, y: y - ZOOM.h / 2, ...ZOOM }, { at: "<" });
      strokes(tl, STROKE.zoom);
      zoomed = true;
      if (s.label) tl.to(s.label, { autoAlpha: 1, duration: motion.step });
    },
    world(tl) {
      const labels = [...sites.values()].flatMap((s) => (s.label ? [s.label] : []));
      if (labels.length) tl.to(labels, { autoAlpha: 0, duration: 0.3 });
      ctx.camera.to(tl, ctx.rect, { at: "<" });
      strokes(tl, STROKE.world);
      if (shown.size) tl.to([...shown], { autoAlpha: 1, duration: motion.step });
      zoomed = false;
    },
  };
}
