import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Ctx, Rect, StepAdder } from "../types";
import type { TransitionOpts } from "./transitions";

export interface ShatterOpts {
  // An element inside the scene (not ctx.html itself: the shards live in ctx.html).
  target: Element;
  impact?: { x: number; y: number }; // scene-local
  shards?: number; // default 30
  fall?: number; // default 1
  toViewer?: number; // default 0.25
  seed?: number;
}
export interface ShatterHandle {
  crack: StepAdder;
  crack2: StepAdder;
  fall: StepAdder;
}

interface Pt {
  x: number;
  y: number;
}
export interface ShatterGeometry {
  cells: Pt[][]; // shard polygons; they tile the box
  cracks: { pts: Pt[]; r: number }[]; // crack lines (shard borders), r: distance of their start from the impact
  reach: number; // distance from the impact to the farthest box corner
}

const SEED = 1986; // the spike's seed
const SPIKE_REACH = 1400; // the spike's impact-to-corner distance; spike timings and widths are in its pixels

// mulberry32: deterministic cracks, shards and motion.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const area = (P: Pt[]) =>
  Math.abs(
    P.reduce((s, a, i) => {
      const b = P[(i + 1) % P.length];
      return s + a.x * b.y - b.x * a.y;
    }, 0) / 2,
  );

// Sutherland-Hodgman, one edge at a time: keeps the side where f(v) <= 0.
function clipBy(poly: Pt[], f: (v: Pt) => number): Pt[] {
  const out: Pt[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const [sa, sb] = [f(a), f(b)];
    if (sa <= 0) out.push(a);
    if (sa < 0 !== sb < 0 && sa !== sb) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  });
  return out;
}

// One crack web: `rays` radial cracks crossing `bands` rings, as in the spike.
function web(w: number, h: number, impact: Pt, rays: number, bands: number, seed: number): ShatterGeometry {
  const rand = rng(seed);
  const R = (a: number, b: number) => a + rand() * (b - a);
  const reach = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => dist(impact, { x, y })));
  // Rings grow outward like the spike's 130/340/640/1050; the last one lies far outside so the cells cover the box.
  const rings = [0, ...Array.from({ length: bands - 1 }, (_, j) => 0.75 * reach * ((j + 1) / (bands - 1)) ** 1.4), 6 * reach];
  const gap = (Math.PI * 2) / rays;
  // Jag and wobble shrink near the impact and with many rays, so neighbouring cracks never cross.
  const jag = (a: Pt, b: Pt, amp: number): Pt[] => {
    const L = dist(a, b) || 1;
    const n = Math.max(1, Math.round(L / 45));
    const [nx, ny] = [-(b.y - a.y) / L, (b.x - a.x) / L];
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const k = Math.min(amp, dist(p, impact) * gap * 0.12);
      const j = i && i < n ? R(-k, k) : 0;
      return { x: p.x + nx * j, y: p.y + ny * j };
    });
  };
  const off = rand() * Math.PI * 2;
  const angles = Array.from({ length: rays }, (_, i) => off + (i + R(-0.25, 0.25)) * gap);
  const wobble = 0.115 * gap; // the spike's ±0.08 rad at 9 rays
  const node = angles.map((a) =>
    rings.map((r, j) => {
      if (!j) return { ...impact };
      const [b, s] = [a + R(-wobble, wobble), r * R(0.85, 1.15)];
      return { x: impact.x + Math.cos(b) * s, y: impact.y + Math.sin(b) * s };
    }),
  );
  const ray = node.map((ns) => ns.slice(1).map((p, j) => jag(ns[j], p, 9))); // ring j -> j+1 along ray i
  const ring = node.map((ns, i) => ns.map((p, j) => (j ? jag(p, node[(i + 1) % rays][j], 7) : [p]))); // ray i -> i+1 along ring j

  const box = [(v: Pt) => -v.x, (v: Pt) => v.x - w, (v: Pt) => -v.y, (v: Pt) => v.y - h];
  const rev = (a: Pt[]) => [...a].reverse();
  const cells: Pt[][] = [];
  for (let i = 0; i < rays; i++)
    for (let j = 0; j < bands; j++) {
      const k = (i + 1) % rays;
      const P = box.reduce((p, f) => (p.length ? clipBy(p, f) : p), [
        ...ray[i][j],
        ...ring[i][j + 1].slice(1),
        ...rev(ray[k][j]).slice(1),
        ...(j ? rev(ring[i][j]).slice(1, -1) : []),
      ]);
      if (P.length > 2 && area(P) > 0) cells.push(P); // no area cut-off: every point needs its shard
    }

  // Crack lines are the shard borders. Inner rings crack fully, outer ones in part (spike: 1, 1, .7, .4).
  const cracks: ShatterGeometry["cracks"] = [];
  ray.forEach((segs) => segs.forEach((pts, j) => cracks.push({ pts, r: rings[j] })));
  ring.forEach((segs) =>
    segs.forEach((pts, j) => {
      const keep = Math.min(1, Math.max(0, 1.6 - (0.3 * j * 4) / (bands - 1)));
      if (j && j < bands && rand() < keep) cracks.push({ pts, r: rings[j] + 40 * (reach / SPIKE_REACH) });
    }),
  );
  return { cells, cracks, reach };
}

// Cracks and shard polygons for a w x h box. The ray count is corrected until the shard count is near `shards`.
export function shatterGeometry(w: number, h: number, impact: Pt, shards = 30, seed = SEED): ShatterGeometry {
  const want = Math.max(2, shards);
  const b0 = Math.min(8, Math.max(1, Math.round(Math.sqrt(want / 1.2)))); // 30 shards: 5 bands, as in the spike
  const miss = (g: ShatterGeometry) => Math.abs(g.cells.length - want);
  let best: ShatterGeometry | undefined;
  // Fewer bands only when the preferred count cannot get close (few shards). At least 4 rays: the outer ring covers the box.
  for (let bands = b0; bands >= Math.max(1, b0 - 2); bands--) {
    let rays = Math.max(4, Math.round((9 * want) / (6 * bands)));
    for (let k = 0; k < 5; k++) {
      const g = web(w, h, impact, rays, bands, seed);
      if (!best || miss(g) < miss(best)) best = g;
      if (!miss(g)) break;
      rays = Math.max(4, Math.round((rays * want) / g.cells.length));
    }
    if (miss(best!) <= want * 0.1) break;
  }
  return best!;
}

const SVG = "http://www.w3.org/2000/svg";
const pts = (P: Pt[]) => P.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");

// A copy for a shard: no ids or data-* (the engine and the self-test look elements up by them).
// visible: also clear inline opacity and visibility, so the copy shows its end state.
// Otherwise drop hidden subtrees (GSAP hides inline), so a copy of a whole world stays small.
function copy(src: Element, visible: boolean): HTMLElement {
  const c = src.cloneNode(true) as HTMLElement;
  if (!visible)
    for (const e of c.querySelectorAll<HTMLElement>("[style]"))
      if (e.style.visibility === "hidden" || e.style.display === "none" || e.style.opacity === "0") e.remove();
  for (const e of [c, ...c.querySelectorAll<HTMLElement>("*")]) {
    for (const a of [...e.attributes]) if (a.name === "id" || a.name.startsWith("data-")) e.removeAttribute(a.name);
    if (visible && e.style) {
      e.style.removeProperty("opacity");
      e.style.removeProperty("visibility");
    }
  }
  return c;
}

type Core = Required<Omit<ShatterOpts, "target" | "impact">> & { impact: Pt };

// Builds the overlay in host at box (cracks, flash, hidden shards with a clone each) and returns the step adders.
// hide: the originals the shards replace; they shake with the cracks. fill: a background under each shard's copy.
function build(host: HTMLElement, box: Rect, clone: () => HTMLElement, hide: HTMLElement[], o: Core, fill = ""): ShatterHandle {
  const { w, h } = box;
  const geo = shatterGeometry(w, h, o.impact, o.shards, o.seed);
  const k = geo.reach / SPIKE_REACH; // spike distances scale with the box
  const rand = rng(o.seed ^ 0x5bd1e995);
  const R = (a: number, b: number) => a + rand() * (b - a);
  const abs = (e: HTMLElement, extra: Partial<CSSStyleDeclaration> = {}) =>
    Object.assign(e.style, { position: "absolute", left: "0", top: "0", width: `${w}px`, height: `${h}px`, ...extra });

  const layer = document.createElement("div");
  abs(layer, { left: `${box.x}px`, top: `${box.y}px`, pointerEvents: "none" });
  host.append(layer);

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  abs(svg as unknown as HTMLElement, { overflow: "hidden", filter: "drop-shadow(0 0 3px color-mix(in srgb, var(--k-fg) 90%, transparent))" });
  const cracks = geo.cracks.map((c) => {
    const el = document.createElementNS(SVG, "polyline");
    el.setAttribute("points", pts(c.pts));
    el.setAttribute("pathLength", "1");
    el.setAttribute("stroke-width", String(c.r < 300 * k ? 3.4 : c.r < 700 * k ? 2.4 : 1.6));
    Object.assign(el.style, { fill: "none", stroke: "var(--k-fg)", strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: "1", strokeDashoffset: "1" });
    svg.append(el);
    return { el, r: c.r / k, len: c.pts.reduce((s, v, i) => (i ? s + dist(c.pts[i - 1], v) : 0), 0) };
  });

  const flash = document.createElement("div");
  abs(flash, {
    opacity: "0",
    background: `radial-gradient(circle at ${o.impact.x}px ${o.impact.y}px, var(--k-fg) 0, color-mix(in srgb, var(--k-fg) 85%, transparent) 6%, color-mix(in srgb, var(--k-accent) 25%, transparent) 22%, transparent 45%)`,
  });

  const field = document.createElement("div");
  abs(field, { perspective: "1400px" });
  const shards = geo.cells.map((P) => {
    const wrap = document.createElement("div");
    abs(wrap);
    const inner = document.createElement("div");
    abs(inner, { background: fill, clipPath: `polygon(${P.map((v) => `${v.x.toFixed(1)}px ${v.y.toFixed(1)}px`).join(",")})` });
    inner.append(clone());
    const edge = document.createElementNS(SVG, "svg");
    edge.setAttribute("viewBox", `0 0 ${w} ${h}`);
    abs(edge as unknown as HTMLElement, { overflow: "visible" });
    const poly = document.createElementNS(SVG, "polygon");
    poly.setAttribute("points", pts(P));
    Object.assign(poly.style, { fill: "none", stroke: "color-mix(in srgb, var(--k-fg) 55%, transparent)", strokeWidth: "1.5" });
    edge.append(poly);
    wrap.append(inner, edge);
    field.append(wrap);
    const cx = P.reduce((s, v) => s + v.x, 0) / P.length;
    const cy = P.reduce((s, v) => s + v.y, 0) / P.length;
    gsap.set(wrap, { autoAlpha: 0, transformOrigin: `${cx}px ${cy}px` });
    return { el: wrap, cx, cy, d: Math.hypot(cx - o.impact.x, cy - o.impact.y) };
  });
  layer.append(svg, flash, field);
  gsap.set(svg, { autoAlpha: 1 }); // the fall hides it; a seek back restores this inline value

  // Shake moves the CSS translate property, so a target's own GSAP transform stays untouched.
  for (const e of [...hide, svg as unknown as HTMLElement, field]) e.style.translate = "0px 0px";

  // A short decaying jitter, baked from the seed so play and seek agree.
  const shake = (amp: number, n = 8) => ({
    keyframes: [
      ...Array.from({ length: n }, (_, i) => {
        const a = amp * (1 - i / n);
        return { translate: `${R(-a, a).toFixed(1)}px ${R(-a, a).toFixed(1)}px`, duration: 0.035 };
      }),
      { translate: "0px 0px", duration: 0.05 },
    ],
  });
  const pulse = (tl: gsap.core.Timeline, glow: number, amp: number, inner: boolean) => {
    const t0 = tl.duration() + 0.02;
    tl.fromTo(flash, { opacity: glow }, { opacity: 0, duration: inner ? 0.45 : 0.35, ease: "power2.out", immediateRender: false }, t0);
    tl.to([...hide, svg], shake(amp), t0);
    for (const c of cracks.filter((c) => c.r < 300 === inner)) {
      const at = inner ? c.r / 1800 : (c.r - 300) / 2200;
      tl.to(c.el, { strokeDashoffset: 0, duration: Math.max(inner ? 0.04 : 0.05, c.len / k / 2400), ease: "power1.out" }, t0 + at * k);
    }
  };

  // The share toViewer of the shards, nearest the impact, tumbles toward the viewer.
  const near = new Set([...shards].sort((a, b) => a.d - b.d).slice(0, Math.round(o.toViewer * shards.length)));
  const fall: StepAdder = (tl) => {
    const t0 = tl.duration() + 0.02;
    tl.set([...hide, svg], { autoAlpha: 0 }, t0);
    tl.fromTo(shards.map((s) => s.el), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0, immediateRender: false }, t0);
    tl.fromTo(flash, { opacity: 0.9 }, { opacity: 0, duration: 0.5, ease: "power2.out", immediateRender: false }, t0);
    tl.to(field, shake(16, 6), t0);
    for (const s of shards) {
      const [ux, uy] = [(s.cx - o.impact.x) / (s.d || 1), (s.cy - o.impact.y) / (s.d || 1)];
      const at = t0 + 0.08 + ((s.d / k / 1900) * 0.45 + R(0, 0.15));
      tl.to(s.el, { x: ux * R(8, 18), y: uy * R(8, 18), duration: 0.12, ease: "power2.out" }, t0);
      if (near.has(s)) {
        gsap.set(s.el, { filter: "blur(0px)" }); // blur layer only where needed
        tl.to(s.el, {
          x: `+=${ux * R(200, 420)}`,
          y: `+=${R(250, 650)}`,
          scale: R(1.9, 2.8),
          rotation: R(-40, 40),
          rotationX: R(-60, 60),
          rotationY: R(-60, 60),
          filter: "blur(9px)",
          autoAlpha: 0,
          duration: R(1.0, 1.35) * o.fall,
          ease: "power2.in",
        }, at);
      } else
        tl.to(s.el, {
          x: `+=${ux * R(60, 260)}`,
          y: `+=${R(1300, 1700)}`,
          rotation: R(-55, 55),
          rotationX: R(-35, 35),
          rotationY: R(-35, 35),
          duration: R(1.35, 1.9) * o.fall,
          ease: "power2.in",
        }, at);
    }
    tl.set(shards.map((s) => s.el), { autoAlpha: 0 }, tl.duration()); // after the slowest shard
  };
  return { crack: (tl) => pulse(tl, 1, 22, true), crack2: (tl) => pulse(tl, 0.7, 12, false), fall };
}

// The spike's impact point (1240, 430 on 1920 x 1080), as a share of the box.
const impactIn = (w: number, h: number) => ({ x: w * 0.646, y: h * 0.398 });
const core = (o: Partial<ShatterOpts>, impact: Pt): Core => ({
  shards: o.shards ?? 30,
  fall: o.fall ?? 1,
  toViewer: o.toViewer ?? 0.25,
  seed: o.seed ?? SEED,
  impact,
});

export function shatter(ctx: Ctx, opts: ShatterOpts): ShatterHandle {
  const { target } = opts;
  if (!(target instanceof HTMLElement) || target === ctx.html || !ctx.html.contains(target))
    throw new Error("shatter: target must be an HTML element inside the scene, not the scene itself");
  // The box in scene units: both rects sit under the same stage and camera transform.
  const hr = ctx.html.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  const s = hr.width / ctx.rect.w || 1;
  const box = { x: (tr.left - hr.left) / s, y: (tr.top - hr.top) / s, w: tr.width / s || ctx.rect.w, h: tr.height / s || ctx.rect.h };
  const impact = opts.impact ? { x: opts.impact.x - box.x, y: opts.impact.y - box.y } : impactIn(box.w, box.h);
  const clone = () => {
    const c = copy(target, true);
    Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: `${box.w}px`, height: `${box.h}px`, margin: "0", boxSizing: "border-box", transform: "none" });
    return c;
  };
  return build(ctx.html, box, clone, [target], core(opts, impact));
}

// Crack and fall on a copy of the old world's visible frame, over black, then a cut to the new one.
export function transitionShatter(
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts & { shards?: number; seed?: number },
): gsap.core.Timeline {
  const worlds = from.el.parentElement!;
  let host = worlds.querySelector<HTMLElement>(":scope > [data-k-shatter]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.kShatter = "";
    Object.assign(host.style, { position: "absolute", left: "0", top: "0", width: "1920px", height: "1080px" });
    worlds.append(host);
  }
  host.replaceChildren(); // one overlay, reused: the previous shatter's shards go
  gsap.set(host, { autoAlpha: 1 });
  const h = build(host, { x: 0, y: 0, w: 1920, h: 1080 }, () => copy(from.el, false), [from.el], core(opts as Partial<ShatterOpts>, impactIn(1920, 1080)), "var(--k-bg)"); // the stage colour behind the old world
  const tl = gsap.timeline();
  h.crack(tl);
  tl.set(worlds, { backgroundColor: "var(--k-blackout)" });
  h.fall(tl);
  return tl
    .set(from.el, { autoAlpha: 0, translate: "0px 0px" })
    .set(to.el, { autoAlpha: 1 })
    .set(host, { autoAlpha: 0 })
    .set(worlds, { clearProps: "backgroundColor" });
}
