const W = 1920;
const H = 1080;

export function mountStage(root: HTMLElement): { stage: HTMLElement; worlds: HTMLElement; ui: HTMLElement } {
  const stage = div("k-stage");
  const worlds = div("k-worlds");
  const ui = div("k-ui");
  stage.append(worlds, ui);
  root.append(stage);
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
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
