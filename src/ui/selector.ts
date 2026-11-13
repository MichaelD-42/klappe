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
    // A deck with translations (lang/<code>.md): each language, by its own name, above the sections. Picking one reloads the deck in it
    // at the same step: the language is set before the deck builds, never swapped on a running timeline.
    const { languages = [], source, lang } = this.deck.meta;
    if (languages.length > 1) {
      const row = document.createElement("div");
      body.prepend(row); // on top: a long deck's section list scrolls
      row.className = "k-selector-langs";
      for (const code of languages) {
        const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
        const b = button(name.charAt(0).toLocaleUpperCase(code) + name.slice(1), () => {
          const url = new URL(location.href);
          if (code === source) url.searchParams.delete("lang");
          else url.searchParams.set("lang", code);
          location.assign(url);
        });
        b.lang = code;
        if (code === lang) b.setAttribute("aria-pressed", "true");
        row.append(b);
      }
    }
    body.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
  }
}
