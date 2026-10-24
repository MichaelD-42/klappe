import { gsap } from "gsap";
import { shatter, type ShatterHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";

// The classic title slide from the spike (docs/superpowers/spikes/opening), in theme tokens.
// The style sits on the scene, not the slide, so the 30 shard clones do not each carry a copy.
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

const CRACK_GAP = 0.5; // seconds between the first crack settling and the second impact (the spike's 1 s rhythm)
const HOLD = 2; // "Let it sit in silence for two seconds."

interface Refs {
  slide: HTMLElement;
  fx: ShatterHandle;
}

const scene: SceneModule = {
  build(ctx): Refs {
    const style = document.createElement("style");
    style.textContent = CSS;
    // Nothing under the slide: once the shards are gone, the section's dark stage backdrop shows.
    const slide = document.createElement("div");
    slide.className = "k-oldway-slide";
    slide.innerHTML = `${LOGO}<h1>Engineering Excellence 2026</h1><div class="k-oldway-rule"></div>
      <p class="k-oldway-sub">Annual engineering update</p>
      <div class="k-oldway-foot"><span>October 2026</span><span>Engineering</span></div>`;
    ctx.html.append(style, slide);
    const fx = shatter(ctx, { target: slide });
    gsap.set(slide, { autoAlpha: 0 });
    return { slide, fx };
  },
  steps: [
    (tl, { slide }: Refs) => void tl.to(slide, { autoAlpha: 1, duration: 0.6 }),
    (tl, { fx }: Refs) => {
      fx.crack(tl);
      tl.to({}, { duration: CRACK_GAP });
      fx.crack2(tl);
    },
    // The empty stage holds in the same step: silence needs no click.
    (tl, { fx }: Refs) => {
      fx.fall(tl);
      tl.to({}, { duration: HOLD });
    },
  ],
};
export default scene;
