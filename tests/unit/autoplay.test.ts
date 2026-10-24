import { afterEach, expect, test, vi } from "vitest";
import { Autoplay } from "../../src/autoplay";

afterEach(() => vi.unstubAllGlobals());

test("a step that fails stops autoplay and is reported, not left unhandled", async () => {
  vi.stubGlobal("window", { setTimeout: (f: () => void) => setTimeout(f, 0) });
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const stepper = { on: vi.fn(), idle: Promise.resolve(), next: () => Promise.reject(new Error("boom")) };
  const a = new Autoplay(stepper as any, () => 0);
  a.start();
  await new Promise((r) => setTimeout(r, 10));
  expect(a.running).toBe(false);
  expect(error).toHaveBeenCalledWith(expect.stringContaining("boom"));
});
