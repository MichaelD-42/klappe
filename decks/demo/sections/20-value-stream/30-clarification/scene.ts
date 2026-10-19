import { bubble, counter, figure, shout } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { heading, stageFrame, svgEl } from "../section";

// Scene-local layout. The Clarification stage sits at x 420 (box 190..650), Design at 1520 (box 1290..1750).
const FLOOR = 930; // the figures' feet, just above the stream band
const PERSON = 600; // where the person starts, beside the Clarification tile
const STACK = 750; // where the stack of open questions waits
const PICK = 690; // where the person stands to pick it up
const MEET = 960; // where the person stops in front of the customer
const CUSTOMER = 1180;
const HANDS = 50; // the carried stack sits this far above the feet
const CARDS = 5; // the stack the counter counts down: the cards drawn here, not a statistic
const PULSE = { from: 650, to: 1290, y: 1022 }; // along the line, from the Clarification box to the Design box

const hidden = { opacity: "0", visibility: "hidden" };

const scene: SceneModule = {
  // place() is the scene's home frame: the engine flies there on entry. camera.to is for moves within a scene.
  place: () => stageFrame("clarification"),
  build(ctx) {
    const title = heading(ctx, "Clarification");
    const person = figure(ctx, { x: PERSON, y: FLOOR, color: "var(--k-fg)" });
    const customer = figure(ctx, { x: CUSTOMER, y: FLOOR, color: "var(--k-accent)" });
    const label = document.createElement("div");
    label.textContent = "Customer";
    Object.assign(label.style, {
      position: "absolute", left: `${CUSTOMER - 150}px`, top: `${FLOOR - 285}px`, width: "300px",
      textAlign: "center", fontSize: "32px", fontWeight: "600", color: "var(--k-accent)", ...hidden,
    });
    ctx.html.append(label);

    // The stack: question cards fanned upward from the feet line, a question mark on the top one.
    const stack = svgEl("g", { transform: `translate(${STACK} ${FLOOR})` });
    Object.assign(stack.style, hidden);
    const cards = Array.from({ length: CARDS }, (_, k) => {
      const c = svgEl("g", {});
      const r = svgEl("rect", { x: -45 + (k % 2 ? 5 : -5), y: -60 - k * 12, width: 90, height: 60, rx: 5, "stroke-width": 3 });
      Object.assign(r.style, { fill: "var(--k-bg)", stroke: "var(--k-accent)" });
      c.append(r);
      if (k === CARDS - 1) {
        const q = svgEl("text", { x: 0, y: -60 - k * 12 + 32, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 40, "font-weight": 700 });
        q.style.fill = "var(--k-accent)";
        q.textContent = "?";
        c.append(q);
      }
      stack.append(c);
      return c;
    });
    ctx.svg.append(stack);

    // A light that runs along the stream to the next stage.
    const pulse = svgEl("circle", { cx: 0, cy: PULSE.y, r: 12 });
    Object.assign(pulse.style, { fill: "var(--k-accent)", filter: "drop-shadow(0 0 16px var(--k-accent))", ...hidden });
    ctx.svg.append(pulse);

    // Placeholder words: the spec gives no actual question or answer.
    const ask = bubble(ctx, { x: MEET - 30, y: FLOOR - 350, text: "Question?", side: "left" });
    const reply = bubble(ctx, { x: CUSTOMER + 30, y: FLOOR - 350, text: "Answer.", side: "right" });
    const open = counter(ctx, { x: (MEET + CUSTOMER) / 2, y: 330, from: CARDS, to: 0, label: "Open questions" });
    // Last, so it sits above the scene. Text as in scene.md; "calm" as in deck.md.
    const out = shout(ctx, { question: "What is still left for humans to do?", answer: "The conversations that build trust.", intensity: "calm" });
    return { title, person, customer, label, stack, cards, pulse, ask, reply, open, out };
  },
  steps: [
    // The camera follows the stream to Clarification.
    (tl, r, ctx) => {
      tl.to(r.title, { autoAlpha: 1, duration: 0.6 });
      ctx.canvas.refs.stream.tiles[2].light(tl, "<");
      r.person.appear(tl);
      tl.to([r.stack, r.label], { autoAlpha: 1, duration: 0.5 }, "<");
      r.customer.appear(tl);
    },
    // A person picks up the stack of open questions and walks to the customer.
    (tl, r) => {
      r.person.walk(tl, `M${PERSON} ${FLOOR} L${PICK} ${FLOOR}`, { duration: 0.7 });
      tl.fromTo(r.stack, { x: STACK, y: FLOOR }, { x: PICK, y: FLOOR - HANDS, duration: 0.5, ease: "power2.out" });
      r.person.walk(tl, `M${PICK} ${FLOOR} L${MEET} ${FLOOR}`, { duration: 1.8 });
      tl.fromTo(r.stack, { x: PICK }, { x: MEET, duration: 1.8, ease: "none", immediateRender: false }, "<");
    },
    // Questions and answers appear as speech bubbles.
    (tl, r) => {
      r.ask.show(tl);
      r.reply.show(tl);
    },
    // The stack of questions shrinks to zero: one card leaves as the counter drops past each number.
    (tl, r) => {
      r.open.run(tl);
      const count = tl.duration() - 1.8; // the count runs over the last 1.8 s (motion.step * 3)
      [...r.cards].reverse().forEach((c: Element, j: number) =>
        // fromTo: its start is written at load, so a seek and a play leave the same inline style.
        tl.fromTo(c, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -20, duration: 0.2 },count + 1.8 * ((j + 0.5) / CARDS) - 0.1),
      );
    },
    // The person walks back. The stream moves on.
    (tl, r, ctx) => {
      r.ask.hide(tl);
      r.reply.hide(tl, "<");
      const t = tl.duration();
      r.person.walk(tl, `M${MEET} ${FLOOR} L${PERSON} ${FLOOR}`, { duration: 2, at: t });
      tl.fromTo(r.pulse, { autoAlpha: 0, x: PULSE.from }, { autoAlpha: 1, duration: 0.3 }, t);
      tl.to(r.pulse, { x: PULSE.to, duration: 1.4, ease: "power1.inOut" }, t + 0.3);
      tl.to(r.pulse, { autoAlpha: 0, duration: 0.3 }, t + 1.7);
      ctx.canvas.refs.stream.tiles[3].light(tl, t + 1.7);
    },
    (tl, r) => r.out.enter(tl),
    (tl, r) => r.out.hold(tl),
    (tl, r) => r.out.fade(tl),
    (tl, r) => r.out.answer(tl),
  ],
};
export default scene;
