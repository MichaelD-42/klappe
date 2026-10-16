export function idFromFolder(name: string): { id: string; order: number } {
  const m = /^(\d+)-(.+)$/.exec(name);
  return m ? { id: m[2], order: Number(m[1]) } : { id: name, order: Infinity };
}
