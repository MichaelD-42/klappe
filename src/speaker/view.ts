import "./speaker.css";
import { keyAction } from "../input";
import { sceneSeconds } from "../plan";
import { t } from "../strings";
import type { Deck, StepAddr } from "../types";
import { button } from "../ui/panel";
import { channelName, type Channel } from "./channel";
import { rehearsal } from "./rehearsal";

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
  const main = steps.filter((s) => !s.appendix).length;

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
  const send = (cmd: "next" | "prev" | "goto" | "timer" | "appendix", i?: number) => channel.send({ t: "cmd", cmd, index: i });
  const buttons = el("div", "k-sp-buttons");
  // Disabled on a scene without a timer, where T does nothing.
  const timerButton = button(t("timer", lang), () => send("timer"));
  buttons.append(button(t("previous", lang), () => send("prev")), button(t("next", lang), () => send("next")), timerButton);

  // Rehearsal: the time per scene against the plan, kept in localStorage per deck (the channel name has the path and title)
  // and per deck cut, so the runs of a short and a long cut do not overwrite each other.
  let storage: Storage | undefined;
  try {
    storage = localStorage;
  } catch {
    // storage is blocked: rehearsal works for this session only
  }
  const cut = new URLSearchParams(location.search).get("cut");
  const rec = rehearsal(`${channelName(deck.meta.title, location.pathname)}:rehearsal${cut === null ? "" : `:cut:${cut}`}`, () => Date.now(), storage);
  const rehearseButton = button(t("rehearse", lang), () => toggleRehearsal());
  const rehearseRow = el("div", "k-sp-buttons");
  rehearseRow.append(rehearseButton, button(t("resetTimes", lang), () => (rec.reset(), showPlan())));
  const planLabel = el("h2", "k-sp-label", t("plan", lang));
  const plan = el("ul", "k-sp-plan");
  const toggleRehearsal = () => {
    rec.toggle();
    showPlan();
  };
  // A scene over its estimate shows in --k-warn, one over by half again in --k-bad.
  const row = (name: string, spent: number, planned: number, bold = false) => {
    const li = el("li", "k-sp-plan-row");
    li.dataset.over = spent > planned * 1.5 ? "bad" : spent > planned ? "warn" : "";
    if (bold) li.classList.add("k-sp-plan-total");
    li.append(el("span", "", name), el("span", "k-sp-plan-time", `${clock(spent * 1000)} / ${clock(planned * 1000)}`));
    return li;
  };
  const showPlan = () => {
    const times = rec.times();
    rehearseButton.setAttribute("aria-pressed", String(rec.on));
    rehearseButton.classList.toggle("k-on", rec.on);
    const rows = deck.sections.flatMap((s) => s.scenes.filter((c) => times[`${s.id}/${c.id}`] > 0).map((c) => row(c.title, times[`${s.id}/${c.id}`], sceneSeconds(c))));
    // The total against duration is the talk's: time in the appendix is not part of it.
    const spent = deck.sections.filter((s) => !s.appendix).flatMap((s) => s.scenes.map((c) => times[`${s.id}/${c.id}`] ?? 0)).reduce((n, s) => n + s, 0);
    const target = deck.meta.duration;
    if (rows.length && target) rows.push(row(t("total", lang), spent, target * 60, true));
    planLabel.hidden = !rows.length;
    plan.replaceChildren(...rows);
  };
  showPlan();
  side.append(el("h2", "k-sp-label", t("elapsed", lang)), time, progress, el("h2", "k-sp-label", t("upNext", lang)), next, planLabel, plan, rehearseRow, buttons);
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
    next.textContent = b && !b.appendix === !a.appendix ? (sceneOf(b)?.steps[b.step - 1]?.text ?? "") : t("endOfDeck", lang);
    // The counter counts the main talk; an appendix step counts in the appendix.
    progress.textContent = a.appendix ? `${t("appendix", lang)} ${index - main + 1} / ${steps.length - main}` : `${index + 1} / ${main}`;
    rec.enter(`${a.section}/${a.scene}`);
    showPlan();
    if (!started) {
      started = performance.now();
      setInterval(() => ((time.textContent = clock(performance.now() - started)), rec.on && showPlan()), 1000);
    }
  });

  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p" && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) return toggleRehearsal();
    const a = keyAction(e);
    if (a === "next" || a === "prev" || a === "timer" || a === "appendix") send(a);
    else if (a === "home") send("goto", 0);
    else if (a === "end") send("goto", main - 1);
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
