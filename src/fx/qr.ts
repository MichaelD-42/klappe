import { gsap } from "gsap";
import { encode } from "uqr";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface QrOpts {
  text: string; // usually a link
  x: number; // top-left corner of the code, scene-local
  y: number;
  size: number; // the code's width and height, scene units
  label?: string; // a line under the code
}
export interface QrHandle {
  show: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";

// A QR code the room can scan: dark modules (--k-bg) on a light tile (--k-fg), with the standard 4-module
// quiet zone, because not every phone camera reads an inverted code. Error correction M: it still reads
// with 15 % of it lost, a glare or a head in the way. Text too long for any QR code is a deck problem.
export function qr(ctx: Ctx, opts: QrOpts): QrHandle {
  const { x, y, size } = opts;
  let m: ReturnType<typeof encode>;
  try {
    m = encode(opts.text, { ecc: "M", border: 4 });
  } catch {
    ctx.problem(`qr: the text is too long for a QR code (${opts.text.length} characters)`);
    return { show: () => {} };
  }
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-qr", "");
  Object.assign(root.style, { position: "absolute", left: `${x}px`, top: `${y}px`, width: `${size}px` });
  gsap.set(root, { autoAlpha: 0 });
  const svg = root.appendChild(document.createElementNS(SVG, "svg"));
  for (const [k, v] of Object.entries({ width: size, height: size, viewBox: `0 0 ${m.size} ${m.size}`, "shape-rendering": "crispEdges" }))
    svg.setAttribute(k, String(v));
  Object.assign(svg.style, { display: "block", background: "var(--k-fg)", borderRadius: `${size / m.size}px` });
  const dark = m.data.flatMap((row, j) => row.flatMap((on, i) => (on ? [`M${i} ${j}h1v1h-1z`] : [])));
  const path = svg.appendChild(document.createElementNS(SVG, "path"));
  path.setAttribute("d", dark.join(""));
  path.style.fill = "var(--k-bg)";
  if (opts.label) {
    const l = root.appendChild(document.createElement("div"));
    l.textContent = opts.label;
    Object.assign(l.style, { marginTop: "16px", textAlign: "center", font: "600 28px/1.3 var(--k-font)", color: "var(--k-fg)" });
  }
  return { show: (tl) => void tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step }) };
}
