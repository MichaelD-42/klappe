// review.md: the findings of a review, one entry per step, written by the review window through the dev server
// and worked off by Claude Code. Hand edits are kept: text before the first entry, a ## that is not a deep link,
// and an unknown ### heading in an entry.

export type Category = "content" | "storytelling" | "visuals";
export const CATEGORIES: Category[] = ["content", "storytelling", "visuals"];
const HEADING: Record<Category, string> = { content: "Content", storytelling: "Storytelling", visuals: "Visuals" };

export interface Entry {
  hash: string;
  quote: string;
  findings: Partial<Record<Category, string>>;
}
export interface Edit {
  hash: string;
  quote: string;
  set: Partial<Record<Category, string>>;
}

// note: hand-written text between the quote and the first ###; extra: ### sections that are not a category.
type Full = Entry & { note: string[]; extra: { heading: string; body: string }[] };
interface Doc {
  head: string;
  entries: Full[];
  rest: string[][]; // ## sections that are not a step, line by line as written
}

// A step's deep link: ids are free text after a folder's number ("einführung", "v1.2", "q&a"), never / or space.
export const STEP_HASH = /^#\/[^/\s]+\/[^/\s]+\/\d+$/;
const DEEP_LINK = new RegExp(`^## (${STEP_HASH.source.slice(1, -1)})\\s*$`);
const trimLines = (lines: string[]) => lines.join("\n").replace(/^\s*\n|\s+$/g, "");
// A finding line that could read as a heading (or as an escape) gets a backslash in front.
const escape = (text: string) => text.replace(/^(?=[#\\])/gm, "\\");
const unescape = (text: string) => text.replace(/^\\/gm, "");

function parse(text: string): Doc {
  const doc: Doc = { head: "", entries: [], rest: [] };
  const head: string[] = [];
  let lines: string[] = head; // where the next line goes
  let entry: Full | undefined;
  let quote: string[] = [];
  let section: { heading: string; lines: string[] } | undefined;
  const close = () => {
    if (section && entry) {
      const body = trimLines(section.lines);
      const k = CATEGORIES.find((c) => HEADING[c] === section!.heading);
      if (k) entry.findings[k] = unescape(body);
      else entry.extra.push({ heading: section.heading, body });
    }
    section = undefined;
  };
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.startsWith("## ")) {
      close();
      const m = DEEP_LINK.exec(line);
      if (m) {
        entry = { hash: m[1], quote: "", findings: {}, note: [], extra: [] };
        doc.entries.push(entry);
        quote = [];
        lines = quote;
      } else {
        entry = undefined;
        lines = [line];
        doc.rest.push(lines);
      }
    } else if (entry && line.startsWith("### ")) {
      close();
      section = { heading: line.slice(4).trim(), lines: [] };
      lines = section.lines;
    } else if (lines === head && !head.length && /^# Review\s*$/.test(line)) {
      // the title line
    } else if (lines === quote) {
      if (line.startsWith(">") && !entry!.note.length) quote.push(line.replace(/^> ?/, ""));
      else if (line.trim() || entry!.note.length) entry!.note.push(line);
    } else lines.push(line);
    if (entry && lines === quote) entry.quote = quote.join("\n");
  }
  close();
  doc.head = trimLines(head);
  return doc;
}

function write(doc: Doc): string {
  let out = "# Review\n";
  if (doc.head) out += `\n${doc.head}\n`;
  for (const e of doc.entries) {
    out += `\n## ${e.hash}\n`;
    if (e.quote) out += `\n${e.quote.split("\n").map((l) => `> ${l}`).join("\n")}\n`;
    if (trimLines(e.note)) out += `\n${trimLines(e.note)}\n`;
    for (const k of CATEGORIES) if (e.findings[k]) out += `\n### ${HEADING[k]}\n\n${escape(e.findings[k]!)}\n`;
    for (const x of e.extra) out += `\n### ${x.heading}\n${x.body ? `\n${x.body}\n` : ""}`;
  }
  for (const r of doc.rest) out += `\n${trimLines(r)}\n`;
  return out;
}

const plain = (e: Full): Entry => ({ hash: e.hash, quote: e.quote, findings: e.findings });

export function parseReview(text: string): Entry[] {
  return parse(text).entries.map(plain);
}

// One step's changed categories into the file; order is every step's deep link in deck order.
export function applyEdit(text: string, edit: Edit, order: string[]): string {
  const doc = parse(text);
  let e = doc.entries.find((x) => x.hash === edit.hash);
  if (!e) doc.entries.push((e = { hash: edit.hash, quote: "", findings: {}, note: [], extra: [] }));
  e.quote = edit.quote;
  for (const k of CATEGORIES) {
    if (!(k in edit.set)) continue;
    const v = (edit.set[k] ?? "").trim();
    if (v) e.findings[k] = v;
    else delete e.findings[k];
  }
  doc.entries = doc.entries.filter((x) => Object.keys(x.findings).length || x.extra.length || trimLines(x.note));
  const at = (h: string) => (order.includes(h) ? order.indexOf(h) : Infinity);
  doc.entries.sort((a, b) => at(a.hash) - at(b.hash));
  return write(doc);
}

export function stepsWithFindings(text: string): number {
  return parseReview(text).filter((e) => Object.keys(e.findings).length).length;
}
