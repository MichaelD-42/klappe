export declare function outline(klappeDir: string, deckDir: string, opts?: { story?: boolean; cut?: string | null }): Promise<{ deck: import('../src/types').Deck; text: string; problems: string[] }>
export declare function overWords(klappeDir: string, deckDir: string): Promise<string[]>
export declare function walkedScenes(
  deck: { sections: { id: string; scenes: { id: string }[] }[] },
  targets: string[],
): { scenes: string[]; unknown: string[] }
