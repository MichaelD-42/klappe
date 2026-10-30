export declare function stepSeconds(notes: string): number
export declare function outline(klappeDir: string, deckDir: string): Promise<{ deck: import('../src/types').Deck; text: string; problems: string[] }>
export declare function overWords(klappeDir: string, deckDir: string): Promise<string[]>
export declare function walkedScenes(
  deck: { sections: { id: string; scenes: { id: string }[] }[] },
  targets: string[],
): { scenes: string[]; unknown: string[] }
