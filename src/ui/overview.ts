import type { CanvasRuntime } from "../render/world";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button, OverlayPanel } from "./panel";

// Scene card thumbnail, in stage px.
const THUMB = { w: 288, h: 162 };

// A copy of the world at its end state, with no camera transform, so the whole canvas shows.
// Backgrounds are pinned to the screen, outside the world: each card adds its scene's own (backdrop).
// The live timeline is seeked to its end and back in the same tick: nothing on stage changes.
// Events on, so text that effects write from onUpdate (data-k-text) shows its end state and comes back.
function endState(c: CanvasRuntime): HTMLElement {
  const time = c.tl.time();
  c.tl.seek(c.tl.duration(), false);
  const copy = c.world.cloneNode(true) as HTMLElement;
  c.tl.seek(time, false);
  // The clone must not repeat ids of the live DOM. Shortcut: this breaks url(#id) refs inside the clone; rename them if an effect needs those.
  return quiet(copy, { transform: "none" });
}

// A copy that shows, keeps no ids and takes no input.
function quiet(copy: HTMLElement, style: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  copy.removeAttribute("id");
  for (const e of copy.querySelectorAll("[id]")) e.removeAttribute("id");
  Object.assign(copy.style, { opacity: "1", visibility: "visible", ...style });
  copy.inert = true;
  copy.setAttribute("aria-hidden", "true");
  return copy;
}

// A scene's background, the full 1920x1080 screen scaled to the card. A looping video or an aurora shows
// as its still first frame (a cloned canvas is blank).
function backdrop(bg: HTMLElement): HTMLElement {
  const box = document.createElement("div");
  box.className = "k-ov-bg";
  box.append(quiet(bg.cloneNode(true) as HTMLElement, { transform: "none" }));
  box.style.transform = `scale(${THUMB.w / 1920})`;
  return box;
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
    const sectionLabel = (s: Deck["sections"][number]) => s.module?.overviewLabel ?? s.title;
    // A scene title that repeats in the deck (agenda hops all titled "Today") gets its section's label in front.
    const titles = this.deck.sections.flatMap((s) => s.scenes.map((sc) => sc.title));
    const repeated = (t: string) => titles.indexOf(t) !== titles.lastIndexOf(t);

    for (const s of this.deck.sections) {
      const c = this.canvases.find((c) => c.layout.sectionIds.includes(s.id));
      if (!c) continue;
      if (!copies.has(c)) copies.set(c, endState(c));
      const row = document.createElement("section");
      row.className = "k-ov-row";
      row.append(Object.assign(document.createElement("h3"), { className: "k-ov-caption", textContent: sectionLabel(s) }));
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
        const bg = c.backgrounds[sc.id];
        if (bg) thumb.append(backdrop(bg));
        thumb.append(scaler);
        const label = sc.module?.overviewLabel ?? (repeated(sc.title) ? `${sectionLabel(s)} · ${sc.title}` : sc.title);
        const m = button("", () => this.pick(() => this.go(first)), "k-ov-marker");
        m.append(thumb, Object.assign(document.createElement("span"), { className: "k-ov-title", textContent: label }));
        if (here?.section === s.id && here.scene === sc.id) m.setAttribute("aria-current", "true");
        cards.append(m);
      }
      row.append(cards);
      body.append(row);
    }
    body.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
  }
}
