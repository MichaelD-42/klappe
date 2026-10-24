import "./styles.css";
import { Autoplay } from "./autoplay";
import { installErrorCapture } from "./errors";
import { loadDeck } from "./deck/load";
import { buildStepList, layoutDeck } from "./layout";
import { mountStage } from "./render/stage";
import { loadTransitions } from "./fx/transitions";
import { loadParts } from "./render/parts";
import { renderWorld, svgBackgrounds } from "./render/world";
import { Router } from "./router";
import { Stepper } from "./stepper";
import { applyTheme, motion } from "./theme";
import { bindInput } from "./input";
import { openChannel } from "./speaker/channel";
import { mountSpeaker } from "./speaker/view";
import { Overview } from "./ui/overview";
import { showProblems } from "./ui/problems";
import { Selector } from "./ui/selector";
import type { StepAddr } from "./types";

const errors = installErrorCapture();
const { deck, problems } = await loadDeck();
const layout = layoutDeck(deck);
problems.push(...layout.problems);
const steps = buildStepList(deck, layout.canvases);
if (!steps.length) problems.push("deck has no steps");
const query = new URLSearchParams(location.search);
const channel = openChannel(deck.meta.title);

if (query.get("speaker") === "1") {
  applyTheme(deck, query.get("theme")); // tokens only; the speaker page shows no problems
  const speakerView = mountSpeaker(document.body, deck, steps, channel);
  window.klappe = { ...window.klappe, steps, deck, errors, problems, channel, speakerView };
} else {
  // Effects build synchronously at load: the ones the deck may not use load first (Markdown parts, Shiki,
  // transitions), and the text of animated background SVG files.
  const [, , svg] = await Promise.all([
    loadParts(deck, query.has("fixture")),
    loadTransitions(deck.sections.flatMap((s) => (s.module?.transition ? [s.module.transition] : []))),
    svgBackgrounds(deck),
  ]);
  startDeck(svg);
}

function startDeck(svg: Record<string, string>) {
  const { stage, ui, worlds } = mountStage(document.body);
  // Reduced motion only turns camera flights into cuts; ?instant=1 turns every play into a seek.
  // ?reducedmotion=0 overrides the system setting: a presenter laptop with animations off still plays the deck in full.
  const flag = query.get("reducedmotion");
  const reducedMotion = flag === "1" || (flag !== "0" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  problems.push(...applyTheme(deck, query.get("theme")));
  const canvases = renderWorld(deck, layout.canvases, worlds, { reducedMotion, still: reducedMotion || query.has("selftest"), svg });
  problems.push(...canvases.flatMap((c) => c.problems)); // from effects, through ctx.problem
  const stepper = new Stepper(steps, canvases, { instant: query.get("instant") === "1" });

  const autoplay = new Autoplay(stepper, () => motion.autoHoldMs);
  // Every manual jump (selector, overview, speaker, history) stops auto-play.
  const go = (i: number) => {
    autoplay.stop();
    return stepper.goto(i, "cut");
  };
  const router = new Router(steps, go);
  stepper.on("step", (a: StepAddr) => router.push(a.index));
  const selector = new Selector(ui, deck, steps, () => stepper.index, go);
  const overview = new Overview(ui, deck, canvases, steps, () => stepper.index, go);
  // The speaker view, history and autoplay move the stage without a key: a panel must not stay open over it.
  stepper.on("step", () => (overview.close(), selector.close()));
  const speaker = {
    open() {
      const url = new URL(location.href);
      url.searchParams.set("speaker", "1");
      url.searchParams.delete("autoplay");
      url.searchParams.delete("selftest");
      window.open(url, `klappe-speaker:${deck.meta.title}`, "popup,width=1280,height=800");
    },
  };
  // Starts or pauses the current scene's timer; a scene without one ignores it.
  const timer = () => document.dispatchEvent(new CustomEvent("klappe:timer"));
  bindInput(stepper, { overview, selector, speaker, autoplay, timer }, stage, steps.length - 1);

  // The main window is authoritative: it reports every step and runs the speaker's commands.
  const state = (i: number) =>
    channel.send({ t: "state", index: i, timer: !!document.querySelector(`[data-scene="${CSS.escape(steps[i].scene)}"] [data-k-timer]`) });
  stepper.on("step", (a: StepAddr) => state(a.index));
  channel.on((m) => {
    if (m.t === "hello" && stepper.index >= 0) state(stepper.index);
    if (m.t !== "cmd") return;
    if (m.cmd === "timer") return timer();
    autoplay.stop();
    if (m.cmd === "next") stepper.next();
    else if (m.cmd === "prev") stepper.prev();
    else if (m.index! < steps.length) go(m.index!);
  });

  window.klappe = { ...window.klappe, stepper, canvases, steps, deck, errors, problems, selector, overview, speaker, channel, autoplay, router };
  showProblems(ui, problems, deck.meta.lang);
  const first = stepper.goto(router.start(), "cut");
  if (query.get("autoplay") === "1" && !query.get("selftest")) first.then(() => autoplay.start());
  // The self-test loads only when asked.
  if (query.get("selftest")) import("./selftest")
      .then((m) => m.runSelftestIfAsked({ stepper, canvases, steps, stage, problems, errors }))
      .catch((e) => console.error(`selftest: ${e instanceof Error ? e.message : e}`));
}
