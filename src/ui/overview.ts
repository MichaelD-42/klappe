import type { CanvasRuntime } from "../render/world";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button, OverlayPanel } from "./selector";

// Scene card thumbnail, in stage px.
const THUMB = { w: 288, h: 162 };

// A copy of the world at its end state, with no camera transform, so the whole canvas shows.
// shortcut: backgrounds are pinned to the screen, outside the world, so the copy has none; add them if the overview needs them.
// The live timeline is seeked to its end and back in the same tick: nothing on stage changes.
// Events on, so text that effects write from onUpdate (data-k-text) shows its end state and comes back.
function endState(c: CanvasRuntime): HTMLElement {
  const time = c.tl.time();
  c.tl.seek(c.tl.duration(), false);
  const copy = c.world.cloneNode(true) as HTMLElement;
  c.tl.seek(time, false);
  // The clone must not repeat ids of the live DOM. Shortcut: this breaks url(#id) refs inside the clone; rename them if an effect needs those.
  copy.removeAttribute("id");
  for (const e of copy.querySelectorAll("[id]")) e.removeAttribute("id");
  Object.assign(copy.style, { transform: "none", opacity: "1", visibility: "visible" });
  copy.inert = true;
  copy.setAttribute("aria-hidden", "true");
  return copy;
}

// One row per section: its title, then a card per scene showing that scene's frame of the canvas at its end state.
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
    const here = this.steps[this.current()];
    const copies = new Map<CanvasRuntime, HTMLElement>(); // one end-state copy per canvas, cloned again per card

    for (const s of this.deck.sections) {
      const c = this.canvases.find((c) => c.layout.sectionIds.includes(s.id));
      if (!c) continue;
      if (!copies.has(c)) copies.set(c, endState(c));
      const row = document.createElement("section");
      row.className = "k-ov-row";
      row.append(Object.assign(document.createElement("h3"), { className: "k-ov-caption", textContent: s.title }));
      const cards = document.createElement("div");
      cards.className = "k-ov-cards";

      for (const sc of s.scenes) {
        const first = this.steps.findIndex((a) => a.section === s.id && a.scene === sc.id);
        const r = c.layout.rects[sc.id];
        if (first < 0 || !r) continue;
        const fit = Math.min(THUMB.w / r.w, THUMB.h / r.h);
        const thumb = document.createElement("div");
        thumb.className = "k-ov-thumb";
        const scaler = document.createElement("div");
        scaler.className = "k-ov-scaler";
        // Centre the scene's rect in the card.
        const dx = (THUMB.w - r.w * fit) / 2 - r.x * fit;
        const dy = (THUMB.h - r.h * fit) / 2 - r.y * fit;
        scaler.style.transform = `translate(${dx}px, ${dy}px) scale(${fit})`;
        scaler.append(copies.get(c)!.cloneNode(true));
        thumb.append(scaler);
        const m = button("", () => this.pick(() => this.go(first)), "k-ov-marker");
        m.append(thumb, Object.assign(document.createElement("span"), { className: "k-ov-title", textContent: sc.title }));
        if (here?.section === s.id && here.scene === sc.id) m.setAttribute("aria-current", "true");
        cards.append(m);
      }
      row.append(cards);
      body.append(row);
    }
    body.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
  }
}
