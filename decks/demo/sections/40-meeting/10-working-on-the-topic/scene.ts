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

const box = (parent: HTMLElement, css: Partial<CSSStyleDeclaration>, text = "") => {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, { position: "absolute", boxSizing: "border-box" }, css);
  e.textContent = text;
  return e;
};

const scene: SceneModule = {
  build(ctx) {
    const title = ctx.html.appendChild(document.createElement("h2"));
    title.textContent = "Working on the topic";
    const figures = SEATS.map(([x, y]) => figure(ctx, { x, y, scale: SCALE, color: "var(--k-fg)" }));

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

    const topic = box(
      ctx.html,
      { left: "330px", top: "880px", width: "1260px", height: "130px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px", fontWeight: "700", color: "var(--k-accent)" },
      "[Topic]",
    );
    const note = { width: `${NOTE.w}px`, height: `${NOTE.h}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: "700", background: "var(--k-accent)", color: "var(--k-bg)", borderRadius: "4px" };
    // Each note starts above its figure's head and ends in its theme's group (ideas 1, 4, 7 in theme A...).
    const notes = SEATS.map(([x, y], i) => {
      const home = { left: x - NOTE.w / 2, top: y - 207 - NOTE.h - 40 };
      const slot = Math.floor(i / 3);
      const group = {
        left: THEME_X[i % 3] + (slot % 2 ? NOTE.gap / 2 : -NOTE.w - NOTE.gap / 2),
        top: THEME_Y + 60 + Math.floor(slot / 2) * (NOTE.h + NOTE.gap),
      };
      const el = box(ctx.html, { ...note, left: `${home.left}px`, top: `${home.top}px` }, `[Idea ${i + 1}]`);
      return { el, dx: group.left - home.left, dy: group.top - home.top };
    });
    const themes = THEMES.map((t, i) =>
      box(ctx.html, { left: `${THEME_X[i] - 200}px`, top: `${THEME_Y}px`, width: "400px", textAlign: "center", fontSize: "44px", fontWeight: "700" }, t),
    );
    gsap.set([title, table, topic, ...notes.map((n) => n.el), ...themes], { autoAlpha: 0 });

    // deck.md sets intensity calm; a scene-built shout cannot read it, so it is set here too.
    const sh = shout(ctx, { question: "What can we only do together?", answer: "Decide.", intensity: "calm" });
    return { title, figures, table, topic, notes, themes, sh };
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
    (tl, r) => {
      tl.addLabel("cluster");
      r.notes.forEach((n: { el: HTMLElement; dx: number; dy: number }, i: number) =>
        tl.to(n.el, { x: n.dx, y: n.dy, rotation: TILT[i] / 2, duration: 1.2, ease: "power2.inOut" }, `cluster+=${(i % 3) * 0.1}`),
      );
      tl.fromTo(r.themes, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.15 }, "cluster+=0.9");
    },
    // The board steps back so the question and its answer read clean over it.
    (tl, r) => {
      r.sh.enter(tl);
      tl.to([...r.notes.map((n: { el: HTMLElement }) => n.el), ...r.themes], { autoAlpha: 0.12, duration: 0.6 }, "<");
    },
    (tl, r) => r.sh.hold(tl),
    (tl, r) => r.sh.fade(tl),
    (tl, r) => r.sh.answer(tl),
  ],
};
export default scene;
