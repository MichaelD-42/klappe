export declare function exportVideo(
  url: string,
  out: string,
  opts?: { fps?: number; hold?: number; size?: { width: number; height: number } },
): Promise<{ frames: number; problems: string[]; errors: string[] }>
