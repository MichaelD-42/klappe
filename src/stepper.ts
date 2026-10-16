import { gsap } from "gsap";
import type { CanvasRuntime } from "./render/world";
import type { StepAddr } from "./types";

type How = "play" | "cut";
type Ev = "step" | "transition" | "end";

const CROSSFADE = 0.4;

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
  private fns = new Map<Ev, ((data: any) => void)[]>();

  constructor(
    private steps: StepAddr[],
    private canvases: CanvasRuntime[],
    private opts: { instant: boolean },
  ) {}

  get index(): number {
    return this.i;
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
    const run = this.queue.then(() => this.move(target(), how));
    this.queue = run.catch(() => {});
    return run;
  }

  private emit(ev: Ev, data: any) {
    for (const fn of this.fns.get(ev) ?? []) fn(data);
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
    const anims: gsap.core.Animation[] = [];
    if (from?.canvas !== to.canvas) {
      const old = from ? this.canvases[from.canvas] : undefined;
      const kind = play ? plan.transition : "cut";
      c.tl.seek(play ? prev : label);
      if (kind === "fade" && old)
        anims.push(
          gsap
            .timeline()
            .to(old.el, { autoAlpha: 0, duration: CROSSFADE }, 0)
            .fromTo(c.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: CROSSFADE }, 0),
        );
      else {
        if (old) gsap.set(old.el, { autoAlpha: 0 });
        gsap.set(c.el, { autoAlpha: 1 });
      }
      this.emit("transition", { kind, from: from?.canvas ?? null, to: to.canvas });
    }
    if (play) anims.push(c.tl.tweenFromTo(prev, label));
    else c.tl.seek(label);

    this.running = anims;
    await Promise.all(anims);
    this.running = [];
  }
}
