import type { IconNode } from "lucide";
import type { Panel } from "../input";
import { t } from "../strings";

export function button(label: string, onClick: () => void, cls = "k-btn"): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

// A button that shows a Lucide icon; its label is its accessible name and its tooltip.
export function iconButton(icon: IconNode, label: string, onClick: () => void): HTMLButtonElement {
  const b = button("", onClick, "k-btn k-btn-icon");
  b.setAttribute("aria-label", label);
  b.title = label;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }))
    svg.setAttribute(k, v);
  for (const [tag, attrs] of icon) {
    const e = svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", tag));
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  }
  b.append(svg);
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
