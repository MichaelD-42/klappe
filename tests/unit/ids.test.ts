import { describe, it, expect } from "vitest";
import { idFromFolder } from "../../src/parse/ids";

describe("idFromFolder", () => {
  it("splits order prefix and id", () => {
    expect(idFromFolder("20-analysis")).toEqual({ id: "analysis", order: 20 });
  });
  it("gives Infinity without prefix", () => {
    expect(idFromFolder("intro")).toEqual({ id: "intro", order: Infinity });
  });
});
