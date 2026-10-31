import { stage as size } from "../theme";

export function mountStage(root: HTMLElement): { stage: HTMLElement; worlds: HTMLElement; ui: HTMLElement } {
  const stage = div("k-stage");
  const worlds = div("k-worlds");
  const ui = div("k-ui");
  stage.append(worlds, ui);
  root.append(stage);
  const fit = () => {
    // A window with no size (minimized, a background tab reloading) keeps scale 1: effects measure the stage
    // while the timeline is built, and scale 0 makes every rect 0. The resize on restore fits it.
    const { w: W, h: H } = size;
    let s = Math.min(innerWidth / W, innerHeight / H) || 1;
    // A window a hair off the frame's shape (1366x768 is 0.7 px wide of 16:9) leaves a sub-pixel strip of the page's black
    // beside the stage, which shows against a light --k-bg: scale up to cover it, the viewport clips the overshoot.
    if (Math.max(innerWidth - W * s, innerHeight - H * s) < 1) s = Math.max(innerWidth / W, innerHeight / H) || s;
    // Centred, offset rounded to whole pixels: a fractional offset left a 1 px sliver at the edge.
    const [x, y] = [Math.round((innerWidth - W * s) / 2), Math.round((innerHeight - H * s) / 2)];
    stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  };
  fit();
  addEventListener("resize", fit);
  return { stage, worlds, ui };
}

function div(cls: string): HTMLElement {
  const el = document.createElement("div");
  el.className = cls;
  return el;
}
