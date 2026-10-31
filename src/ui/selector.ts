import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button, OverlayPanel } from "./panel";

export class Selector extends OverlayPanel {
  constructor(
    ui: HTMLElement,
    private deck: Deck,
    private steps: StepAddr[],
    private current: () => number,
    private go: (index: number) => void,
  ) {
    super(ui, t("sections", deck.meta.lang), deck.meta.lang);
  }

  protected fill(body: HTMLElement): void {
    body.classList.add("k-selector");
    const here = this.steps[this.current()]?.section;
    for (const s of this.deck.sections) {
      const first = this.steps.findIndex((a) => a.section === s.id);
      if (first < 0) continue; // a section without steps has nowhere to go
      const b = button(s.appendix ? `${t("appendix", this.deck.meta.lang)} · ${s.title}` : s.title, () => this.pick(() => this.go(first)));
      if (s.id === here) b.setAttribute("aria-current", "true");
      body.append(b);
    }
    body.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
  }
}
