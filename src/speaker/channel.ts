export type Msg =
  | { t: "state"; index: number }
  | { t: "cmd"; cmd: "next" | "prev" | "goto"; index?: number }
  | { t: "hello" };

export interface Channel {
  send(msg: Msg): void;
  on(fn: (msg: Msg) => void): void;
}

const isIndex = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;

export function isMsg(x: unknown): x is Msg {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  if (m.t === "hello") return true;
  if (m.t === "state") return isIndex(m.index);
  if (m.t === "cmd") return m.cmd === "next" || m.cmd === "prev" || (m.cmd === "goto" && isIndex(m.index));
  return false;
}

// One wire message for channel `name`, or null. Remembers ids in `seen` so a repeat is dropped.
export function parseWire(wire: unknown, name: string, seen: Set<string>): Msg | null {
  if (!wire || typeof wire !== "object") return null;
  const { k, id, msg } = wire as Record<string, unknown>;
  if (k !== name || typeof id !== "string" || seen.has(id) || !isMsg(msg)) return null;
  seen.add(id);
  return msg;
}

// BroadcastChannel, plus postMessage to the opener and to any window that has written to us.
// Every message goes out on both, so each carries an id and the receiver drops repeats.
export function openChannel(deckTitle: string): Channel {
  const name = `klappe:${deckTitle}`;
  const fns: ((msg: Msg) => void)[] = [];
  const peers = new Set<Window>();
  const seen = new Set<string>();
  let n = 0;
  const me = Math.random().toString(36).slice(2);
  if (window.opener) peers.add(window.opener);

  const valid = (wire: unknown) => parseWire(wire, name, seen);
  const deliver = (msg: Msg | null) => {
    if (msg) for (const fn of fns) fn(msg);
  };

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(name);
    bc.onmessage = (e) => deliver(valid(e.data));
  } catch {
    // no BroadcastChannel here (e.g. an opaque origin): postMessage alone carries the messages
  }
  addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;
    const msg = valid(e.data);
    // Known before delivery, so a reply to this message (state for hello) reaches the sender.
    if (msg && e.source && e.source !== window) peers.add(e.source as Window);
    deliver(msg);
  });

  return {
    send(msg) {
      const wire = { k: name, id: `${me}:${n++}`, msg };
      bc?.postMessage(wire);
      for (const p of peers) {
        if (p.closed) peers.delete(p);
        // An opaque origin (file://) reads "null" and cannot be a target. The trust boundary is the
        // receiver: parseWire() plus the bounds check on the index, not the target origin.
        else p.postMessage(wire, location.origin === "null" ? "*" : location.origin);
      }
    },
    on(fn) {
      fns.push(fn);
    },
  };
}
