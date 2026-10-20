import type { Ctx, Rect, StepAdder } from "../types";

export interface TreeNode {
  label: string;
  children?: { edge: string; node: TreeNode }[];
}
export type TreeOpts = { root: TreeNode } & Rect & { build?: "all" | "levels" };
export interface TreeHandle {
  show: StepAdder;
  level(k: number): StepAdder;
  path(edges: string[]): StepAdder;
}

export function decisionTree(ctx: Ctx, opts: TreeOpts): TreeHandle {
  throw new Error("decisionTree: not built yet");
}
