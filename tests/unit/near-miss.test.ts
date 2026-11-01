import { describe, expect, it } from "vitest";
import { nearMisses } from "../../src/selftest";

const t = (id: string, x: number, y: number) => ({ id, x, y });

describe("nearMisses", () => {
  it("flags a title a few px off where at least two other scenes put theirs, once per axis", () => {
    expect(nearMisses([t("a", 160, 140), t("b", 160, 140), t("c", 160, 140), t("d", 172, 140), t("e", 160, 131)])).toEqual([
      "layout grid: the title of d sits at x 172, 12 px off the 160 that 4 scenes use",
      "layout grid: the title of e sits at y 131, 9 px off the 140 that 4 scenes use",
    ]);
  });

  it("leaves a title alone that sits exactly, far off on purpose, or where only one other does", () => {
    expect(nearMisses([t("a", 160, 140), t("b", 160.4, 140), t("c", 960, 500), t("d", 300, 140), t("e", 310, 140)])).toEqual([]);
  });
});
