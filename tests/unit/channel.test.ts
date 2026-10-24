import { describe, it, expect, vi } from "vitest";
import { channelName, isMsg, parseWire } from "../../src/speaker/channel";
import { Stepper } from "../../src/stepper";

describe("isMsg", () => {
  it("accepts the three message kinds", () => {
    for (const m of [{ t: "hello" }, { t: "state", index: 0 }, { t: "state", index: 0, timer: true }, { t: "cmd", cmd: "next" }, { t: "cmd", cmd: "goto", index: 3 }])
      expect(isMsg(m)).toBe(true);
  });
  it("rejects a wrong shape", () => {
    for (const m of [null, "hello", { t: "other" }, { t: "state" }, { t: "state", index: 0, timer: "yes" }, { t: "cmd", cmd: "jump" }, { t: "cmd", cmd: "goto" }])
      expect(isMsg(m)).toBe(false);
  });
  it("rejects a negative or non-integer index", () => {
    for (const index of [-1, 1.5, NaN, "2"]) {
      expect(isMsg({ t: "state", index })).toBe(false);
      expect(isMsg({ t: "cmd", cmd: "goto", index })).toBe(false);
    }
  });
});

describe("parseWire", () => {
  const wire = (o: object = {}) => ({ k: "klappe:T", id: "a:0", msg: { t: "state", index: 2 }, ...o });
  it("returns the message of a good wire", () => {
    expect(parseWire(wire(), "klappe:T", new Set())).toEqual({ t: "state", index: 2 });
  });
  it("drops a repeated id", () => {
    const seen = new Set<string>();
    parseWire(wire(), "klappe:T", seen);
    expect(parseWire(wire(), "klappe:T", seen)).toBeNull();
  });
  it("drops a wrong shape", () => {
    for (const w of [null, 1, wire({ k: "klappe:other" }), wire({ id: 7 }), wire({ msg: { t: "state" } }), wire({ msg: { t: "state", index: -1 } }), wire({ msg: { t: "cmd", cmd: "goto", index: 1.5 } })])
      expect(parseWire(w, "klappe:T", new Set())).toBeNull();
  });
});

describe("Stepper listeners", () => {
  it("a throwing listener is logged and the next one still runs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const s = new Stepper([], [], { instant: true });
    const second = vi.fn();
    s.on("end", () => {
      throw new Error("boom");
    });
    s.on("end", second);
    await s.next();
    expect(second).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("stepper 'end' listener: boom");
    log.mockRestore();
  });
});

describe("channelName", () => {
  it("keeps two decks with one title apart when they are served from different paths", () => {
    expect(channelName("Demo", "/klappe/a/")).not.toBe(channelName("Demo", "/klappe/b/"));
    expect(channelName("Demo", "/klappe/a/")).toBe(channelName("Demo", "/klappe/a/"));
  });
});
