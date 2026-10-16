import type { StepAddr } from "./types";

export const formatHash = (a: StepAddr): string => `#/${a.section}/${a.scene}/${a.step}`;

export function resolveHash(hash: string, steps: StepAddr[]): { index: number; exact: boolean } {
  const [section, scene, step] = hash.replace(/^#\/?/, "").split("/");
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
    private onNavigate: (index: number) => void,
  ) {
    window.addEventListener("popstate", () => {
      this.navigating = true;
      try {
        this.onNavigate(resolveHash(location.hash, this.steps).index);
      } finally {
        this.navigating = false;
      }
    });
  }

  push(index: number): void {
    if (!this.navigating) history.pushState(null, "", formatHash(this.steps[index]));
  }

  start(): number {
    const { index, exact } = resolveHash(location.hash, this.steps);
    if (!exact) history.replaceState(null, "", formatHash(this.steps[index]));
    return index;
  }
}
