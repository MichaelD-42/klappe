import { t } from "../strings";
import type { Deck } from "../types";
import type { IconNode } from "lucide";
import { iconButton, OverlayPanel } from "./panel";

// Lucide icons (ISC), inline: importing "lucide" would pull every icon in dev.
const PLAY: IconNode = [["path", { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" }]]; // play
const SAVE: IconNode = [
  ["path", { d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7" }],
]; // save
const UP: IconNode = [["path", { d: "m5 12 7-7 7 7" }], ["path", { d: "M12 19V5" }]]; // arrow-up
const DOWN: IconNode = [["path", { d: "M12 5v14" }], ["path", { d: "m19 12-7 7-7-7" }]]; // arrow-down

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

  // A saved cut, or null for the whole talk with everything selected.
  private load(name: string | null): void {
    const cut = name === null ? undefined : this.deck.meta.cuts?.[name];
    const ids = this.talk.map((s) => s.id);
    const kept = cut ? cut.sections.filter((id) => ids.includes(id)) : ids;
    this.order = [...kept, ...ids.filter((id) => !kept.includes(id))];
    this.on = new Set(kept);
    // A section the cut leaves out shows its scenes off too; saving writes only the skips inside kept sections.
    this.skip = new Set([...(cut?.skip ?? []), ...ids.filter((id) => !kept.includes(id)).flatMap((id) => this.scenesOf(id))]);
    this.name = name ?? "";
    this.loaded = name;
  }

  protected fill(body: HTMLElement): void {
    body.classList.add("k-builder");
    this.body = body;
    this.render();
  }

  private scenesOf(id: string): string[] {
    return this.talk.find((s) => s.id === id)!.scenes.map((c) => `${id}/${c.id}`);
  }

  // Sections and scenes check as a tree: a section on or off takes all its scenes with it, the last scene off takes its
  // section off, and a scene on puts its section back.
  private setSection(id: string, v: boolean): void {
    if (v) this.on.add(id);
    else this.on.delete(id);
    for (const k of this.scenesOf(id)) v ? this.skip.delete(k) : this.skip.add(k);
  }

  private setScene(id: string, key: string, v: boolean): void {
    if (v) this.skip.delete(key);
    else this.skip.add(key);
    if (v) this.on.add(id);
    else if (this.scenesOf(id).every((k) => this.skip.has(k))) this.on.delete(id);
  }

  // Drawn anew on every change; focus goes back to the control that made it.
  private render(focus?: string): void {
    const body = this.body!;
    const lang = this.lang;
    // On top: pick a saved cut (it loads into the list) and play it as saved; or name the list and save it, which plays it.
    const bar = document.createElement("div");
    bar.className = "k-builder-bar";
    const names = Object.keys(this.deck.meta.cuts ?? {});
    const pick = document.createElement("select");
    pick.setAttribute("aria-label", t("savedCuts", lang));
    pick.dataset.focus = "pick";
    pick.disabled = !names.length;
    pick.append(new Option(t(names.length ? "pickCut" : "noCuts", lang), "", false, this.loaded === null), ...names.map((n) => new Option(n, n, false, n === this.loaded)));
    pick.addEventListener("change", () => (this.load(pick.value || null), this.render("pick")));
    const play = iconButton(PLAY, t("play", lang), () => {
      const url = new URL(location.href);
      url.searchParams.set("cut", pick.value);
      url.hash = "";
      location.assign(url);
    });
    play.disabled = !this.loaded;
    const label = document.createElement("label");
    const input = Object.assign(document.createElement("input"), { type: "text", value: this.name, spellcheck: false });
    input.addEventListener("input", () => (this.name = input.value));
    label.append(t("cutName", lang), input);
    const status = document.createElement("p");
    status.className = "k-builder-status";
    status.setAttribute("role", "status");
    bar.append(pick, play, label, iconButton(SAVE, t("saveAndPlay", lang), () => void this.save(status)));
    // Select all: checked when every section and scene is, mixed when some are.
    const ids = this.order;
    const full = ids.every((id) => this.on.has(id)) && !this.skip.size;
    const none = !this.on.size;
    const all = this.check(t("selectAll", lang), full, (v) => {
      for (const id of ids) this.setSection(id, v);
      this.render("all");
    });
    all.className = "k-builder-all";
    Object.assign(all.querySelector("input")!, { indeterminate: !full && !none });
    all.querySelector("input")!.dataset.focus = "all";
    const list = document.createElement("div");
    list.className = "k-builder-list";
    for (const [i, id] of ids.entries()) {
      const s = this.talk.find((x) => x.id === id)!;
      const row = document.createElement("div");
      row.className = "k-builder-section";
      const box = this.check(s.title, this.on.has(id), (v) => (this.setSection(id, v), this.render(`s:${id}`)));
      Object.assign(box.querySelector("input")!.dataset, { section: id, focus: `s:${id}` });
      const move = (d: -1 | 1) => {
        const b = iconButton(d < 0 ? UP : DOWN, `${t(d < 0 ? "moveUp" : "moveDown", lang)}: ${s.title}`, () => {
          [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
          this.render(b.dataset.focus);
        });
        b.dataset.focus = `${d}:${id}`;
        b.disabled = !ids[i + d];
        return b;
      };
      const scenes = document.createElement("div");
      scenes.className = "k-builder-scenes";
      for (const c of s.scenes) {
        const key = `${id}/${c.id}`;
        const sc = this.check(c.title, !this.skip.has(key), (v) => (this.setScene(id, key, v), this.render(`c:${key}`)));
        sc.querySelector("input")!.dataset.focus = `c:${key}`;
        scenes.append(sc);
      }
      row.append(box, move(-1), move(1), scenes);
      list.append(row);
    }
    body.replaceChildren(bar, status, all, list);
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
