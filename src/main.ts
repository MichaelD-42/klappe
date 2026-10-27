import "./styles.css";
// The theme fonts ship with klappe (SIL OFL): a deck looks and measures the same on every machine, offline too.
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import { Autoplay } from "./autoplay";
import { installErrorCapture } from "./errors";
import { loadDeck } from "./deck/load";
import { buildStepList, layoutDeck } from "./layout";
import { mountStage } from "./render/stage";
import { loadTransitions } from "./fx/transitions";
import { loadParts } from "./render/parts";
import { renderWorld, svgBackgrounds } from "./render/world";
import { Router } from "./router";
import { autoDelay, Stepper } from "./stepper";
import { applyTheme, loadFonts, motion } from "./theme";
import { bindInput } from "./input";
import { openChannel } from "./speaker/channel";
import { mountSpeaker } from "./speaker/view";
import { t } from "./strings";
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
document.title = deck.meta.title;

if (query.get("review") === "1") {
  applyTheme(deck, query.get("theme"));
  // The review window saves through the dev server; a built deck has no such route.
  if (import.meta.env.KLAPPE_REVIEW) {
    const { mountReview } = await import("./review/view");
    const reviewView = mountReview(document.body, deck, steps, channel);
    window.klappe = { ...window.klappe, steps, deck, errors, problems, channel, reviewView };
  } else document.body.append(Object.assign(document.createElement("p"), { className: "k-review-off", textContent: t("reviewNeedsDev", deck.meta.lang) }));
} else if (query.get("speaker") === "1") {
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
  await startDeck(svg);
}

async function startDeck(svg: Record<string, string>) {
  const { stage, ui, worlds } = mountStage(document.body);
  // Reduced motion only turns camera flights into cuts; ?instant=1 turns every play into a seek.
  // ?reducedmotion=0 overrides the system setting: a presenter laptop with animations off still plays the deck in full.
  const flag = query.get("reducedmotion");
  const reducedMotion = flag === "1" || (flag !== "0" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  problems.push(...applyTheme(deck, query.get("theme")));
  problems.push(...(await loadFonts()));
  // A problem raised after this start (a web font loads, a step plays) goes to the list and the panel too.
  let late: ((msg: string) => void) | undefined;
  const onProblem = (msg: string) => late?.(msg);
  const canvases = renderWorld(deck, layout.canvases, worlds, { reducedMotion, still: reducedMotion || query.has("selftest"), svg, onProblem });
  problems.push(...canvases.flatMap((c) => c.problems)); // from effects, through ctx.problem
  const stepper = new Stepper(steps, canvases, { instant: query.get("instant") === "1" });

  const autoplay = new Autoplay(stepper, (a) => autoDelay(a, true) ?? motion.autoHoldMs);
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
  // R: the review window, beside the deck like the speaker view. Only on the dev server, which saves its findings.
  const review = import.meta.env.KLAPPE_REVIEW
    ? {
        open() {
          const url = new URL(location.href);
          url.searchParams.set("review", "1");
          url.searchParams.delete("autoplay");
          url.searchParams.delete("selftest");
          window.open(url, `klappe-review:${deck.meta.title}`, "popup,width=900,height=900");
        },
      }
    : undefined;
  // Starts or pauses the current scene's timer; a scene without one ignores it.
  const timer = () => document.dispatchEvent(new CustomEvent("klappe:timer"));
  bindInput(stepper, { overview, selector, speaker, review, autoplay, timer }, stage, steps.length - 1);

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
  const panel = showProblems(ui, problems, deck.meta.lang);
  late = (msg) => {
    problems.push(msg);
    panel.add(msg);
  };
  const first = stepper.goto(router.start(), "cut");
  if (query.get("autoplay") === "1" && !query.get("selftest")) first.then(() => autoplay.start());
  // The self-test loads only when asked.
  if (query.get("selftest")) import("./selftest")
      .then((m) => m.runSelftestIfAsked({ stepper, canvases, steps, stage, problems, errors }))
      .catch((e) => console.error(`selftest: ${e instanceof Error ? e.message : e}`));
}
