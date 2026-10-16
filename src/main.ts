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
const canvases = renderWorld(deck, layout.canvases, worlds);
const steps = buildStepList(deck, layout.canvases);
// Reduced motion turns plays into cuts, as the spec asks for camera flights.
const instant =
  new URLSearchParams(location.search).get("instant") === "1" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const stepper = new Stepper(steps, canvases, { instant });

window.klappe = { ...window.klappe, stepper, canvases, steps, deck, errors, problems };
showProblems(ui, problems, deck.meta.lang);
stepper.goto(0, "cut");
