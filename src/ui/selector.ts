import type { Panel } from "../input";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";

export function button(label: string, onClick: () => void, cls = "k-btn"): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

// A full-stage layer with a heading and a Close button. Focus moves in on open and back on close;
// nothing is trapped. [data-no-advance] keeps clicks inside from advancing the deck.
export abstract class OverlayPanel implements Panel {
  private root: HTMLElement | null = null;
  private back: Element | null = null;

  constructor(
    private ui: HTMLElement,
    private label: string,
    protected lang: string,
  ) {}

  get isOpen(): boolean {
    return !!this.root;
  }

  open(): void {
    if (this.root) return;
    this.back = document.activeElement;
    const root = document.createElement("div");
    root.className = "k-overlay";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", this.label);
    root.dataset.noAdvance = "";
    const head = document.createElement("div");
    head.className = "k-overlay-head";
    head.append(Object.assign(document.createElement("h2"), { textContent: this.label }));
    head.append(button(t("close", this.lang), () => this.close()));
    const body = document.createElement("div");
    body.className = "k-overlay-body";
    root.append(head, body);
    this.ui.append(root);
    this.root = root;
    this.fill(body);
    (body.querySelector<HTMLElement>('[aria-current="true"]') ?? body.querySelector("button"))?.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.root) return;
    this.root.remove();
    this.root = null;
    if (this.back instanceof HTMLElement && this.back.isConnected) this.back.focus({ preventScroll: true });
  }

  protected pick(go: () => void): void {
    this.close();
    go();
  }

  protected abstract fill(body: HTMLElement): void;
}

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
      const b = button(s.title, () => this.pick(() => this.go(first)));
      if (s.id === here) b.setAttribute("aria-current", "true");
      body.append(b);
    }
    body.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
  }
}
