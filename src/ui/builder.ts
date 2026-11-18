import { t } from "../strings";
import type { Deck } from "../types";
import { button, OverlayPanel } from "./panel";

// B on the dev server: puts a cut together from the whole deck. Sections on or off and in play order, scenes on or off;
// saved by name into deck.md cuts, then played. The appendix is in every cut, so it is not listed.
export class Builder extends OverlayPanel {
  private order: string[] = [];
  private on = new Set<string>();
  private skip = new Set<string>();
  private name = "";
  private loaded: string | null = null;
  private body?: HTMLElement;

  constructor(
    ui: HTMLElement,
    private deck: Deck, // the whole deck, not the cut that plays
    active: string | null,
  ) {
    super(ui, t("deckBuilder", deck.meta.lang), deck.meta.lang);
    this.load(active && deck.meta.cuts?.[active] ? active : null);
  }

  private get talk() {
    return this.deck.sections.filter((s) => !s.appendix);
  }

  private load(name: string | null): void {
    const cut = name === null ? undefined : this.deck.meta.cuts?.[name];
    const ids = this.talk.map((s) => s.id);
    const kept = cut ? cut.sections.filter((id) => ids.includes(id)) : ids;
    this.order = [...kept, ...ids.filter((id) => !kept.includes(id))];
    this.on = new Set(kept);
    this.skip = new Set(cut?.skip);
    this.name = name ?? "";
    this.loaded = name;
  }

  protected fill(body: HTMLElement): void {
    body.classList.add("k-builder");
    this.body = body;
    this.render();
  }

  // Drawn anew on every change; focus goes back to the control that made it.
  private render(focus?: string): void {
    const body = this.body!;
    const lang = this.lang;
    const cuts = document.createElement("div");
    cuts.className = "k-selector-langs k-builder-cuts"; // the row of the section list's languages
    for (const name of [null, ...Object.keys(this.deck.meta.cuts ?? {})]) {
      const b = button(name ?? t("wholeDeck", lang), () => (this.load(name), this.render()));
      if (name === this.loaded) b.setAttribute("aria-pressed", "true");
      cuts.append(b);
    }
    const list = document.createElement("div");
    list.className = "k-builder-list";
    for (const [i, id] of this.order.entries()) {
      const s = this.talk.find((x) => x.id === id)!;
      const row = document.createElement("div");
      row.className = "k-builder-section";
      const box = this.check(s.title, this.on.has(id), (v) => (v ? this.on.add(id) : this.on.delete(id)));
      box.querySelector("input")!.dataset.section = id;
      const move = (d: -1 | 1) => {
        const b = button(d < 0 ? "↑" : "↓", () => {
          [this.order[i], this.order[i + d]] = [this.order[i + d], this.order[i]];
          this.render(b.dataset.focus);
        });
        b.dataset.focus = `${d}:${id}`;
        b.setAttribute("aria-label", `${t(d < 0 ? "moveUp" : "moveDown", lang)}: ${s.title}`);
        b.disabled = !this.order[i + d];
        return b;
      };
      const scenes = document.createElement("div");
      scenes.className = "k-builder-scenes";
      for (const c of s.scenes) {
        const key = `${id}/${c.id}`;
        scenes.append(this.check(c.title, !this.skip.has(key), (v) => (v ? this.skip.delete(key) : this.skip.add(key))));
      }
      row.append(box, move(-1), move(1), scenes);
      list.append(row);
    }
    const save = document.createElement("div");
    save.className = "k-builder-save";
    const label = document.createElement("label");
    const input = Object.assign(document.createElement("input"), { type: "text", value: this.name, spellcheck: false });
    input.addEventListener("input", () => (this.name = input.value));
    label.append(t("cutName", lang), input);
    const status = document.createElement("p");
    status.className = "k-builder-status";
    status.setAttribute("role", "status");
    save.append(label, button(t("saveAndPlay", lang), () => void this.save(status)), status);
    body.replaceChildren(cuts, list, save);
    if (focus) body.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]:not(:disabled)`)?.focus();
  }

  private check(text: string, checked: boolean, set: (v: boolean) => void): HTMLLabelElement {
    const label = document.createElement("label");
    const input = Object.assign(document.createElement("input"), { type: "checkbox", checked });
    input.addEventListener("change", () => set(input.checked));
    label.append(input, text);
    return label;
  }

  // The URL is set to the cut first: saving deck.md reloads the page, and that reload must land in the new cut.
  private async save(status: HTMLElement): Promise<void> {
    const sections = this.order.filter((id) => this.on.has(id));
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(this.name) || !sections.length) {
      status.textContent = t("cutNeeds", this.lang);
      return;
    }
    const skip = [...this.skip].filter((k) => sections.includes(k.split("/")[0]));
    const before = location.href;
    const url = new URL(before);
    url.searchParams.set("cut", this.name);
    url.hash = "";
    history.replaceState(null, "", url);
    const res = await fetch("/__klappe/cut", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: this.name, sections, skip }) }).catch(() => null);
    if (res?.ok) return location.reload();
    history.replaceState(null, "", before);
    status.textContent = `${t("notSaved", this.lang)}: ${(await res?.json().catch(() => null))?.error ?? res?.status ?? "no dev server"}`;
  }
}
