import "./speaker.css";
import { keyAction } from "../input";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button } from "../ui/selector";
import type { Channel } from "./channel";

function el(tag: string, cls: string, text = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
};

// Notes that effects put on the stage as data-k-note (for example "needs internet" on an online video).
// The stage lives in the main window: the opener of this popup, or the parent of an embedded view.
function effectNotes(scene: string): string[] {
  try {
    const main: Window | null = opener ?? (parent !== window ? parent : null);
    const sel = `[data-scene="${CSS.escape(scene)}"]`;
    const els = main?.document.querySelectorAll<HTMLElement>(`${sel}[data-k-note], ${sel} [data-k-note]`) ?? [];
    return [...els].map((e) => e.dataset.kNote || e.textContent || "").filter(Boolean);
  } catch {
    return []; // the main window is gone or on another origin
  }
}

// The presenter's window. It only shows state and sends commands; the main window decides.
export function mountSpeaker(root: HTMLElement, deck: Deck, steps: StepAddr[], channel: Channel): { readonly index: number } {
  const lang = deck.meta.lang;
  const sceneOf = (a: StepAddr) => deck.sections.find((s) => s.id === a.section)?.scenes.find((s) => s.id === a.scene);
  let index = -1;
  let started = 0;

  const view = el("main", "k-speaker");
  const now = el("section", "k-sp-now");
  const scene = el("h1", "k-sp-scene", t("waiting", lang));
  const text = el("p", "k-sp-text");
  const notes = el("div", "k-sp-notes");
  const notesLabel = el("h2", "k-sp-label", t("notes", lang));
  now.append(scene, text, notesLabel, notes);

  const side = el("aside", "k-sp-side");
  const time = el("p", "k-sp-time", clock(0));
  const progress = el("p", "k-sp-progress");
  const next = el("p", "k-sp-next");
  const send = (cmd: "next" | "prev" | "goto" | "timer", i?: number) => channel.send({ t: "cmd", cmd, index: i });
  const buttons = el("div", "k-sp-buttons");
  // Disabled on a scene without a timer, where T does nothing.
  const timerButton = button(t("timer", lang), () => send("timer"));
  buttons.append(button(t("previous", lang), () => send("prev")), button(t("next", lang), () => send("next")), timerButton);
  side.append(el("h2", "k-sp-label", t("elapsed", lang)), time, progress, el("h2", "k-sp-label", t("upNext", lang)), next, buttons);
  view.append(now, side);
  root.append(view);

  channel.on((m) => {
    if (m.t !== "state" || m.index >= steps.length) return;
    index = m.index;
    timerButton.disabled = !m.timer;
    const a = steps[index];
    const sc = sceneOf(a);
    const step = sc?.steps[a.step - 1];
    scene.textContent = sc?.title ?? "";
    text.textContent = step?.text ?? "";
    notes.textContent = [step?.notes, sc?.notes, ...effectNotes(a.scene)].filter(Boolean).join("\n\n");
    notesLabel.hidden = !notes.textContent;
    const b = steps[index + 1];
    next.textContent = b ? (sceneOf(b)?.steps[b.step - 1]?.text ?? "") : t("endOfDeck", lang);
    progress.textContent = `${index + 1} / ${steps.length}`;
    if (!started) {
      started = performance.now();
      setInterval(() => (time.textContent = clock(performance.now() - started)), 1000);
    }
  });

  addEventListener("keydown", (e) => {
    const a = keyAction(e);
    if (a === "next" || a === "prev" || a === "timer") send(a);
    else if (a === "home") send("goto", 0);
    else if (a === "end") send("goto", steps.length - 1);
    else return;
    e.preventDefault();
  });

  // Review focus 5: opened first or the main window reloaded, ask for the state.
  channel.send({ t: "hello" });
  return {
    get index() {
      return index;
    },
  };
}
