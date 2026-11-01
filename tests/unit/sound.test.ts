import { expect, test } from "vitest";
import { SOUNDS, soundUrl } from "../../src/fx/sound";

test("klappe's own sounds by name, the deck's by link", () => {
  expect(SOUNDS).toEqual(["bed-calm", "bed-pulse", "chime", "click", "fail", "hit", "pop", "rise", "shimmer", "tick", "whip", "whoosh"]);
  expect(soundUrl("whoosh", undefined)).toMatch(/whoosh/);
  expect(soundUrl("nope", undefined)).toBeUndefined();
  const files = { data: {}, media: { "media/x.mp3": "blob:x" } };
  expect([soundUrl("media/x.mp3", files), soundUrl("./media/x.mp3", files), soundUrl("media/y.mp3", files)]).toEqual(["blob:x", "blob:x", undefined]);
});
