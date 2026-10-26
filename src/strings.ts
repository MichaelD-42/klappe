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
    // The review window (?review=1).
    review: "Review",
    content: "Content",
    storytelling: "Storytelling",
    visuals: "Visuals",
    savedTo: "Saved to",
    saveFailed: "Not saved: is npm run dev still running?",
    stepsWithFindings: "Steps with findings",
    notInDeck: "Entries for steps no longer in the deck",
    writtenFor: "Written for",
    reviewNeedsDev: "Review mode needs the dev server: npm run dev",
    // Effect UI words (src/fx and the default media slot).
    dataMissing: "DATA MISSING",
    dataError: "DATA ERROR",
    imageMissing: "IMAGE MISSING",
    videoMissing: "VIDEO MISSING",
    effectMissing: "EFFECT MISSING",
    video: "Video",
    needsInternet: "needs internet",
    videoOffline: "Video needs a network connection",
    sampleData: "Sample data",
    source: "Source",
    originNotStated: "origin not stated",
    net: "net",
    total: "Total",
    size: "Size", // "Size: people" over a bubble chart
    of: "of",
    increase: "Increase",
    decrease: "Decrease",
    timesUp: "Time's up",
    pressT: "Press T to start",
    moreLines: "more lines", // "+12 more lines" under clipped code
    stronglyDisagree: "Strongly disagree", // the likert scale, disagree first
    disagree: "Disagree",
    neutral: "Neutral",
    agree: "Agree",
    stronglyAgree: "Strongly agree",
    min: "min", // "15 min" on an exercise card
    yes: "yes", // the spoken name of a tick in a comparison table
    no: "no",
  },
};

export type StringKey = keyof (typeof strings)["en"];

export function t(key: StringKey, lang: string): string {
  // An unknown language, or a key it lacks, falls back to en.
  return (strings[lang as keyof typeof strings] as Partial<(typeof strings)["en"]> | undefined)?.[key] ?? strings.en[key];
}
