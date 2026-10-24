const W = 1920;
const H = 1080;

export function mountStage(root: HTMLElement): { stage: HTMLElement; worlds: HTMLElement; ui: HTMLElement } {
  const stage = div("k-stage");
  const worlds = div("k-worlds");
  const ui = div("k-ui");
  stage.append(worlds, ui);
  root.append(stage);
  const fit = () => {
    // A window with no size (minimized, a background tab reloading) keeps scale 1: effects measure the stage
    // while the timeline is built, and scale 0 makes every rect 0. The resize on restore fits it.
    const s = Math.min(innerWidth / W, innerHeight / H) || 1;
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
