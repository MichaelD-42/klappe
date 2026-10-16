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
  private navigating = false;

  constructor(
    private steps: StepAddr[],
    private onNavigate: (index: number) => void | Promise<void>,
  ) {
    window.addEventListener("popstate", async () => {
      if (!this.steps.length) return;
      this.navigating = true;
      try {
        await this.onNavigate(resolveHash(location.hash, this.steps).index);
      } finally {
        this.navigating = false;
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
