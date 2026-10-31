// Rehearsal: wall-clock seconds per scene, from the scenes the speaker view is told about. The last run is kept in
// localStorage; the clock is injected so the accumulation can be tested.
export type Times = Record<string, number>;

export function rehearsal(key: string, now: () => number, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const read = (): Times => {
    try {
      const v = JSON.parse(storage?.getItem(key) ?? "{}");
      return Object.fromEntries(Object.entries(v).filter(([, s]) => Number.isFinite(s))) as Times;
    } catch {
      return {};
    }
  };
  const write = (fn: () => void) => {
    try {
      fn();
    } catch {
      // private mode or quota: this session keeps its times in memory
    }
  };
  let times = read();
  let on = false;
  let scene: string | null = null; // the scene on show, whether or not a run is on
  let since = 0;

  const flush = () => {
    if (!on || scene === null) return;
    const t = now();
    if (t === since) return;
    times[scene] = (times[scene] ?? 0) + (t - since) / 1000;
    since = t;
    write(() => storage?.setItem(key, JSON.stringify(times)));
  };

  return {
    get on() {
      return on;
    },
    // The scene now on show; leaving the old one adds its time.
    enter(id: string) {
      flush();
      scene = id;
      since = now();
    },
    // A new run replaces the last one; stopping keeps it.
    toggle() {
      if (on) {
        flush();
        on = false;
      } else {
        times = {};
        on = true;
        since = now();
        write(() => storage?.setItem(key, "{}"));
      }
    },
    reset() {
      times = {};
      since = now();
      write(() => storage?.removeItem(key));
    },
    times(): Times {
      flush();
      return { ...times };
    },
  };
}
