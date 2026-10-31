import type { Plugin } from 'vite'
import type { Edit } from '../src/review/file'

export declare function readEdit(body: unknown): { edit: Edit; order: string[]; from?: string; seq?: number } | null
export declare function fresh(seen: Map<string, number>, from: string | undefined, seq: number | undefined, edit: Edit): Edit
export declare function readText(body: unknown): { source: string; from: string; to: string } | null
export declare function replaceText(md: string, from: string, to: string): string | null
export declare function klappeReview(opts: { file: string; deckDir?: string }): Plugin
