import { gsap } from "gsap";
import { figure, shout, type FigureHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";

const SVG = "http://www.w3.org/2000/svg";
const NOTE = { w: 160, h: 110, gap: 12 };
// The eight travellers from the map: six behind the table, one at each end (feet, scene-local).
const SEATS: [number, number][] = [
  ...[510, 690, 870, 1050, 1230, 1410].map((x): [number, number] => [x, 950]), // waist at the table top
  [220, 1040],
  [1700, 1040],
];
const SCALE = 0.9; // a figure is about 230 * 0.9 = 207 units tall
const THEMES = ["[Theme A]", "[Theme B]", "[Theme C]"];
const THEME_X = [560, 960, 1360];
const THEME_Y = 320; // the theme heading; its notes sit in two columns below it
const TILT = [-4, 3, -2, 4, -3, 2, -4, 3];
// Where each note lands (left, top), by note index (idea number - 1). Each theme takes notes that sit
// next to each other on the table: A = ideas 7, 1, 2; B = 3, 4; C = 5, 6, 8. Left-to-right order stays,
// and the notes fly one after another, so no note crosses another.
const ROW = [THEME_Y + 60, THEME_Y + 60 + NOTE.h + NOTE.gap];
const COL = THEME_X.flatMap((x) => [x - NOTE.w - NOTE.gap / 2, x + NOTE.gap / 2]);
const LAND: [number, number][] = [
  [COL[0], ROW[1]],
  [COL[1], ROW[0]],
  [COL[2], ROW[0]],
  [COL[3], ROW[0]],
  [COL[4], ROW[0]],
  [COL[5], ROW[0]],
  [COL[0], ROW[0]],
  [COL[5], ROW[1]],
];
const FLIGHT = [6, 0, 1, 2, 3, 4, 5, 7]; // the order the notes fly, by note index
const THEME_OF = [0, 0, 1, 1, 2, 2, 0, 2];
const FLY = { duration: 0.7, every: 0.45 };

const box = (parent: HTMLElement, css: Partial<CSSStyleDeclaration>, text = "") => {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, { position: "absolute", boxSizing: "border-box" }, css);
  e.textContent = text;
  return e;
};

const scene: SceneModule = {
  build(ctx) {
    const title = ctx.html.appendChild(document.createElement("h2"));
    title.textContent = ctx.doc!.title;
    const bodies: Element[] = [];
    const figures = SEATS.map(([x, y]) => {
      const f = figure(ctx, { x, y, scale: SCALE, color: "var(--k-fg)" });
      bodies.push(ctx.svg.lastElementChild!); // the figure's root group, dimmed for the shout-out
      return f;
    });

    // The table, drawn after the figures so it hides the legs of those behind it.
    const table = document.createElementNS(SVG, "g");
    for (const [x, y, width, height] of [
      [330, 880, 1260, 130],
      [300, 862, 1320, 18],
    ]) {
      const r = table.appendChild(document.createElementNS(SVG, "rect"));
      for (const [k, v] of Object.entries({ x, y, width, height })) r.setAttribute(k, String(v));
      Object.assign(r.style, { fill: "var(--k-bg)", stroke: "var(--k-accent)", strokeWidth: "4", strokeLinejoin: "round" });
    }
    ctx.svg.append(table);
    gsap.set(table, { strokeOpacity: 1 }); // written at load, as a seek back to the start leaves it

    const topic = box(
      ctx.html,
      { left: "330px", top: "880px", width: "1260px", height: "130px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px", fontWeight: "700", color: "var(--k-accent)" },
      "[Topic]",
    );
    const note = { width: `${NOTE.w}px`, height: `${NOTE.h}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "700", background: "var(--k-accent)", color: "var(--k-bg)", borderRadius: "4px" };
    // Each note starts above its figure's head and lands in its theme's group (LAND).
    // One layer for the notes, under the shout-out: inside it, a moving note rises above the rest.
    const layer = box(ctx.html, { left: "0", top: "0", width: "100%", height: "100%", zIndex: "1" });
    const notes = SEATS.map(([x, y], i) => {
      const home = { left: x - NOTE.w / 2, top: y - 207 - NOTE.h - 40 };
      const [left, top] = LAND[i];
      const el = box(layer, { ...note, left: `${home.left}px`, top: `${home.top}px` }, `[Idea ${i + 1}]`);
      return { el, dx: left - home.left, dy: top - home.top };
    });
    const themes = THEMES.map((t, i) =>
      box(ctx.html, { left: `${THEME_X[i] - 200}px`, top: `${THEME_Y}px`, width: "400px", textAlign: "center", fontSize: "44px", fontWeight: "700" }, t),
    );
    gsap.set([title, table, topic, ...notes.map((n) => n.el), ...themes], { autoAlpha: 0 });

    // Question, answer and intensity come from scene.md and deck.md.
    const sh = shout(ctx, { question: ctx.doc!.steps.find((s) => s.kind === "shout-enter")!.text, answer: ctx.doc!.steps.find((s) => s.kind === "shout-answer")!.text });
    return { title, figures, bodies, table, topic, notes, themes, sh };
  },
  steps: [
    // The room shows as the zoom lands; then the topic.
    (tl, r) => {
      tl.addLabel("room");
      tl.to([r.title, r.table], { autoAlpha: 1, duration: 0.6 }, "room");
      // Each figure in its own child timeline, so all of them show at once.
      r.figures.forEach((f: FigureHandle) => {
        const t = gsap.timeline();
        f.appear(t);
        tl.add(t, "room");
      });
      tl.fromTo(r.topic, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, "room+=0.6");
    },
    (tl, r) =>
      r.notes.forEach((n: { el: HTMLElement }, i: number) =>
        tl.fromTo(n.el, { autoAlpha: 0, y: 40, scale: 0.6, rotation: 0 }, { autoAlpha: 1, y: 0, scale: 1, rotation: TILT[i], duration: 0.5, ease: "back.out(1.6)" }, i ? "-=0.25" : undefined),
      ),
    // One note after another flies to its theme; a theme's heading shows with its first note.
    (tl, r) => {
      tl.addLabel("cluster");
      const shown = new Set<number>();
      FLIGHT.forEach((i, k) => {
        const n = r.notes[i];
        const at = `cluster+=${k * FLY.every}`;
        if (!shown.has(THEME_OF[i])) {
          shown.add(THEME_OF[i]);
          tl.fromTo(r.themes[THEME_OF[i]], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, at);
        }
        tl.to(n.el, { x: n.dx, y: n.dy, rotation: TILT[i] / 2, duration: FLY.duration, ease: "power2.inOut" }, at);
      });
    },
    // The board goes for the whole shout-out: notes, themes and topic hide, figures and table dim.
    (tl, r) => {
      r.sh.enter(tl);
      tl.to([...r.notes.map((n: { el: HTMLElement }) => n.el), ...r.themes, r.topic], { autoAlpha: 0, duration: 0.6 }, "<");
      tl.to(r.bodies, { opacity: 0.3, duration: 0.6 }, "<");
      // Only the table's outline dims: its fill stays solid and keeps hiding the legs behind it.
      tl.to(r.table, { strokeOpacity: 0.3, duration: 0.6 }, "<");
    },
    (tl, r) => r.sh.fade(tl),
    (tl, r) => r.sh.answer(tl),
  ],
};
export default scene;
