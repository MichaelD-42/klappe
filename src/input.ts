import type { Stepper } from "./stepper";

export type Action = "next" | "prev" | "home" | "end" | "overview" | "selector" | "speaker" | "autoplay" | "timer" | "close";

const KEYS: Record<string, Action> = {
  ArrowRight: "next",
  " ": "next",
  PageDown: "next",
  Enter: "next",
  ArrowLeft: "prev",
  PageUp: "prev",
  Home: "home",
  End: "end",
  o: "overview",
  s: "selector",
  n: "speaker",
  a: "autoplay",
  t: "timer",
  Escape: "close",
};

// Shared with the speaker view. Enter and Space on a focused button stay a button press.
export function keyAction(e: KeyboardEvent): Action | null {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return null;
  const action = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key] ?? null;
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
  ui: { overview: Panel; selector: Panel; speaker?: { open(): void }; autoplay?: { stop(): void; toggle(): void }; timer?: () => void },
  stage: HTMLElement,
  lastIndex: number,
): void {
  const toggle = (p: Panel, other: Panel) => {
    other.close();
    if (p.isOpen) p.close();
    else p.open();
  };
  const run = (a: Action) => {
    const nav = a === "next" || a === "prev" || a === "home" || a === "end";
    if (nav && (ui.overview.isOpen || ui.selector.isOpen)) return; // steps don't move under an open panel
    if (a !== "autoplay" && a !== "timer") ui.autoplay?.stop(); // the timer is not a step: autoplay goes on
    if (a === "overview" || a === "selector") stepper.cancelAuto(); // no step moves under a panel
    if (a === "next") stepper.next();
    else if (a === "prev") stepper.prev();
    else if (a === "home") stepper.goto(0, "cut");
    else if (a === "end") stepper.goto(lastIndex, "cut");
    else if (a === "overview") toggle(ui.overview, ui.selector);
    else if (a === "selector") toggle(ui.selector, ui.overview);
    else if (a === "speaker") ui.speaker?.open();
    else if (a === "autoplay") ui.autoplay?.toggle();
    else if (a === "timer") ui.timer?.();
    else if (ui.overview.isOpen) ui.overview.close();
    else ui.selector.close();
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
    if (e.target instanceof Element && e.target.closest("[data-no-advance]")) return;
    run("next");
  });
}
