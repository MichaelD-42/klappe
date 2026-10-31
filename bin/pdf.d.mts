export declare function exportPdf(url: string, out: string, opts?: { handout?: boolean }): Promise<{ pages: number; problems: string[]; errors: string[] }>
export declare function handoutPage(page: { shot: string; title: string; notes: string[] }): string
