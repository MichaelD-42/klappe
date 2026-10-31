import "./review.css";
import { keyAction } from "../input";
import { formatHash } from "../router";
import type { Channel } from "../speaker/channel";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button } from "../ui/panel";
import { CATEGORIES, parseReview, stepsWithFindings, waitingForApproval, type Category, type Edit } from "./file";

const ROUTE = "/__klappe/review";
const SAVE_AFTER_MS = 500; // after the last key

function el(tag: string, cls: string, text = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

// The review window (?review=1, dev server only): it follows the deck like the speaker view, and saves the findings
// typed for the step shown to review.md through the dev server. One save is in flight at a time, each with the step
// and values it was taken with, so a fast typist or a step change never stores older text or the wrong step.
export function mountReview(root: HTMLElement, deck: Deck, steps: StepAddr[], channel: Channel): { readonly index: number } {
  const lang = deck.meta.lang;
  const order = steps.map(formatHash);
  const sectionOf = (a: StepAddr) => deck.sections.find((s) => s.id === a.section);
  const sceneOf = (a: StepAddr) => sectionOf(a)?.scenes.find((s) => s.id === a.scene);
  const stepText = (a: StepAddr) => sceneOf(a)?.steps[a.step - 1]?.text ?? "";
  let index = -1;
  let text = ""; // review.md as last read or written
  let path = "";

  const view = el("main", "k-review");
  const place = el("h1", "k-rv-place", t("waiting", lang));
  const said = el("p", "k-rv-text");
  const moved = el("p", "k-rv-moved");
  const fields = {} as Record<Category, HTMLTextAreaElement>;
  // A finding Claude marked fixed: read-only, with Claude's note, until the owner approves or reopens it.
  const fixed = {} as Record<Category, { box: HTMLElement; said: HTMLElement; note: HTMLInputElement; reopen: HTMLButtonElement }>;
  const form = el("div", "k-rv-fields");
  for (const k of CATEGORIES) {
    const label = el("label", "k-rv-label", t(k, lang));
    const area = document.createElement("textarea");
    area.rows = 4;
    area.dataset.kReview = k;
    label.append(area);
    const box = el("div", "k-rv-fixed");
    box.dataset.kFixed = k;
    box.hidden = true;
    const said = el("p", "k-rv-fixed-note");
    const note = document.createElement("input");
    note.placeholder = t("reopenNote", lang);
    const reopen = button(t("reopen", lang), () => act(k, { reopen: { [k]: note.value } }));
    note.addEventListener("input", () => (reopen.disabled = !note.value.trim()));
    box.append(said, button(t("approve", lang), () => act(k, { approve: [k] })), note, reopen);
    form.append(label, box);
    fields[k] = area;
    fixed[k] = { box, said, note, reopen };
  }
  const status = el("p", "k-rv-status");
  const send = (cmd: "next" | "prev" | "goto", i?: number) => channel.send({ t: "cmd", cmd, index: i });
  const buttons = el("div", "k-rv-buttons");
  buttons.append(button(t("previous", lang), () => send("prev")), button(t("next", lang), () => send("next")));
  view.append(place, said, moved, form, buttons, status);
  root.append(view);

  let refused = 0; // findings the server would not take: not in the file, so the status keeps saying so
  const showStatus = (failed = false) => {
    const lost = parseReview(text).filter((e) => !order.includes(e.hash)).length;
    status.textContent = failed
      ? t("saveFailed", lang)
      : [
          path && `${t("savedTo", lang)} ${path}`,
          `${t("stepsWithFindings", lang)}: ${stepsWithFindings(text)}`,
          waitingForApproval(text) && `${t("waitingForApproval", lang)}: ${waitingForApproval(text)}`,
          lost && `${t("notInDeck", lang)}: ${lost}`,
          refused && `${t("saveRefused", lang)}: ${refused}`,
        ]
          .filter(Boolean)
          .join(" · ");
    status.classList.toggle("k-rv-failed", failed || refused > 0);
  };

  // Saving: the categories typed in since the last save, taken with their step when the save is asked for.
  const dirty = new Set<Category>();
  // from and seq let the server keep the newest of this window's saves when they land out of order (on close).
  const from = Math.random().toString(36).slice(2);
  let seq = 0;
  const queue: (Edit & { seq: number })[] = [];
  let timer = 0;
  let flushing: Promise<void> = Promise.resolve();
  const post = (edit: Edit & { seq: number }, keepalive = false) =>
    fetch(ROUTE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...edit, order, from }), keepalive });
  const flush = (): Promise<void> =>
    (flushing = flushing.then(async () => {
      while (queue.length) {
        try {
          const r = await post(queue[0]);
          // Refused (4xx): a retry would be refused too, and would hold up every save after it.
          if (r.status >= 400 && r.status < 500) {
            queue.shift();
            refused++;
            showStatus();
            continue;
          }
          if (!r.ok) throw new Error(String(r.status));
          ({ text, path } = await r.json());
          queue.shift();
          showStatus();
        } catch {
          showStatus(true); // the edit stays queued and goes with the next save
          return;
        }
      }
    }));
  const take = (): boolean => {
    clearTimeout(timer);
    if (index < 0 || !dirty.size) return false;
    const set: Edit["set"] = {};
    for (const k of dirty) set[k] = fields[k].value;
    dirty.clear();
    queue.push({ hash: order[index], quote: stepText(steps[index]), set, seq: seq++ });
    return true;
  };
  const save = () => {
    if (take() || queue.length) void flush();
  };
  // Approve or reopen goes through the queue too, behind any text still unsent.
  const act = (k: Category, change: Pick<Edit, "approve" | "reopen">) => {
    take();
    queue.push({ hash: order[index], quote: stepText(steps[index]), set: {}, ...change, seq: seq++ });
    fixed[k].note.value = "";
    show();
    void flush().then(show);
  };
  for (const k of CATEGORIES) {
    fields[k].addEventListener("input", () => {
      dirty.add(k);
      clearTimeout(timer);
      timer = window.setTimeout(save, SAVE_AFTER_MS);
    });
    fields[k].addEventListener("blur", save);
  }
  // A reload or close cannot wait for the queue: what is left goes out with keepalive.
  addEventListener("pagehide", () => {
    take();
    for (const e of queue) void post(e, true);
  });

  // Showing: the step's findings from the file, or from a save still queued, except in a field with unsent text. Not "the focused field":
  // a window that loses focus keeps its focused field, and typing there would replace the next step's finding.
  const show = () => {
    if (index < 0) return;
    const a = steps[index];
    const scene = sceneOf(a);
    place.textContent = [sectionOf(a)?.title, scene?.title, `${a.step} / ${scene?.steps.length ?? "?"}`, order[index], `${index + 1} / ${steps.length}`]
      .filter(Boolean)
      .join(" · ");
    said.textContent = stepText(a);
    const entry = parseReview(text).find((e) => e.hash === order[index]);
    // A queued save is newer than the file: its latest value for the category shows.
    const queued = (k: Category) => [...queue].reverse().find((e) => e.hash === order[index] && k in e.set)?.set[k];
    // An approve or reopen still queued: the finding shows as it will be once saved.
    const acted = (k: Category) => [...queue].reverse().find((e) => e.hash === order[index] && (e.approve?.includes(k) || (e.reopen && k in e.reopen)));
    for (const k of CATEGORIES) {
      const a = acted(k);
      if (!dirty.has(k)) fields[k].value = a?.approve ? "" : (queued(k) ?? entry?.findings[k] ?? "");
      const note = a ? undefined : entry?.fixed?.[k];
      fields[k].readOnly = note !== undefined;
      fixed[k].box.hidden = note === undefined;
      fixed[k].said.textContent = `${t("fixed", lang)}: ${note ?? ""}`;
      if (note === undefined) fixed[k].note.value = "";
      fixed[k].reopen.disabled = !fixed[k].note.value.trim();
    }
    const written = entry?.quote && entry.quote !== stepText(a) ? entry.quote : "";
    moved.textContent = written && `${t("writtenFor", lang)}: “${written}”`;
    moved.hidden = !written;
  };
  // Reads can land out of order: only the latest one asked for is shown, or an old file would replace a newer one.
  let reads = 0;
  const load = async () => {
    const n = ++reads;
    await flushing;
    try {
      const r = await fetch(ROUTE);
      if (!r.ok) throw new Error(String(r.status));
      const got = await r.json();
      if (n !== reads) return;
      ({ text, path } = got);
      showStatus();
    } catch {
      if (n !== reads) return;
      showStatus(true);
    }
    show();
  };

  // A Move line from the deck window's edit mode: over the line for the same element and start, else added.
  channel.on((m) => {
    if (m.t !== "edit" || m.index !== index) return;
    const f = fields.visuals;
    if (f.readOnly) return; // a fixed finding waits for approval
    const lines = f.value ? f.value.split("\n") : [];
    const at = lines.findIndex((l) => l.startsWith(m.key));
    if (at >= 0) lines[at] = m.line;
    else lines.push(m.line);
    f.value = lines.join("\n");
    f.dispatchEvent(new Event("input"));
  });
  channel.on((m) => {
    if (m.t !== "state" || m.index >= steps.length || m.index === index) return;
    take(); // the findings typed so far belong to the step being left
    void flush();
    index = m.index;
    for (const k of CATEGORIES) fields[k].value = ""; // until the file is read
    show();
    void load();
  });
  addEventListener("focus", () => void load());
  addEventListener("blur", save);
  // Keys in a field type; elsewhere they step the deck, as in the speaker view.
  addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    const a = keyAction(e);
    if (a === "next" || a === "prev") send(a);
    else if (a === "home") send("goto", 0);
    else if (a === "end") send("goto", steps.filter((s) => !s.appendix).length - 1);
    else return;
    e.preventDefault();
  });

  channel.send({ t: "hello" });
  void load();
  return {
    get index() {
      return index;
    },
  };
}
