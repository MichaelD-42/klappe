import { gsap } from "gsap";
import { drawOn } from "./draw";
import { measure } from "./measure";
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

// A leader line from the target to a label box; the line draws on, then the box and its text fade in.
// The target is measured when the step is added (see measure).
export function callout(ctx: Ctx, opts: CalloutOpts): CalloutHandle {
  return {
    show(tl) {
      const { target, text, side } = opts;
      const box: Rect | undefined = target instanceof Element ? measure(ctx, target) : { x: target.x, y: target.y, w: 0, h: 0 };
      if (!box) return ctx.problem(`callout: target of "${text}" has no size to measure`);
      const { from, to } = anchor(box, side, opts.offset);

      const label = document.createElement("div");
      label.setAttribute("data-k-callout", "");
      Object.assign(label.style, {
        position: "absolute", left: "0", top: "0", width: "max-content", maxWidth: "520px", boxSizing: "border-box",
        padding: "14px 22px", borderRadius: "12px", background: "var(--k-surface)", border: "2px solid var(--k-accent)", color: "var(--k-fg)",
        font: "600 32px/1.25 var(--k-font)", zIndex: "4",
      });
      const span = label.appendChild(document.createElement("span"));
      span.textContent = text;
      ctx.html.append(label);
      const pos = labelPos(to, side, label.offsetWidth, label.offsetHeight);
      Object.assign(label.style, { left: `${pos.x}px`, top: `${pos.y}px` });
      gsap.set(label, { autoAlpha: 0 });
      gsap.set(span, { opacity: 0 });
      if (pos.x < 0 || pos.y < 0 || pos.x + label.offsetWidth > ctx.rect.w || pos.y + label.offsetHeight > ctx.rect.h) {
        label.remove(); // nothing half-drawn reaches the audience
        return ctx.problem(`callout: "${text}" does not fit the frame on side ${side}`);
      }

      const line = document.createElementNS(SVG, "line");
      line.setAttribute("data-k-callout", "");
      for (const [k, v] of Object.entries({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })) line.setAttribute(k, String(v));
      Object.assign(line.style, { stroke: "var(--k-accent)", strokeWidth: "3", strokeLinecap: "round" });
      ctx.svg.append(line);

      drawOn(line, { duration: 0.5 })(tl);
      tl.to(label, { autoAlpha: 1, duration: 0.2 }, ">-0.1");
      tl.to(span, { opacity: 1, duration: motion.step }, ">");
    },
  };
}
