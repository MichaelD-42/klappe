import { iconTile } from "klappe/fx";
import type { Ctx, Rect, SectionModule } from "klappe/types";

const SVG = "http://www.w3.org/2000/svg";
const NAMES = ["Requirements", "Analysis", "Clarification", "Design", "Verification"];
const ICONS = ["clipboard-list", "scan-search", "messages-square", "pencil-ruler", "shield-check"];
// Stage centres keep Requirements in the overview scene (0..1920) and Verification left of
// the global-team scene (from 5760). The band sits low, under the default scene text, with
// room for the clarification answer line above it.
const X0 = 1000;
const GAP = 1100;
const Y = 1022;
const BOX = { width: 460, height: 90 };
const LABEL_PX = 62; // stays >= 14 px at 1366x768 when the overview frames the whole stream
const TILE = 140; // the stage's icon tile, just above its box

// Where the stage sits inside its scene frame (x, stage px); default the centre. Clarification
// sits left, so its frame starts right of the Analysis cards (Analysis x < 1640, scene-local).
const FRAME_AT: Record<string, number> = { clarification: 420 };

const centre = (name: string) => {
  const i = NAMES.findIndex((n) => n.toLowerCase() === name);
  if (i < 0) throw new Error(`value-stream: unknown stage '${name}'`);
  return X0 + GAP * i;
};

// A full stage-sized frame around a stage box, so default scene text still fits above it.
export const stageFrame = (name: string): Rect => ({ x: centre(name) - (FRAME_AT[name] ?? 960), y: 0, w: 1920, h: 1080 });

export const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

// A hidden scene title. A scene with build() gets no default title, so it shows this one in step 1.
export function heading(ctx: Ctx, text: string): HTMLElement {
  const h = document.createElement("h2");
  h.textContent = text;
  Object.assign(h.style, { opacity: "0", visibility: "hidden" });
  ctx.html.append(h);
  return h;
}

// A hidden caption centred on (x, y), scene-local, in the accent colour: names a thing on screen.
export function label(ctx: Ctx, text: string, x: number, y: number): HTMLElement {
  const d = document.createElement("div");
  d.textContent = text;
  Object.assign(d.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: "max-content", translate: "-50% -50%",
    fontSize: "32px", fontWeight: "600", color: "var(--k-accent)", opacity: "0", visibility: "hidden",
  });
  ctx.html.append(d);
  return d;
}

const section: SectionModule = {
  build(ctx) {
    const x1 = X0;
    const x2 = X0 + GAP * (NAMES.length - 1);
    const line = svgEl("line", { x1, y1: Y, x2, y2: Y, "stroke-width": 6, "stroke-dasharray": x2 - x1 });
    line.style.stroke = "var(--k-accent)";
    line.style.strokeDashoffset = String(x2 - x1); // hidden until the overview draws it on
    ctx.svg.append(line);

    const boxes = NAMES.map((name, i) => {
      const g = svgEl("g", { "data-stage": name.toLowerCase() });
      // The box fill is there from the start and hides the line under it; the overview draws the
      // outline and fades the name in.
      const r = svgEl("rect", { x: X0 + GAP * i - BOX.width / 2, y: Y - BOX.height / 2, ...BOX, rx: 6, "stroke-width": 4 });
      r.style.fill = "var(--k-bg)";
      r.style.stroke = "var(--k-accent)";
      const t = svgEl("text", { x: X0 + GAP * i, y: Y, "text-anchor": "middle", "dominant-baseline": "central", "font-size": LABEL_PX });
      Object.assign(t.style, { fill: "var(--k-fg)", opacity: "0", visibility: "hidden" });
      t.textContent = name;
      g.append(r, t);
      ctx.svg.append(g);
      return g;
    });

    // Hidden until the overview draws them; each stage's scene lights its tile.
    const tiles = NAMES.map((_, i) =>
      iconTile(ctx, ICONS[i], { x: X0 + GAP * i, y: Y - BOX.height / 2 - 20 - TILE / 2, size: TILE, tone: "accent" }),
    );

    // The box outlines of the whole stream, first box to last.
    const bounds: Rect = { x: x1 - BOX.width / 2, y: Y - BOX.height / 2, w: x2 - x1 + BOX.width, h: BOX.height };
    return {
      stages: Object.fromEntries(NAMES.map((n) => [n.toLowerCase(), stageFrame(n.toLowerCase())])),
      stream: { line, boxes, tiles, bounds },
    };
  },
};
export default section;
