import type { Plugin } from 'vite'
import type { Edit } from '../src/review/file'

export declare function readEdit(body: unknown): { edit: Edit; order: string[] } | null
export declare function klappeReview(opts: { file: string }): Plugin
