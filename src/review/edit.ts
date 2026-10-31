import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Channel } from "../speaker/channel";
import type { Stepper } from "../stepper";
import { stage as size } from "../theme";
import type { Deck, StepAddr } from "../types";

const NUDGE_SEND_MS = 400; // a run of arrow presses sends one line

type Box = [number, number, number, number]; // x, y, w, h in scene px
// The only styles edit mode sets, and puts back: GSAP owns the rest of the element's inline style.
const PROPS = ["translate", "scale", "transformOrigin", "transformBox"] as const;
type Prop = (typeof PROPS)[number];

// What the line names an element by: the effect (its root's first data-k-* attribute) or its tag, and its text.
// The call site would be better, but Vite reprints scene.ts, so a stack trace's line does not hold (DECISIONS.md).
export function describe(el: Element): string {
  const fx = [...el.attributes].find((a) => a.name.startsWith("data-k-"))?.name.slice(7);
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  const short = text.length > 40 ? `${text.slice(0, 39)}…` : text;
  return `${fx ?? el.localName}${short ? ` "${short}"` : ""}`;
}
export const editLine = (what: string, from: Box, to: Box) => `Move ${what} from [${from.join(", ")}] to [${to.join(", ")}]`;

// Edit mode in the deck window while the review window is open (dev server only): a click selects the element an
// effect built in the current scene; a drag moves it, the corner handle resizes it, the arrow keys nudge it (Shift: 10 px).
// A preview only, through CSS translate and scale, never the timeline; the next step drops it. Each change sends
// one line to the review window, which writes it into the step's Visuals finding.
// A double click on text from scene.md (a step or the title the default renderer drew) edits it in place: Enter
// writes it straight back to scene.md through the dev server, Escape or a refused write puts the old text back.
export function mountEdit(stage: HTMLElement, ui: HTMLElement, canvases: CanvasRuntime[], stepper: Stepper, steps: StepAddr[], channel: Channel, deck: Deck): void {
  stage.dataset.noAdvance = ""; // a click selects instead of stepping
  stage.classList.add("k-editing");
  const frame = ui.appendChild(document.createElement("div"));
  frame.className = "k-edit-box";
  frame.hidden = true;
  const handle = frame.appendChild(document.createElement("div"));
  handle.className = "k-edit-handle";
  const label = frame.appendChild(document.createElement("span"));
  label.className = "k-edit-label";

  let sel: { el: HTMLElement | SVGElement; from: Box; what: string; t: [number, number]; s: [number, number]; style: Record<Prop, string> } | undefined;
  let timer = 0;
  const here = () => steps[stepper.index];
  const canvas = () => canvases[here().canvas];
  // Screen px per scene px, and where a client point is in scene px.
  const geometry = () => {
    const st = stage.getBoundingClientRect();
    const fit = st.width / size.w;
    const w = canvas().world;
    const cam = Number(gsap.getProperty(w, "scaleX"));
    const [cx, cy] = [Number(gsap.getProperty(w, "x")), Number(gsap.getProperty(w, "y"))];
    const r = canvas().layout.rects[here().scene];
    return { fit, cam, st, at: (x: number, y: number): [number, number] => [((x - st.left) / fit - cx) / cam - r.x, ((y - st.top) / fit - cy) / cam - r.y] };
  };
  const to = (): Box => {
    const [x, y, w, h] = sel!.from;
    return [Math.round(x + sel!.t[0]), Math.round(y + sel!.t[1]), Math.round(w * sel!.s[0]), Math.round(h * sel!.s[1])];
  };
  const draw = () => {
    if (!sel) return void (frame.hidden = true);
    const s = sel.el.style;
    s.translate = `${sel.t[0]}px ${sel.t[1]}px`;
    s.scale = `${sel.s[0]} ${sel.s[1]}`;
    const r = sel.el.getBoundingClientRect();
    const { st, fit } = geometry();
    Object.assign(frame.style, { left: `${(r.left - st.left) / fit}px`, top: `${(r.top - st.top) / fit}px`, width: `${r.width / fit}px`, height: `${r.height / fit}px` });
    label.textContent = `[${to().join(", ")}]`;
    frame.hidden = false;
  };
  const send = () => {
    clearTimeout(timer);
    if (!sel) return;
    const key = `Move ${sel.what} from [${sel.from.join(", ")}]`;
    channel.send({ t: "edit", index: stepper.index, key, line: editLine(sel.what, sel.from, to()) });
  };
  const drop = () => {
    clearTimeout(timer);
    if (sel) Object.assign(sel.el.style, sel.style);
    sel = undefined;
    draw();
  };
  const select = (el: HTMLElement | SVGElement) => {
    drop();
    const r = el.getBoundingClientRect();
    const g = geometry();
    const [x, y] = g.at(r.left, r.top);
    const k = g.fit * g.cam;
    const style = Object.fromEntries(PROPS.map((p) => [p, el.style[p]])) as Record<Prop, string>;
    // Scale from the top-left corner, so the from rect's x and y stay put while it resizes.
    Object.assign(el.style, { transformOrigin: "0 0", transformBox: "fill-box" });
    sel = { el, from: [x, y, r.width / k, r.height / k].map(Math.round) as Box, what: describe(el), t: [0, 0], s: [1, 1], style };
    draw();
  };
  // The topmost element under the pointer that an effect or the default renderer built: a child of the scene's own
  // HTML or SVG layer. Not the event target: the scene's HTML layer covers its SVG layer.
  const pick = (x: number, y: number): HTMLElement | SVGElement | undefined => {
    const id = CSS.escape(here().scene);
    const layers = [...canvas().world.querySelectorAll(`div[data-scene="${id}"], g[data-scene="${id}"]`)];
    for (let e of document.elementsFromPoint(x, y) as (Element | null)[]) {
      while (e && !layers.includes(e.parentElement!)) e = e.parentElement;
      if (e instanceof HTMLElement || e instanceof SVGElement) return e;
    }
  };
  const drag = (e: PointerEvent, move: (dx: number, dy: number, t0: [number, number], s0: [number, number]) => void) => {
    const { fit, cam } = geometry();
    const [x0, y0, t0, s0] = [e.clientX, e.clientY, [...sel!.t] as [number, number], [...sel!.s] as [number, number]];
    let moved = false;
    const onMove = (m: PointerEvent) => {
      moved = true;
      move((m.clientX - x0) / (fit * cam), (m.clientY - y0) / (fit * cam), t0, s0);
      draw();
    };
    const onUp = () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      if (moved) send();
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
  };

  stage.addEventListener("pointerdown", (e) => {
    if (e.target === handle || !e.isPrimary || (e.target as HTMLElement).isContentEditable) return;
    const el = pick(e.clientX, e.clientY);
    if (!el) return drop();
    if (el !== sel?.el) select(el);
    e.preventDefault();
    drag(e, (dx, dy, t0) => (sel!.t = [t0[0] + dx, t0[1] + dy]));
  });
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const [, , w, h] = sel!.from;
    drag(e, (dx, dy, _t, s0) => (sel!.s = [Math.max(0.05, s0[0] + dx / w), Math.max(0.05, s0[1] + dy / h)]));
  });
  let typing: { el: HTMLElement; was: string } | undefined;
  const source = () => deck.sections.find((s) => s.id === here().section)?.scenes.find((s) => s.id === here().scene)?.source;
  const finish = async (keep: boolean) => {
    if (!typing) return;
    const { el, was } = typing;
    typing = undefined;
    el.contentEditable = "false";
    const now = (el.textContent ?? "").trim();
    if (!keep || !now || now === was) return void (el.textContent = was);
    const r = await fetch("/__klappe/text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: source(), from: was, to: now }),
    }).catch(() => undefined);
    if (!r?.ok) el.textContent = was; // not on exactly one line of scene.md (a step with a link), or no dev server
  };
  stage.addEventListener("dblclick", (e) => {
    const el = pick(e.clientX, e.clientY);
    if (!(el instanceof HTMLElement) || !(el.matches("p[data-step]") || el.localName === "h2") || !source()?.endsWith("scene.md")) return;
    drop();
    typing = { el, was: (el.textContent ?? "").trim() };
    el.contentEditable = "plaintext-only";
    el.focus();
    getSelection()?.selectAllChildren(el);
    el.addEventListener("blur", () => void finish(true), { once: true });
  });
  // While text is edited, keys type; Enter keeps it, Escape drops it. Otherwise arrows nudge the selection
  // instead of stepping, and Escape lets it go.
  const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  addEventListener(
    "keydown",
    (e) => {
      if (typing) {
        e.stopImmediatePropagation();
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          void finish(e.key === "Enter");
        }
        return;
      }
      if (!sel) return;
      const d = ARROWS[e.key];
      if (!d && e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!d) return drop();
      const n = e.shiftKey ? 10 : 1;
      sel.t = [sel.t[0] + d[0] * n, sel.t[1] + d[1] * n];
      draw();
      clearTimeout(timer);
      timer = window.setTimeout(send, NUDGE_SEND_MS);
    },
    true,
  );
  stepper.on("step", () => (void finish(false), drop()));
}
