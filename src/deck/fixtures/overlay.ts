import { assembleDeck } from "../assemble";
import { gsap } from "gsap";
import { text } from "klappe/fx";
import type { OverlayModule } from "../../types";

// An overlay with a logo box and a chapter label: the label names the current section, the logo hides on the title
// section, and both stay where they are on screen while the camera flies between scenes of a shared canvas.
const overlay: OverlayModule = {
  build: (ctx) => {
    const logo = ctx.html.appendChild(document.createElement("div"));
    logo.dataset.logo = "";
    Object.assign(logo.style, { position: "absolute", right: "64px", bottom: "40px", width: "160px", height: "48px", background: "var(--k-accent)" });
    const label = text(ctx, { text: "", x: 64, y: 1000, w: 900, size: 24, color: "--k-muted" }).el;
    label.dataset.label = "";
    return { logo, label };
  },
  update: (at, r: { logo: HTMLElement; label: HTMLElement }) => {
    r.label.textContent = at.sectionTitle;
    gsap.set(r.label, { autoAlpha: 1 });
    gsap.set(r.logo, { autoAlpha: at.section === "intro" ? 0 : 1 });
  },
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Overlay\n---\n",
      "sections/10-intro/section.md": "# Intro\n",
      "sections/10-intro/10-hello/scene.md": "## Hello\n\n- Welcome.\n",
      "sections/20-body/section.md": "# Body\n",
      "sections/20-body/10-one/scene.md": "## One\n\n- First.\n",
      "sections/20-body/20-two/scene.md": "## Two\n\n- Second.\n- Third.\n",
    },
    {},
  );
  r.deck.overlay = overlay;
  return r;
};
