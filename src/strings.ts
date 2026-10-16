export const strings = {
  en: {
    sections: "Sections",
    overview: "Overview",
    next: "Next",
    previous: "Previous",
    close: "Close",
    upNext: "Up next",
    endOfDeck: "End of deck",
    waiting: "Waiting for the main window",
    notes: "Notes",
    elapsed: "Elapsed",
    problems: "Deck problems",
    dataMissing: "DATA MISSING",
    imageMissing: "IMAGE MISSING",
  },
};

export type StringKey = keyof (typeof strings)["en"];

export function t(key: StringKey, lang: string): string {
  return (strings[lang as keyof typeof strings] ?? strings.en)[key];
}
