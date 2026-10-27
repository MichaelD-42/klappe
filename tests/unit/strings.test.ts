import { expect, test } from "vitest";
import { strings, t } from "../../src/strings";

test("every language has every word of en, and no word en lacks", () => {
  for (const [lang, words] of Object.entries(strings)) expect(Object.keys(words).sort(), lang).toEqual(Object.keys(strings.en).sort());
});

test("a de deck reads German words, also as de-DE; an unknown language falls back to en", () => {
  expect(t("timesUp", "de")).toBe("Zeit ist um");
  expect(t("stronglyAgree", "de-DE")).toBe("Stimme voll zu");
  expect(t("timesUp", "fr")).toBe("Time's up");
});
