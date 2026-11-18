import type { Stepper } from "./stepper";
import type { StepAddr } from "./types";
import type { InkMode } from "./ink";

export type Action = "next" | "prev" | "home" | "end" | "appendix" | "overview" | "selector" | "builder" | "speaker" | "review" | "autoplay" | "timer" | "clock" | "laser" | "pen" | "mute" | "close";

const KEYS: Record<string, Action> = {
  ArrowRight: "next",
  " ": "next",
  PageDown: "next",
  Enter: "next",
  ArrowLeft: "prev",
  PageUp: "prev",
  Home: "home",
  End: "end",
  q: "appendix", // Q&A: to the appendix and back
  o: "overview",
  s: "selector",
  b: "builder", // the deck builder, dev server only
  n: "speaker",
  r: "review",
  a: "autoplay",
  t: "timer",
  c: "clock", // the talk clock over the stage
  l: "laser", // presenter ink: a laser dot on the mouse
  d: "pen", // presenter ink: draw with the mouse
  m: "mute", // the deck's sound
  Escape: "close",
};

// Shared with the speaker view. Enter and Space on a focused button stay a button press.
export function keyAction(e: KeyboardEvent): Action | null {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return null;
  const action = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key] ?? null;
  if (e.target instanceof HTMLInputElement && e.target.type === "text") return null; // typing a name, as in the deck builder
  const onButton = e.target instanceof Element && e.target.closest("button, [data-no-advance] *");
  if (action === "next" && (e.key === "Enter" || e.key === " ") && onButton) return null;
  return action;
}

export interface Panel {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
}

export function bindInput(
  stepper: Stepper,
  ui: {
    overview: Panel;
    selector: Panel;
    builder?: Panel;
    speaker?: { open(): void };
    review?: { open(): void };
    autoplay?: { stop(): void; toggle(): void };
    timer?: () => void;
    clock?: () => void;
    ink?: { readonly mode: InkMode; set(mode: InkMode): void };
    mute?: () => void;
  },
  stage: HTMLElement,
  steps: StepAddr[],
): (a: Action) => void {
  const main = steps.filter((s) => !s.appendix).length; // the appendix steps come after every main step
  let back = 0; // the last main step, whichever way the appendix was reached
  stepper.on("step", (a: StepAddr) => {
    if (!a.appendix) back = a.index;
  });
  const panels = [ui.overview, ui.selector, ...(ui.builder ? [ui.builder] : [])];
  const toggle = (p: Panel) => {
    for (const o of panels) if (o !== p) o.close();
    if (p.isOpen) p.close();
    else p.open();
  };
  const run = (a: Action) => {
    const nav = a === "next" || a === "prev" || a === "home" || a === "end" || a === "appendix";
    if (nav && panels.some((p) => p.isOpen)) return; // steps don't move under an open panel
    if (a !== "autoplay" && a !== "timer" && a !== "clock" && a !== "laser" && a !== "pen" && a !== "mute") ui.autoplay?.stop(); // the timer, clock, ink and mute are not steps: autoplay goes on
    if (a === "overview" || a === "selector" || a === "builder") stepper.cancelAuto(); // no step moves under a panel
    if (a === "next") stepper.next();
    else if (a === "prev") stepper.prev();
    else if (a === "home") stepper.goto(0, "cut");
    else if (a === "end") stepper.goto(main - 1, "cut");
    else if (a === "appendix") {
      if (steps[stepper.index]?.appendix) stepper.goto(back, "cut");
      else if (main < steps.length) {
        stepper.goto(main, "cut");
      }
    }
    else if (a === "overview") toggle(ui.overview);
    else if (a === "selector") toggle(ui.selector);
    else if (a === "builder") ui.builder && toggle(ui.builder);
    else if (a === "speaker") ui.speaker?.open();
    else if (a === "review") ui.review?.open();
    else if (a === "autoplay") ui.autoplay?.toggle();
    else if (a === "timer") ui.timer?.();
    else if (a === "clock") ui.clock?.();
    else if (a === "laser" || a === "pen") ui.ink?.set(ui.ink.mode === a ? null : a);
    else if (a === "mute") ui.mute?.();
    else if (ui.ink?.mode) ui.ink.set(null); // Esc: ink off first
    else for (const p of panels) p.close();
  };
  addEventListener("keydown", (e) => {
    const a = keyAction(e);
    if (!a) return;
    e.preventDefault();
    run(a);
  });
  // A click into an embedded player moves focus into its iframe, and its keys never reach us: take focus back.
  addEventListener("blur", () => {
    if (document.activeElement instanceof HTMLIFrameElement && stage.contains(document.activeElement)) setTimeout(() => window.focus(), 0);
  });
  stage.addEventListener("click", (e) => {
    if (ui.ink?.mode || (e.target instanceof Element && e.target.closest("[data-no-advance]"))) return; // a click with ink on draws
    run("next");
  });
  return run;
}
