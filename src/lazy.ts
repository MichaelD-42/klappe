// Modules that load on demand: load(names) fetches the named ones, get(name) returns one or throws "<name>: not loaded".
export function lazyTable<M>(loaders: { [K in keyof M]: () => Promise<M[K]> }) {
  const loaded: Partial<M> = {};
  return {
    names: Object.keys(loaders) as (keyof M)[],
    has: (name: PropertyKey): name is keyof M => name in loaders,
    get<K extends keyof M>(name: K): M[K] {
      const v = loaded[name];
      if (!v) throw new Error(`${String(name)}: not loaded`);
      return v as M[K];
    },
    load: (names: Iterable<keyof M>) => Promise.all([...new Set(names)].map(async (k) => void (loaded[k] = await loaders[k]()))),
  };
}
