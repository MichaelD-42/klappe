// A slow drift of light in the theme's colours: three soft glows that wander on CSS loops over --k-bg.
// The loops run on the wall clock, outside the timeline, so the root sits under data-k-ignore; they start
// paused, and the caller plays them only while the background is on screen.
// Each glow is at most 24 % of its colour, so theme text on top keeps 4.5:1 where two glows overlap.
const GLOWS = [
  { colour: "--k-accent", size: 1400, x: -200, y: -300, dx: 420, dy: 260, seconds: 31 },
  { colour: "--k-accent-2", size: 1100, x: 1100, y: 300, dx: -360, dy: -220, seconds: 37 },
  { colour: "--k-accent", size: 900, x: 500, y: 600, dx: 300, dy: -340, seconds: 43 },
];

const CSS = GLOWS.map(
  (g, i) => `@keyframes k-aurora-${i} { to { transform: translate(${g.dx}px, ${g.dy}px) scale(1.25); } }`,
).join("\n");

function addStyle() {
  if (document.getElementById("k-aurora-style")) return;
  const s = document.createElement("style");
  s.id = "k-aurora-style";
  s.textContent = CSS;
  document.head.append(s);
}

export function aurora(parent: HTMLElement): { play(): void; pause(): void } {
  addStyle();
  const root = parent.appendChild(document.createElement("div"));
  root.setAttribute("data-k-aurora", "");
  root.setAttribute("data-k-ignore", "");
  Object.assign(root.style, { position: "absolute", inset: "0", overflow: "hidden", background: "var(--k-bg)" });
  const glows = GLOWS.map((g, i) => {
    const e = root.appendChild(document.createElement("div"));
    Object.assign(e.style, {
      position: "absolute",
      left: `${g.x}px`,
      top: `${g.y}px`,
      width: `${g.size}px`,
      height: `${g.size}px`,
      background: `radial-gradient(closest-side, color-mix(in srgb, var(${g.colour}) 24%, transparent), transparent)`,
      animation: `k-aurora-${i} ${g.seconds}s ease-in-out infinite alternate`,
      animationPlayState: "paused",
      willChange: "transform",
    });
    return e;
  });
  const set = (state: string) => glows.forEach((e) => (e.style.animationPlayState = state));
  return { play: () => set("running"), pause: () => set("paused") };
}
