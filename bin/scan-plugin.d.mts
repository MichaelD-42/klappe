import type { Plugin } from 'vite'

export declare const iconKey: (name: string) => string
export declare function namedIcons(dirs: string[], files: Map<string, string>): string[]
export declare function importedFx(dirs: string[]): string[]
export declare function klappeScan(opts: { klappeDir: string; deckDir: string; extraDirs?: string[] }): Plugin
