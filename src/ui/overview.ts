import type { CanvasRuntime } from "../render/world";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button, OverlayPanel } from "./selector";

// Grid area inside the overlay, in stage px: 1920x1080 minus padding and the heading row.
const AREA = { w: 1760, h: 840 };
const GAP = 40;
const CAPTION = 48;

// A copy of the world at its end state, with no camera transform, so the whole canvas shows.
// The live timeline is seeked to its end and back in the same tick: nothing on stage changes.
// Events on, so text that effects write from onUpdate (data-k-text) shows its end state and comes back.
function endState(c: CanvasRuntime): HTMLElement {
  const time = c.tl.time();
  c.tl.seek(c.tl.duration(), false);
  const copy = c.el.cloneNode(true) as HTMLElement;
  c.tl.seek(time, false);
  Object.assign(copy.style, { transform: "none", opacity: "1", visibility: "visible" });
  copy.inert = true;
  copy.setAttribute("aria-hidden", "true");
  return copy;
}

export class Overview extends OverlayPanel {
  constructor(
    ui: HTMLElement,
    private deck: Deck,
    private canvases: CanvasRuntime[],
    private steps: StepAddr[],
    private current: () => number,
    private go: (index: number) => void,
  ) {
    super(ui, t("overview", deck.meta.lang), deck.meta.lang);
  }

  protected fill(body: HTMLElement): void {
    body.classList.add("k-overview");
    const cols = Math.ceil(Math.sqrt(this.canvases.length));
    const rows = Math.ceil(this.canvases.length / cols);
    const cellW = (AREA.w - GAP * (cols - 1)) / cols;
    const cellH = (AREA.h - GAP * (rows - 1)) / rows - CAPTION;
    body.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
    const here = this.steps[this.current()];

    for (const c of this.canvases) {
      const { w, h } = c.layout.size;
      const fit = Math.min(cellW / w, cellH / h);
      const sections = this.deck.sections.filter((s) => c.layout.sectionIds.includes(s.id));
      const cell = document.createElement("div");
      cell.className = "k-ov-cell";
      const caption = document.createElement("div");
      caption.className = "k-ov-caption";
      caption.textContent = sections.map((s) => s.title).join(" · ");
      const thumb = document.createElement("div");
      thumb.className = "k-ov-thumb";
      Object.assign(thumb.style, { width: `${w * fit}px`, height: `${h * fit}px` });
      const scaler = document.createElement("div");
      scaler.className = "k-ov-scaler";
      scaler.style.transform = `scale(${fit})`;
      scaler.append(endState(c));
      thumb.append(scaler);

      for (const s of sections)
        for (const sc of s.scenes) {
          const first = this.steps.findIndex((a) => a.section === s.id && a.scene === sc.id);
          const r = c.layout.rects[sc.id];
          if (first < 0 || !r) continue;
          const m = button("", () => this.pick(() => this.go(first)), "k-ov-marker");
          m.append(Object.assign(document.createElement("span"), { textContent: sc.title }));
          Object.assign(m.style, { left: `${r.x * fit}px`, top: `${r.y * fit}px`, width: `${r.w * fit}px`, height: `${r.h * fit}px` });
          if (here?.section === s.id && here.scene === sc.id) m.setAttribute("aria-current", "true");
          thumb.append(m);
        }
      cell.append(caption, thumb);
      body.append(cell);
    }
  }
}
