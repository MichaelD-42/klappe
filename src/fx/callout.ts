import { gsap } from "gsap";
import { drawOn, typeSize } from "./draw";
import { radius, strokeW } from "./layout";
import { atEnd, measure } from "./measure";
import { STEP_LABEL } from "./media";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export interface CalloutOpts {
  target: Element | { x: number; y: number };
  text: string;
  side: "left" | "right" | "top" | "bottom";
  offset?: number; // leader length from the target edge, scene units; default 120
}
export interface CalloutHandle {
  show: StepAdder;
  hide: StepAdder; // the leader and the label fade out; add it after show
  // The leader and the label move to where the target is once this step has played, from the step's start: add it
  // in the step that moves the target (after the move, as a code diff), so they move with it.
  follow: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";

// The target's edge point on `side` and the point `offset` further out: where the leader ends and the label's near edge midpoint sits.
export function anchor(box: Rect, side: CalloutOpts["side"], offset = 120): { from: { x: number; y: number }; to: { x: number; y: number } } {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const from = { left: { x: box.x, y: cy }, right: { x: box.x + box.w, y: cy }, top: { x: cx, y: box.y }, bottom: { x: cx, y: box.y + box.h } }[side];
  const d = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[side];
  return { from, to: { x: from.x + d[0] * offset, y: from.y + d[1] * offset } };
}

// The label's top-left corner, given the leader end and the label size.
export function labelPos(to: { x: number; y: number }, side: CalloutOpts["side"], w: number, h: number): { x: number; y: number } {
  return {
    left: { x: to.x - w, y: to.y - h / 2 },
    right: { x: to.x, y: to.y - h / 2 },
    top: { x: to.x - w / 2, y: to.y - h },
    bottom: { x: to.x - w / 2, y: to.y },
  }[side];
}

// The target where the steps added so far leave it (a code line a diff moved); a point as it is.
const measureAtEnd = (ctx: Ctx, tl: gsap.core.Timeline, target: CalloutOpts["target"]): Rect | undefined =>
  target instanceof Element ? atEnd(tl, () => measure(ctx, target)) : { x: target.x, y: target.y, w: 0, h: 0 };

const fits = (ctx: Ctx, pos: { x: number; y: number }, w: number, h: number) => pos.x >= 0 && pos.y >= 0 && pos.x + w <= ctx.rect.w && pos.y + h <= ctx.rect.h;

// A leader line from the target to a label box; the line draws on, then the box and its text fade in.
// The target is measured where the steps before leave it, when the step is added (see measure).
export function callout(ctx: Ctx, opts: CalloutOpts): CalloutHandle {
  let drawn: Element[] | undefined; // the line and the label, once show has made them
  let at: { x: number; y: number } | undefined; // where the label's corner sits after the steps added so far
  return {
    show(tl) {
      const { target, text, side } = opts;
      const box = measureAtEnd(ctx, tl, target);
      if (!box) return ctx.problem(`callout: target of "${text}" has no size to measure`);
      const { from, to } = anchor(box, side, opts.offset);

      const label = document.createElement("div");
      label.setAttribute("data-k-callout", "");
      Object.assign(label.style, {
        position: "absolute", left: "0", top: "0", width: "max-content", maxWidth: "520px", boxSizing: "border-box",
        padding: "14px 22px", borderRadius: radius(12), background: "var(--k-surface)", border: "2px solid var(--k-accent)", color: "var(--k-fg)",
        font: `600 ${typeSize("label", 32)}px/1.25 var(--k-font)`, zIndex: "4",
      });
      const span = label.appendChild(document.createElement("span"));
      span.textContent = text;
      ctx.html.append(label);
      const pos = labelPos(to, side, label.offsetWidth, label.offsetHeight);
      Object.assign(label.style, { left: `${pos.x}px`, top: `${pos.y}px` });
      gsap.set(label, { autoAlpha: 0, x: 0, y: 0 }); // x, y: follow moves it; unset, play and seek would differ
      gsap.set(span, { opacity: 0 });
      if (!fits(ctx, pos, label.offsetWidth, label.offsetHeight)) {
        label.remove(); // nothing half-drawn reaches the audience
        return ctx.problem(`callout: "${text}" does not fit the frame on side ${side}`);
      }

      const line = document.createElementNS(SVG, "line");
      line.setAttribute("data-k-callout", "");
      for (const [k, v] of Object.entries({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })) line.setAttribute(k, String(v));
      Object.assign(line.style, { stroke: "var(--k-accent)", strokeWidth: strokeW(3), strokeLinecap: "round" });
      // In its own SVG in the HTML layer, with the label: in ctx.svg a picture or card under the target would hide it.
      const layer = ctx.html.appendChild(document.createElementNS(SVG, "svg"));
      for (const [k, v] of Object.entries({ width: ctx.rect.w, height: ctx.rect.h })) layer.setAttribute(k, String(v));
      Object.assign(layer.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none", zIndex: "4" });
      layer.append(line);
      gsap.set(line, { autoAlpha: 1 }); // the start hide() fades from, written at load so a seek back writes the same

      drawn = [line, label];
      at = pos;
      drawOn(line, { duration: 0.5 })(tl);
      tl.to(label, { autoAlpha: 1, duration: 0.2 }, ">-0.1");
      tl.to(span, { opacity: 1, duration: motion.step }, ">");
    },
    follow(tl) {
      const start = tl.labels[STEP_LABEL] ?? tl.duration();
      const box = drawn && at && measureAtEnd(ctx, tl, opts.target);
      if (!drawn || !at || !box) {
        tl.set({}, {}, tl.duration() + 0.4); // the step still takes a beat
        return ctx.problem(drawn ? `callout: target of "${opts.text}" has no size to measure` : `callout: follow of "${opts.text}" before it shows`);
      }
      const [line, label] = drawn as [SVGLineElement, HTMLElement];
      const { from, to } = anchor(box, opts.side, opts.offset);
      const pos = labelPos(to, opts.side, label.offsetWidth, label.offsetHeight);
      if (!fits(ctx, pos, label.offsetWidth, label.offsetHeight)) return ctx.problem(`callout: "${opts.text}" does not fit the frame on side ${opts.side}`);
      const first = { x: parseFloat(label.style.left), y: parseFloat(label.style.top) };
      at = pos;
      const move = { duration: motion.step }; // the default ease, as code moves its lines
      tl.to(line, { attr: { x1: from.x, y1: from.y, x2: to.x, y2: to.y }, ...move }, start);
      tl.to(label, { x: pos.x - first.x, y: pos.y - first.y, ...move }, start);
    },
    hide(tl) {
      // A callout that did not draw (no size, out of the frame) has reported that already.
      if (drawn) tl.to(drawn, { autoAlpha: 0, duration: motion.step });
    },
  };
}
