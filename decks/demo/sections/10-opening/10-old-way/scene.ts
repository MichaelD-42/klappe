import { gsap } from "gsap";
import { crt, type CrtHandle, type CrtLine } from "klappe/fx";
import type { SceneModule } from "klappe/types";

// The classic title slide from the spike (docs/superpowers/spikes/opening), in theme tokens.
const CSS = `
.k-oldway-slide { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: var(--k-font); color: var(--k-fg);
  background: radial-gradient(900px 520px at 50% 46%, color-mix(in srgb, var(--k-accent) 18%, transparent), transparent 70%),
    linear-gradient(140deg, color-mix(in srgb, var(--k-accent) 22%, var(--k-bg)), color-mix(in srgb, var(--k-bg) 55%, var(--k-scrim))); } /* deeper, away from the text: darker in a dark theme, lighter in a light one */
.k-oldway-slide svg { width: 170px; height: 170px; margin-bottom: 48px; }
.k-oldway-slide h1 { margin: 0; font-size: 112px; font-weight: 700; letter-spacing: -1px; line-height: 1.1; }
.k-oldway-rule { width: 160px; height: 6px; background: var(--k-accent); margin: 44px 0 36px; }
.k-oldway-slide .k-oldway-sub { margin: 0; max-width: none; line-height: 1.35; font-size: 46px; font-weight: 400; color: color-mix(in srgb, var(--k-fg) 70%, var(--k-bg)); }
.k-oldway-foot { position: absolute; left: 120px; right: 120px; bottom: 70px; display: flex; justify-content: space-between;
  font-size: 26px; color: var(--k-muted); }
`;

// A placeholder logo mark: a hexagon with a chevron.
// TODO: replace with the organisation's logo (an inline SVG in theme tokens, or an image from media/).
const LOGO = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <path d="M60 8 L106 34 V86 L60 112 L14 86 V34 Z" fill="none" stroke="var(--k-accent)" stroke-width="6" stroke-linejoin="round"/>
  <path d="M34 74 L60 44 L86 74" fill="none" stroke="var(--k-fg)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="60" cy="88" r="6" fill="var(--k-accent)"/></svg>`;

// The spike's boot text (docs/superpowers/spikes/opening). Each entry: the line and the pause after it.
const BOOT: [CrtLine, number][] = [
  ["DEMO-OS v1.0  (c) 1986", 0.5],
  ["", 0.1],
  [{ text: "MEMORY TEST: 640K OK", count: true }, 0.1],
  ["DRIVES A: B: C: ... OK", 0.3],
  ["", 0.1],
  ["Loading: AI agents ............ OK", 0.35],
  ["Loading: knowledge graph ...... OK", 0.35],
  ["Loading: new ways of working .. OK", 0.6],
  ["", 0],
];
const FIRST_LOADING = 5;
const DIM = 0.3; // seconds for the stage to dim before power-on


interface Refs {
  slide: HTMLElement;
  dim: HTMLElement;
  h: CrtHandle;
}

const typeLines = (tl: gsap.core.Timeline, h: CrtHandle, from: number, to: number) => {
  for (let i = from; i < to; i++) {
    h.type(tl, i);
    if (BOOT[i][1]) tl.to({}, { duration: BOOT[i][1] });
  }
};

const scene: SceneModule = {
  build(ctx): Refs {
    const style = document.createElement("style");
    style.textContent = CSS;
    const slide = document.createElement("div");
    slide.className = "k-oldway-slide";
    slide.innerHTML = `${LOGO}<h1>Engineering Excellence 2026</h1><div class="k-oldway-rule"></div>
      <p class="k-oldway-sub">Annual engineering update</p>
      <div class="k-oldway-foot"><span>October 2026</span><span>Engineering</span></div>`;
    ctx.html.append(style, slide);
    gsap.set(slide, { autoAlpha: 0 });
    // The screen powers on over the slide, with no camera move. The lit stage dims to the CRT's
    // own surround first (the .k-retro colour in src/fx/crt.ts), so power-on does not cut to near black.
    const dim = ctx.html.appendChild(document.createElement("div"));
    Object.assign(dim.style, { position: "absolute", inset: "0", background: "color-mix(in srgb, var(--k-bg) 40%, var(--k-blackout))" });
    gsap.set(dim, { autoAlpha: 0 });
    // A soft flash: the power-on keeps the phosphor green instead of a near-white card.
    const h = crt(ctx, { lines: BOOT.map(([line]) => line), flash: "soft" });
    h.root.setAttribute("data-k-bleed", ""); // the bezel fills the frame by design
    return { slide, dim, h };
  },
  steps: [
    (tl, { slide }: Refs) => void tl.to(slide, { autoAlpha: 1, duration: 0.6 }),
    (tl, { dim, h }: Refs) => {
      tl.to(dim, { autoAlpha: 1, duration: DIM });
      h.powerOn(tl);
    },
    (tl, { h }: Refs) => typeLines(tl, h, 0, FIRST_LOADING),
    (tl, { h }: Refs) => typeLines(tl, h, FIRST_LOADING, BOOT.length),
    (tl, { h }: Refs) => h.ready(tl),
  ],
};
export default scene;
