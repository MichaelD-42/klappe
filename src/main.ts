import "./styles.css";
import { installErrorCapture } from "./errors";
import { loadDeck } from "./deck/load";
import { buildStepList, layoutDeck } from "./layout";
import { mountStage } from "./render/stage";
import { renderWorld } from "./render/world";
import { Stepper } from "./stepper";
import { showProblems } from "./ui/problems";

const errors = installErrorCapture();
const { deck, problems } = loadDeck();
const layout = layoutDeck(deck);
problems.push(...layout.problems);

const { ui, worlds } = mountStage(document.body);
const query = new URLSearchParams(location.search);
// Reduced motion only turns camera flights into cuts; ?instant=1 turns every play into a seek.
const reducedMotion = query.get("reducedmotion") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvases = renderWorld(deck, layout.canvases, worlds, { reducedMotion });
const steps = buildStepList(deck, layout.canvases);
const stepper = new Stepper(steps, canvases, { instant: query.get("instant") === "1" });

window.klappe = { ...window.klappe, stepper, canvases, steps, deck, errors, problems };
showProblems(ui, problems, deck.meta.lang);
stepper.goto(0, "cut");
