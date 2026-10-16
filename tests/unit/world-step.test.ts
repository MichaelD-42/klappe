import { describe, it, expect } from "vitest";
import { gsap } from "gsap";
import { appendStep } from "../../src/render/world";

describe("appendStep", () => {
  it("keeps a zero-duration step out of the previous label, both ways", () => {
    const o = { v: 0 };
    const tl = gsap.timeline({ paused: true });
    appendStep(tl, "e:0", (t) => t.to(o, { v: 1, duration: 1 }));
    appendStep(tl, "e:1", (t) => t.set(o, { v: 2 }));
    appendStep(tl, "e:2", () => {}); // no tweens at all
    tl.seek("e:0");
    expect(o.v).toBe(1);
    tl.seek("e:1");
    expect(o.v).toBe(2);
    tl.seek("e:2");
    expect(o.v).toBe(2);
    tl.seek("e:1"); // backward onto the set's own label keeps it
    expect(o.v).toBe(2);
    tl.seek("e:0");
    expect(o.v).toBe(1);
    expect(tl.labels["e:2"]).toBeGreaterThan(tl.labels["e:1"]);
  });
});
