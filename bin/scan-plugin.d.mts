import type { Plugin } from 'vite'

export declare const iconKey: (name: string) => string
export interface DeckTexts { code: string[]; md: string[] }
export declare function namedIcons(dirs: string[], files: Map<string, string>, t?: DeckTexts): string[]
export declare function importedFx(dirs: string[], t?: DeckTexts): string[]
export declare function usedLangs(dirs: string[], t?: DeckTexts): string[]
export declare function klappeScan(opts: { klappeDir: string; deckDir: string; extraDirs?: string[] }): Plugin
