import { expect, test } from "vitest";
import { ownWords, strings, t } from "../../src/strings";

test("every language has every word of en, and no word en lacks", () => {
  for (const [lang, words] of Object.entries(strings)) expect(Object.keys(words).sort(), lang).toEqual(Object.keys(strings.en).sort());
});

test("a de deck reads German words, also as de-DE; an unknown language falls back to en", () => {
  expect(t("timesUp", "de")).toBe("Zeit ist um");
  expect(t("stronglyAgree", "de-DE")).toBe("Stimme voll zu");
  expect(t("timesUp", "fr")).toBe("Time's up");
});

test("a deck's strings.json overrides klappe's words in any language; a bad key or value is a problem", () => {
  try {
    expect(ownWords('{"next": "Suivant", "timesUp": "Temps écoulé", "nope": "x", "close": 3}')).toEqual([
      "strings.json: unknown key 'nope'",
      "strings.json: 'close' must be text",
    ]);
    expect(t("next", "fr")).toBe("Suivant");
    expect(t("timesUp", "de")).toBe("Temps écoulé");
    expect(t("previous", "fr")).toBe("Previous"); // not given: as before
    expect(ownWords("{ nope")).toEqual(["strings.json: not JSON with text values by key"]);
    expect(t("next", "fr")).toBe("Next"); // a broken file overrides nothing
  } finally {
    ownWords(undefined);
  }
});
