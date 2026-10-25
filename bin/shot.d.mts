import type { StepAddr } from '../src/types'

export declare function pickSteps(steps: StepAddr[], targets: string[], last: boolean): { picked: StepAddr[]; unknown: string[] }
export declare function shoot(
  url: string,
  outDir: string,
  opts?: { targets?: string[]; last?: boolean; sheet?: boolean; theme?: string },
): Promise<{ files: string[]; sheets: string[]; unknown: string[]; problems: string[]; errors: string[] }>
