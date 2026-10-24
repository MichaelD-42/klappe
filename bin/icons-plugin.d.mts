import type { Plugin } from 'vite'

export declare const iconKey: (name: string) => string
export declare function namedIcons(dirs: string[], files: Map<string, string>): string[]
export declare function klappeIcons(opts: { klappeDir: string; dirs: string[] }): Plugin
