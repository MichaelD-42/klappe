import type { Browser, Page } from '@playwright/test'
export type Link = { href: string; x: number; y: number; w: number; h: number }
export declare function openDeck(browser: Browser, url: string, viewport?: { width: number; height: number }, params?: Record<string, string>): Promise<Page>
export declare function showStep(page: Page, i: number, at?: number): Promise<void>
export declare function printable(page: Page): Promise<Link[]>
export declare function exportPdf(url: string, out: string, opts?: { handout?: boolean; width?: number; quality?: number }): Promise<{ pages: number; problems: string[]; errors: string[] }>
export declare function handoutPage(page: { shot: string; links?: Link[]; title: string; notes: string[] }): string
