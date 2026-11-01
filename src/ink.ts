import { stage as size } from "./theme";

const NS = "http://www.w3.org/2000/svg";
const [HOLD, FADE] = [2000, 1000]; // ms a pen stroke stays, then fades out

// Presenter ink, live over the stage: a laser dot and a pen whose strokes fade. Points are shares of the frame (0..1),
// so the speaker view's pad and the stage agree at any size. It is the presenter's, not the deck's: it sits under
// data-k-ignore, on no timeline, and the deck clears it on every step.
export interface Ink {
  laser(x: number, y: number): void;
  hide(): void; // the laser dot
  stroke(x: number, y: number, start?: boolean): void; // start: a new stroke at the point
  lift(): void; // the stroke ends, holds a while and fades
  clear(): void;
}

export function mountInk(parent: Element, before: Element | null = null): Ink {
  const { w, h } = size;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "k-ink");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("data-k-ignore", "");
  svg.setAttribute("aria-hidden", "true");
  const dot = svg.appendChild(document.createElementNS(NS, "circle"));
  dot.setAttribute("r", "14");
  dot.style.visibility = "hidden";
  parent.insertBefore(svg, before);
  let line: SVGPolylineElement | null = null;
  const at = (x: number, y: number) => Object.assign(svg.createSVGPoint(), { x: x * w, y: y * h });
  return {
    laser(x, y) {
      dot.setAttribute("cx", String(x * w));
      dot.setAttribute("cy", String(y * h));
      dot.style.visibility = "visible";
    },
    hide: () => void (dot.style.visibility = "hidden"),
    stroke(x, y, start) {
      if (start || !line) line = svg.insertBefore(document.createElementNS(NS, "polyline"), dot);
      line.points.appendItem(at(x, y));
    },
    lift() {
      const done = line;
      line = null;
      if (!done) return;
      done.style.transition = `opacity ${FADE}ms ${HOLD}ms`;
      done.style.opacity = "0";
      setTimeout(() => done.remove(), HOLD + FADE);
    },
    clear() {
      line = null;
      svg.querySelectorAll("polyline").forEach((p) => p.remove());
      dot.style.visibility = "hidden";
    },
  };
}

// The pointer's place on el as shares of its box.
export function share(e: PointerEvent, el: Element): [number, number] {
  const r = el.getBoundingClientRect();
  return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
}

export type InkMode = "laser" | "pen" | null;

// Drives ink from the pointer on el, in the mode mode() gives. Each call is also passed to send (the speaker's pad
// sends it to the stage). The pen draws while the button is down.
export function inkPointer(el: HTMLElement, ink: Ink, mode: () => InkMode, send?: (m: InkMsg) => void): void {
  const run = (m: InkMsg) => (applyInk(ink, m), send?.(m));
  el.addEventListener("pointermove", (e) => {
    const [x, y] = share(e, el);
    if (mode() === "laser") run({ ink: "laser", x, y });
    else if (mode() === "pen" && e.buttons & 1) run({ ink: "pen", x, y });
  });
  el.addEventListener("pointerdown", (e) => {
    if (mode() !== "pen") return;
    el.setPointerCapture(e.pointerId);
    const [x, y] = share(e, el);
    run({ ink: "pen", x, y, start: true });
  });
  el.addEventListener("pointerup", () => mode() === "pen" && run({ ink: "lift" }));
  el.addEventListener("pointerleave", () => mode() === "laser" && run({ ink: "hide" }));
}

export function applyInk(ink: Ink, m: InkMsg): void {
  if (m.ink === "laser") ink.laser(m.x!, m.y!);
  else if (m.ink === "pen") ink.stroke(m.x!, m.y!, m.start);
  else ink[m.ink]();
}

export interface InkMsg {
  ink: "laser" | "pen" | "lift" | "hide";
  x?: number;
  y?: number;
  start?: boolean;
}
