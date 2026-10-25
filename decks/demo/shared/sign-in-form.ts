import { gsap } from "gsap";
import type { Ctx } from "klappe/types";

// A sign-in screen drawn in theme tokens, for the pointer walkthrough: a panel, two labelled fields and a button.
// Drawn, not a screenshot: the demo ships no fake pictures. Returns the parts a pointer aims at.
export function signInForm(ctx: Ctx, x: number, y: number) {
  const div = (style: Partial<CSSStyleDeclaration>, text = "", parent: HTMLElement = ctx.html) => {
    const e = parent.appendChild(document.createElement("div"));
    e.textContent = text;
    Object.assign(e.style, { position: "absolute", boxSizing: "border-box", ...style });
    return e;
  };
  const panel = div({ left: `${x}px`, top: `${y}px`, width: "720px", height: "560px", borderRadius: "16px", background: "var(--k-surface)", border: "3px solid var(--k-line)" });
  div({ left: "56px", top: "44px", font: "700 40px/1.2 var(--k-font)", color: "var(--k-fg)" }, "Sign in", panel);
  const field = (top: number, label: string) => {
    div({ left: "56px", top: `${top}px`, font: "500 24px/1.2 var(--k-font)", color: "var(--k-muted)" }, label, panel);
    return div({ left: "56px", top: `${top + 36}px`, width: "608px", height: "64px", borderRadius: "8px", border: "3px solid var(--k-line)", background: "var(--k-bg)" }, "", panel);
  };
  const email = field(130, "Email");
  const password = field(260, "Password");
  const button = div(
    { left: "56px", top: "430px", width: "608px", height: "68px", borderRadius: "10px", background: "var(--k-accent)", color: "var(--k-bg)", font: "700 28px/68px var(--k-font)", textAlign: "center" },
    "Continue",
    panel,
  );
  gsap.set(panel, { autoAlpha: 0 });
  return { panel, email, password, button };
}
