import "./styles.css";
import { Autoplay } from "./autoplay";
import { installErrorCapture } from "./errors";
import { loadDeck } from "./deck/load";
import { buildStepList, layoutDeck } from "./layout";
import { mountStage } from "./render/stage";
import { renderWorld } from "./render/world";
import { runSelftestIfAsked } from "./selftest";
import { Router } from "./router";
import { Stepper } from "./stepper";
import { motion } from "./theme";
import { bindInput } from "./input";
import { openChannel } from "./speaker/channel";
import { mountSpeaker } from "./speaker/view";
import { Overview } from "./ui/overview";
import { showProblems } from "./ui/problems";
import { Selector } from "./ui/selector";
import type { StepAddr } from "./types";

const errors = installErrorCapture();
const { deck, problems } = loadDeck();
const layout = layoutDeck(deck);
problems.push(...layout.problems);
const steps = buildStepList(deck, layout.canvases);
const query = new URLSearchParams(location.search);
const channel = openChannel(deck.meta.title);

if (query.get("speaker") === "1") {
  const speakerView = mountSpeaker(document.body, deck, steps, channel);
  window.klappe = { ...window.klappe, steps, deck, errors, problems, channel, speakerView };
} else startDeck();

function startDeck() {
  const { stage, ui, worlds } = mountStage(document.body);
  // Reduced motion only turns camera flights into cuts; ?instant=1 turns every play into a seek.
  const reducedMotion = query.get("reducedmotion") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvases = renderWorld(deck, layout.canvases, worlds, { reducedMotion });
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
  const speaker = {
    open() {
      const url = new URL(location.href);
      url.searchParams.set("speaker", "1");
      url.searchParams.delete("autoplay");
      url.searchParams.delete("selftest");
      window.open(url, `klappe-speaker:${deck.meta.title}`, "popup,width=1280,height=800");
    },
  };
  bindInput(stepper, { overview, selector, speaker, autoplay }, stage, steps.length - 1);

  // The main window is authoritative: it reports every step and runs the speaker's commands.
  stepper.on("step", (a: StepAddr) => channel.send({ t: "state", index: a.index }));
  channel.on((m) => {
    if (m.t === "hello" && stepper.index >= 0) channel.send({ t: "state", index: stepper.index });
    if (m.t !== "cmd") return;
    autoplay.stop();
    if (m.cmd === "next") stepper.next();
    else if (m.cmd === "prev") stepper.prev();
    else if (m.index! < steps.length) go(m.index!);
  });

  window.klappe = { ...window.klappe, stepper, canvases, steps, deck, errors, problems, selector, overview, speaker, channel, autoplay, router };
  showProblems(ui, problems, deck.meta.lang);
  const first = stepper.goto(router.start(), "cut");
  if (query.get("autoplay") === "1" && !query.get("selftest")) first.then(() => autoplay.start());
  runSelftestIfAsked({ stepper, canvases, steps, stage, problems, errors });
}
