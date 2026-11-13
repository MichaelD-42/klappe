import { gsap } from "gsap";
import { t } from "../strings";
import type { Deck } from "../types";

const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
// 4:05, or 1:04:05 from an hour on.
export const mmss = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}` : `${Math.floor(s / 60)}:${two(s % 60)}`);

// The talk clock (C): a chip in klappe's UI layer with the wall clock and the talk time, blended in and out on the
// wall clock. The talk time starts at the first move off the step the deck opened on; with a duration it counts
// down, warns near the end and then counts over. It is never part of a step, so the walk and the exports skip it.
export function mountClock(ui: HTMLElement, deck: Deck, reducedMotion: boolean): { toggle(): void; started(): void } {
  const lang = deck.meta.lang;
  const total = (deck.meta.duration ?? 0) * 60; // seconds; 0: no duration, so the elapsed time
  const warnAt = Math.min(300, total / 5); // the last 5 minutes, or the last fifth of a short talk
  const hhmm = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit" }); // en: 2:32 PM, de: 14:32
  let start = 0; // Date.now() at the first step, 0 before it
  let chip: HTMLElement | undefined;
  let wall: HTMLElement;
  let talk: HTMLElement;
  let timer = 0;
  let on = false;
  const paint = () => {
    const spent = start ? (Date.now() - start) / 1000 : 0;
    wall.textContent = hhmm.format(Date.now());
    const left = total - spent;
    talk.textContent = !total ? mmss(spent) : left >= 0 ? `${mmss(Math.ceil(left))} ${t("clockLeft", lang)}` : `+${mmss(-left)} ${t("clockOver", lang)}`;
    talk.dataset.tone = total && left < 0 ? "bad" : total && left <= warnAt ? "warn" : "";
  };
  const make = () => {
    chip = ui.appendChild(document.createElement("div"));
    chip.className = "k-clock";
    chip.dataset.kIgnore = "";
    wall = chip.appendChild(document.createElement("span"));
    chip.append(" · ");
    talk = chip.appendChild(document.createElement("span"));
    talk.className = "k-clock-talk";
    gsap.set(chip, { autoAlpha: 0 });
    return chip;
  };
  return {
    toggle() {
      on = !on;
      const el = chip ?? make();
      clearInterval(timer);
      if (on) paint(), (timer = window.setInterval(paint, 1000));
      gsap.to(el, { autoAlpha: on ? 1 : 0, duration: reducedMotion ? 0 : 0.3, overwrite: true });
    },
    started() {
      if (start) return;
      start = Date.now();
      if (on) paint();
    },
  };
}
