import type { Stepper } from "./stepper";
import type { StepAddr } from "./types";

// Holds each step for holdMs after its play has finished, then advances. Stops at the end.
export class Autoplay {
  private on = false;
  private run = 0; // bumped by start and stop, so a loop from an earlier run sees it and quits
  private timer = 0;
  private at: StepAddr | null = null;

  constructor(
    private stepper: Stepper,
    private holdMs: (addr: StepAddr) => number,
  ) {
    stepper.on("step", (a: StepAddr) => (this.at = a));
    stepper.on("end", () => this.stop());
  }

  get running(): boolean {
    return this.on;
  }

  start(): void {
    if (this.on) return;
    this.on = true;
    this.loop(++this.run).catch((e) => {
      console.error(`autoplay: ${e instanceof Error ? e.message : e}`);
      this.stop();
    });
  }

  stop(): void {
    if (!this.on) return;
    this.on = false;
    this.run++;
    clearTimeout(this.timer);
  }

  toggle(): void {
    if (this.on) this.stop();
    else this.start();
  }

  private async loop(run: number): Promise<void> {
    await this.stepper.idle; // started mid-play: hold from the end of the play, not from the key press
    while (run === this.run) {
      this.stepper.cancelAuto(); // autoplay owns the advance; it holds a step for its auto time instead
      const hold = this.at ? this.holdMs(this.at) : 0;
      await new Promise((r) => (this.timer = window.setTimeout(r, hold)));
      if (run !== this.run) return;
      await this.stepper.next(); // resolves when the step's play has finished
    }
  }
}
