import "./styles.css";
import { installErrorCapture } from "./errors";
import { loadDeck } from "./deck/load";
import { buildStepList, layoutDeck } from "./layout";
import { mountStage } from "./render/stage";
import { renderWorld } from "./render/world";
import { runSelftestIfAsked } from "./selftest";
import { Stepper } from "./stepper";
import { bindInput } from "./input";
import { Overview } from "./ui/overview";
import { showProblems } from "./ui/problems";
import { Selector } from "./ui/selector";

const errors = installErrorCapture();
const { deck, problems } = loadDeck();
const layout = layoutDeck(deck);
problems.push(...layout.problems);

const { stage, ui, worlds } = mountStage(document.body);
const query = new URLSearchParams(location.search);
// Reduced motion only turns camera flights into cuts; ?instant=1 turns every play into a seek.
const reducedMotion = query.get("reducedmotion") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvases = renderWorld(deck, layout.canvases, worlds, { reducedMotion });
const steps = buildStepList(deck, layout.canvases);
const stepper = new Stepper(steps, canvases, { instant: query.get("instant") === "1" });

const go = (i: number) => stepper.goto(i, "cut");
const selector = new Selector(ui, deck, steps, () => stepper.index, go);
const overview = new Overview(ui, deck, canvases, steps, () => stepper.index, go);
bindInput(stepper, { overview, selector }, stage, steps.length - 1);

window.klappe = { ...window.klappe, stepper, canvases, steps, deck, errors, problems, selector, overview };
showProblems(ui, problems, deck.meta.lang);
stepper.goto(0, "cut");
runSelftestIfAsked({ stepper, canvases, steps, stage, problems, errors });
