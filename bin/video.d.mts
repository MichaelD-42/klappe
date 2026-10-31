export declare function exportVideo(
  url: string,
  out: string,
  opts?: { fps?: number; hold?: number; size?: { width: number; height: number }; signal?: AbortSignal },
): Promise<{ frames: number; problems: string[]; errors: string[] }>
