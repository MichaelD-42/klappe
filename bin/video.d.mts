export declare function exportVideo(
  url: string,
  out: string,
  // only: deep-link targets, <section> or <section>/<scene>.
  opts?: { fps?: number; hold?: number; size?: { width: number; height: number }; signal?: AbortSignal; only?: string[] },
): Promise<{ frames: number; steps: number[]; problems: string[]; errors: string[] }>
