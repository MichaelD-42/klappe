import type { StepAddr } from "./types";

export const formatHash = (a: StepAddr): string => `#/${a.section}/${a.scene}/${a.step}`;

// A bad escape stays raw: it matches no id, so the hash falls back like any other garbage.
const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export function resolveHash(hash: string, steps: StepAddr[]): { index: number; exact: boolean } {
  const [section, scene, step] = hash.replace(/^#\/?/, "").split("/").map(decode);
  const n = step === undefined ? 1 : Number(step);
  const inScene = steps.filter((s) => s.section === section && s.scene === scene);
  const exact = inScene.find((s) => s.step === n);
  if (exact) return { index: exact.index, exact: true };
  if (inScene.length) return { index: inScene[0].index, exact: false };
  const inSection = steps.find((s) => s.section === section);
  return { index: inSection?.index ?? 0, exact: false };
}

export class Router {
  private navigating = 0; // a count: back pressed twice runs two navigations at once

  constructor(
    private steps: StepAddr[],
    private onNavigate: (index: number) => void | Promise<void>,
  ) {
    window.addEventListener("popstate", async () => {
      if (!this.steps.length) return;
      const { index, exact } = resolveHash(location.hash, this.steps);
      if (!exact) history.replaceState(null, "", formatHash(this.steps[index]));
      this.navigating++;
      try {
        await this.onNavigate(index);
      } catch (e) {
        console.error(`navigation to ${location.hash}: ${e instanceof Error ? e.message : e}`);
      } finally {
        this.navigating--;
      }
    });
  }

  push(index: number): void {
    const step = this.steps[index];
    // Idempotent: a late async 'step' event must not add a duplicate history entry.
    if (!step || this.navigating || decode(location.hash) === formatHash(step)) return;
    history.pushState(null, "", formatHash(step));
  }

  start(): number {
    if (!this.steps.length) return 0;
    const { index, exact } = resolveHash(location.hash, this.steps);
    if (!exact) history.replaceState(null, "", formatHash(this.steps[index]));
    return index;
  }
}
