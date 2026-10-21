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
    timer: "Timer",
    // Effect UI words (src/fx and the default media slot).
    dataMissing: "DATA MISSING",
    dataError: "DATA ERROR",
    imageMissing: "IMAGE MISSING",
    videoMissing: "VIDEO MISSING",
    effectMissing: "EFFECT MISSING",
    video: "Video",
    needsInternet: "needs internet",
    sampleData: "Sample data",
    source: "Source",
    originNotStated: "origin not stated",
    net: "net",
    total: "Total",
    increase: "Increase",
    decrease: "Decrease",
    timesUp: "Time's up",
    pressT: "Press T to start",
    moreLines: "more lines", // "+12 more lines" under clipped code
  },
};

export type StringKey = keyof (typeof strings)["en"];

export function t(key: StringKey, lang: string): string {
  // An unknown language, or a key it lacks, falls back to en.
  return (strings[lang as keyof typeof strings] as Partial<(typeof strings)["en"]> | undefined)?.[key] ?? strings.en[key];
}
