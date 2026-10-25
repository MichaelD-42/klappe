import { pointer, type PointerHandle } from "klappe/fx";
import { captioned } from "../../../caption";
import { signInForm } from "../../../shared/sign-in-form";

type R = { p: PointerHandle; form: ReturnType<typeof signInForm> };

export default captioned("pointer(ctx, { at }) — move(target), click, type(field, text)", {
  build: (ctx): R => ({ p: pointer(ctx, { at: { x: 1500, y: 760 } }), form: signInForm(ctx, 600, 200) }),
  steps: [
    (tl, r: R) => (tl.to(r.form.panel, { autoAlpha: 1, duration: 0.6 }), r.p.show(tl)),
    (tl, r: R) => (r.p.move(r.form.email)(tl), r.p.click(tl), r.p.type(r.form.email, "ada@example.com")(tl)),
    (tl, r: R) => (r.p.move(r.form.password)(tl), r.p.click(tl), r.p.type(r.form.password, "••••••••••")(tl)),
    (tl, r: R) => (r.p.move(r.form.button)(tl), r.p.click(tl)),
  ],
});
