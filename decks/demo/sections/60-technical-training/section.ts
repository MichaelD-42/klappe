import { gsap } from "gsap";
import type { Ctx, SectionModule } from "klappe/types";
import retryMd from "./20-retry/scene.md?raw";

// The retry function as the walkthrough shows it: the bug and fix scenes take it from there, so it is written once.
export const RETRY = /```js[^\n]*\n([\s\S]*?)\n```/.exec(retryMd)![1];
export const BUG_LINE = RETRY.split("\n").findIndex((l) => l.includes("i <= attempts")) + 1;
export const FIXED = RETRY.replace("i <= attempts", "i < attempts");
// Where the Markdown walkthrough puts its code (src/render/world.ts), so the code stays put from scene to scene.
export const SLOT = { x: 960, y: 140, w: 806, h: 799 };

// A scene with build() gets no default title: this one shows in step 1.
export function title(ctx: Ctx, text: string): HTMLElement {
  const h = ctx.html.appendChild(document.createElement("h2"));
  h.textContent = text;
  gsap.set(h, { autoAlpha: 0 });
  return h;
}

// The slide before is the numbers deck's video; the training breaks it open.
const section: SectionModule = { transition: "shatter" };
export default section;
