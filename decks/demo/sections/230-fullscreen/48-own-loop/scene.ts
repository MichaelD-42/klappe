import type { SceneModule } from "klappe/types";

// A field of dots that drifts up and to the right, drawn here: animate gets the full stage and returns
// play and pause. The Web Animations API starts paused, so the loop runs only when klappe plays it.
function dots(el: HTMLElement) {
  const field = el.appendChild(document.createElement("div"));
  Object.assign(field.style, {
    position: "absolute", inset: "-120px",
    backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--k-accent) 35%, transparent) 2px, transparent 3px)",
    backgroundSize: "60px 60px",
  });
  const drift = field.animate([{ transform: "translate(0, 0)" }, { transform: "translate(60px, -60px)" }], { duration: 6000, iterations: Infinity });
  drift.pause();
  return { play: () => drift.play(), pause: () => drift.pause() };
}

const scene: SceneModule = { background: { animate: dots } };
export default scene;
