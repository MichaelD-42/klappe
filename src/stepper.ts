import { gsap } from "gsap";
import { playTransition } from "./fx/transitions";
import type { CanvasRuntime } from "./render/world";
import type { StepAddr } from "./types";

type How = "play" | "cut";
type Ev = "step" | "transition" | "end";

// transition "fade" means: play the target section's entry transition (default fade).
export function planMove(
  from: StepAddr | null,
  to: StepAddr,
  how: How,
): { kind: "play" | "seek"; transition: "none" | "fade" | "cut" } {
  if (from && how === "play" && to.index === from.index + 1)
    return { kind: "play", transition: from.canvas === to.canvas ? "none" : "fade" };
  return { kind: "seek", transition: "cut" };
}

export class Stepper {
  private i = -1;
  private queue: Promise<void> = Promise.resolve();
  private running: gsap.core.Animation[] = [];
  private pending = 0;
  private fns = new Map<Ev, ((data: any) => void)[]>();

  constructor(
    private steps: StepAddr[],
    private canvases: CanvasRuntime[],
    private opts: { instant: boolean },
  ) {}

  get index(): number {
    return this.i;
  }

  // Back to "nothing shown yet", like a fresh page load. Call only when no move is queued.
  reset(): void {
    this.i = -1;
    this.running = [];
  }

  on(ev: Ev, fn: (data: any) => void): void {
    this.fns.set(ev, [...(this.fns.get(ev) ?? []), fn]);
  }

  goto(i: number, how: How): Promise<void> {
    return this.enqueue(() => i, how);
  }
  next(): Promise<void> {
    return this.enqueue(() => this.i + 1, "play");
  }
  prev(): Promise<void> {
    return this.enqueue(() => this.i - 1, "cut");
  }

  // Review focus 2: finish what is playing, then run moves one at a time.
  // The target is read when the move runs, so fast presses each advance exactly once.
  private enqueue(target: () => number, how: How): Promise<void> {
    for (const a of this.running) a.progress(1);
    this.pending++;
    const run = this.queue.then(() => {
      this.pending--;
      return this.move(target(), how);
    });
    this.queue = run.catch(() => {});
    return run;
  }

  private emit(ev: Ev, data: any) {
    this.call(ev, this.fns.get(ev) ?? [], data);
  }

  // A failing listener must not stop the move or the other listeners; console.error lands in klappe.errors.
  private call(ev: string, fns: ((data: any) => void)[], data: any) {
    for (const fn of fns)
      try {
        fn(data);
      } catch (e) {
        console.error(`stepper '${ev}' listener: ${e instanceof Error ? e.message : e}`);
      }
  }

  private async move(i: number, how: How) {
    if (i >= this.steps.length) return this.emit("end", { index: this.i });
    if (i < 0) return;
    const from = this.i >= 0 ? this.steps[this.i] : null;
    const to = this.steps[i];
    const plan = planMove(from, to, how);
    const play = plan.kind === "play" && !this.opts.instant;
    const c = this.canvases[to.canvas];
    const label = `e:${i}`;
    // State before the target step: the previous step on the same canvas, or the start.
    let prev: string | number = 0;
    for (let j = i - 1; j >= 0; j--)
      if (this.steps[j].canvas === to.canvas) {
        prev = `e:${j}`;
        break;
      }

    this.i = i;
    this.emit("step", to);
    // Helpers (video, timer) hear every move: the step's time span on its own canvas, null on the others, and its scene.
    const span: [number, number] = [typeof prev === "number" ? prev : c.tl.labels[prev], c.tl.labels[label]];
    this.canvases.forEach((cv, k) => this.call("step", cv.stepListeners, { play, span: k === to.canvas ? span : null, scene: to.scene }));
    const anims: gsap.core.Animation[] = [];
    let after = 0; // the step waits for a long transition (or its "reveal" label); cut and fade keep M1 timing
    if (from?.canvas !== to.canvas) {
      const old = from ? this.canvases[from.canvas] : undefined;
      let kind: string = "cut";
      c.tl.seek(play ? prev : label, false); // false: fire onUpdate, so effects that write from progress land
      if (play && plan.transition === "fade" && old) {
        const entry = c.entries[to.section] ?? { kind: "fade", opts: {} };
        const tr = playTransition(entry.kind, old, c, entry.opts);
        kind = tr.kind; // after a fallback, the one that plays
        anims.push(tr.tl);
        // A "reveal" label on the transition starts the step early, overlapping the transition's end.
        if (kind !== "cut" && kind !== "fade") after = tr.tl.labels.reveal ?? tr.tl.duration();
      } else {
        if (old) gsap.set(old.el, { autoAlpha: 0 });
        gsap.set(c.el, { autoAlpha: 1 });
      }
      this.emit("transition", { kind, from: from?.canvas ?? null, to: to.canvas });
    }
    if (play) anims.push(c.tl.tweenFromTo(prev, label, { delay: after }));
    else c.tl.seek(label, false);

    // More moves wait behind this one: skip to its end so only the last one plays.
    if (this.pending) for (const a of anims) a.progress(1);
    this.running = anims;
    await Promise.all(anims);
    this.running = [];
  }
}
