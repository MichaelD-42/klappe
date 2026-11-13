export const strings = {
  en: {
    sections: "Sections",
    overview: "Overview",
    next: "Next",
    previous: "Previous",
    close: "Close",
    upNext: "Up next",
    endOfDeck: "End of deck",
    appendix: "Appendix", // the speaker view's counter in the appendix, the PDF's page before it
    waiting: "Waiting for the main window",
    notes: "Notes",
    elapsed: "Elapsed",
    problems: "Deck problems",
    timer: "Timer",
    rehearse: "Rehearse",
    laser: "Laser",
    pen: "Pen",
    resetTimes: "Reset times",
    plan: "Plan",
    // The review window (?review=1).
    content: "Content",
    storytelling: "Storytelling",
    visuals: "Visuals",
    savedTo: "Saved to",
    saveFailed: "Not saved: is npm run dev still running?",
    saveRefused: "Refused by the dev server, not saved",
    stepsWithFindings: "Steps with findings",
    notInDeck: "Entries for steps no longer in the deck",
    writtenFor: "Written for",
    fixed: "Fixed",
    approve: "Approve",
    reopen: "Reopen",
    reopenNote: "What is still wrong?",
    waitingForApproval: "Fixed, waiting for your approval",
    sendToClaude: "Send to Claude",
    clock: "Clock",
    clockLeft: "left",
    clockOver: "over",
    sentToClaude: "Sent to Claude",
    editOffInTranslation: "Text edits write scene.md, so a double click edits nothing in a translation: put fixes for it in Content.",
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
    partly: "partly",
    done: "done", // a roadmap milestone's status
    atRisk: "at risk",
    late: "late",
  },
  // Every key of en; the unit test checks it.
  de: {
    sections: "Abschnitte",
    overview: "Übersicht",
    next: "Weiter",
    previous: "Zurück",
    close: "Schließen",
    upNext: "Als Nächstes",
    endOfDeck: "Ende der Präsentation",
    appendix: "Anhang",
    waiting: "Warte auf das Hauptfenster",
    notes: "Notizen",
    elapsed: "Vergangen",
    problems: "Probleme im Deck",
    timer: "Timer",
    rehearse: "Probelauf",
    laser: "Laserpointer",
    pen: "Stift",
    resetTimes: "Zeiten löschen",
    plan: "Plan",
    content: "Inhalt",
    storytelling: "Storytelling",
    visuals: "Gestaltung",
    savedTo: "Gespeichert in",
    saveFailed: "Nicht gespeichert: läuft npm run dev noch?",
    saveRefused: "Vom Dev-Server abgelehnt, nicht gespeichert",
    stepsWithFindings: "Schritte mit Befunden",
    notInDeck: "Einträge für Schritte, die es nicht mehr gibt",
    writtenFor: "Geschrieben für",
    fixed: "Behoben",
    approve: "Abnehmen",
    reopen: "Wieder öffnen",
    reopenNote: "Was stimmt noch nicht?",
    waitingForApproval: "Behoben, warten auf deine Abnahme",
    sendToClaude: "An Claude senden",
    clock: "Uhr",
    clockLeft: "übrig",
    clockOver: "drüber",
    sentToClaude: "An Claude gesendet",
    editOffInTranslation: "Textänderungen schreiben scene.md, darum ändert ein Doppelklick in einer Übersetzung nichts: Korrekturen dafür in Inhalt eintragen.",
    reviewNeedsDev: "Der Review-Modus braucht den Dev-Server: npm run dev",
    dataMissing: "DATEN FEHLEN",
    dataError: "DATENFEHLER",
    imageMissing: "BILD FEHLT",
    videoMissing: "VIDEO FEHLT",
    effectMissing: "EFFEKT FEHLT",
    video: "Video",
    needsInternet: "braucht Internet",
    videoOffline: "Das Video braucht eine Netzverbindung",
    sampleData: "Beispieldaten",
    source: "Quelle",
    originNotStated: "Herkunft nicht angegeben",
    net: "netto",
    total: "Gesamt",
    size: "Größe",
    of: "von",
    increase: "Zunahme",
    decrease: "Abnahme",
    timesUp: "Zeit ist um",
    pressT: "T drücken zum Starten",
    moreLines: "weitere Zeilen",
    stronglyDisagree: "Stimme gar nicht zu",
    disagree: "Stimme nicht zu",
    neutral: "Neutral",
    agree: "Stimme zu",
    stronglyAgree: "Stimme voll zu",
    min: "Min.",
    yes: "ja",
    no: "nein",
    partly: "teilweise",
    done: "erledigt",
    atRisk: "gefährdet",
    late: "verspätet",
  },
};

export type StringKey = keyof (typeof strings)["en"];

// The deck's strings.json, by key: its own words win in every language (a language klappe lacks, or a word it wants said
// differently).
let own: Partial<Record<StringKey, string>> = {};

export function t(key: StringKey, lang: string): string {
  // The language's primary subtag (de-DE reads de); an unknown language falls back to en.
  return own[key] ?? strings[lang.split("-")[0] as keyof typeof strings]?.[key] ?? strings.en[key];
}

// Takes the text of the deck's strings.json (undefined: none) and returns its problems. Keys klappe has and text values
// count; the rest is reported and left out. A file that is not a JSON object overrides nothing.
export function ownWords(text: string | undefined): string[] {
  own = {};
  if (text === undefined) return [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return ["strings.json: not JSON with text values by key"];
  const problems: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (!Object.hasOwn(strings.en, k)) problems.push(`strings.json: unknown key '${k}'`);
    else if (typeof v !== "string") problems.push(`strings.json: '${k}' must be text`);
    else own[k as StringKey] = v;
  }
  return problems;
}
