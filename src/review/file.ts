// review.md: the findings of a review, one entry per step, written by the review window through the dev server
// and worked off by Claude Code. Hand edits are kept: text before the first entry, a ## that is not a deep link,
// and an unknown ### heading in an entry. Claude marks a finding fixed with a #### Fixed note under it; the owner
// approves it (it goes) or reopens it, which adds a #### Reopened note. The last of these notes is its state.

export type Category = "content" | "storytelling" | "visuals";
export const CATEGORIES: Category[] = ["content", "storytelling", "visuals"];
const HEADING: Record<Category, string> = { content: "Content", storytelling: "Storytelling", visuals: "Visuals" };

export interface Entry {
  hash: string;
  quote: string;
  findings: Partial<Record<Category, string>>;
  fixed?: Partial<Record<Category, string>>; // Claude's note on each finding waiting for approval
}
export interface Edit {
  hash: string;
  quote: string;
  set: Partial<Record<Category, string>>;
  approve?: Category[]; // fixed findings the owner takes as done
  reopen?: Partial<Record<Category, string>>; // fixed findings sent back, with the owner's note
}

type Log = { kind: "Fixed" | "Reopened"; body: string }[];
// note: hand-written text between the quote and the first ###; extra: ### sections that are not a category;
// log: each finding's Fixed and Reopened notes, oldest first.
type Full = Entry & { note: string[]; extra: { heading: string; body: string }[]; log: Partial<Record<Category, Log>> };
interface Doc {
  head: string; // text before the first step, a ## that is not a deep link included
  entries: Full[];
}

// A step's deep link: ids are free text after a folder's number ("einführung", "v1.2", "q&a"), never / or space.
export const STEP_HASH = /^#\/[^/\s]+\/[^/\s]+\/\d+$/;
const DEEP_LINK = new RegExp(`^## (${STEP_HASH.source.slice(1, -1)})\\s*$`);
const trimLines = (lines: string[]) => lines.join("\n").replace(/^\s*\n|\s+$/g, "");
// A finding line that could read as a heading (or as an escape) gets a backslash in front; reading drops only that.
const escape = (text: string) => text.replace(/^(?=[#\\])/gm, "\\");
const unescape = (text: string) => text.replace(/^\\(?=[#\\])/gm, "");
const LOG = /^#### (Fixed|Reopened)\s*$/;
const isFixed = (log: Log | undefined) => log?.at(-1)?.kind === "Fixed";

function parse(text: string): Doc {
  const doc: Doc = { head: "", entries: [] };
  const head: string[] = [];
  let lines: string[] = head; // where the next line goes
  let entry: Full | undefined;
  let quote: string[] = [];
  let section: { heading: string; lines: string[] } | undefined;
  const close = () => {
    if (section && entry) {
      const body = trimLines(section.lines);
      const k = CATEGORIES.find((c) => HEADING[c] === section!.heading);
      if (!k) entry.extra.push({ heading: section.heading, body });
      else {
        const parts: string[][] = [[]];
        const log: Log = [];
        for (const l of section.lines) {
          const m = LOG.exec(l);
          if (!m) parts.at(-1)!.push(l);
          else {
            log.push({ kind: m[1] as Log[number]["kind"], body: "" });
            parts.push([]);
          }
        }
        log.forEach((x, i) => (x.body = unescape(trimLines(parts[i + 1]))));
        const text = trimLines(parts[0]);
        if (text) entry.findings[k] = unescape(text); // a heading with nothing under it is no finding
        if (text && log.length) entry.log[k] = log;
      }
    }
    section = undefined;
  };
  for (const line of text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n")) {
    // Only a deep link starts a step: any other ## line, typed into a finding by hand, stays where it is.
    const m = DEEP_LINK.exec(line);
    if (m) {
      close();
      entry = { hash: m[1], quote: "", findings: {}, note: [], extra: [], log: {} };
      doc.entries.push(entry);
      quote = [];
      lines = quote;
    } else if (entry && line.startsWith("### ")) {
      close();
      section = { heading: line.slice(4).trim(), lines: [] };
      lines = section.lines;
    } else if (lines === head && head.every((l) => !l.trim()) && /^# Review\s*$/.test(line)) {
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
    for (const k of CATEGORIES) {
      if (!e.findings[k]) continue;
      out += `\n### ${HEADING[k]}\n\n${escape(e.findings[k]!)}\n`;
      for (const x of e.log[k] ?? []) out += `\n#### ${x.kind}\n${x.body ? `\n${escape(x.body)}\n` : ""}`;
    }
    for (const x of e.extra) out += `\n### ${x.heading}\n${x.body ? `\n${x.body}\n` : ""}`;
  }
  return out;
}

const plain = (e: Full): Entry => {
  const fixed: Entry["fixed"] = {};
  for (const k of CATEGORIES) if (isFixed(e.log[k])) fixed[k] = e.log[k]!.at(-1)!.body;
  return { hash: e.hash, quote: e.quote, findings: e.findings, ...(Object.keys(fixed).length && { fixed }) };
};

export function parseReview(text: string): Entry[] {
  return parse(text).entries.map(plain);
}

// One step's changed categories into the file; order is every step's deep link in deck order.
export function applyEdit(text: string, edit: Edit, order: string[]): string {
  const doc = parse(text);
  let e = doc.entries.find((x) => x.hash === edit.hash);
  if (!e) doc.entries.push((e = { hash: edit.hash, quote: "", findings: {}, note: [], extra: [], log: {} }));
  e.quote = edit.quote;
  const drop = (k: Category) => {
    delete e!.findings[k];
    delete e!.log[k];
  };
  for (const k of CATEGORIES) {
    if (!(k in edit.set)) continue;
    const v = (edit.set[k] ?? "").replace(/^(\s*\n)+/, "").trimEnd(); // the first line's indent is part of it
    if (v.trim()) e.findings[k] = v;
    else drop(k);
  }
  // Only a finding still fixed on disk is approved or reopened: Claude may have touched it since the window read it.
  for (const k of edit.approve ?? []) if (isFixed(e.log[k])) drop(k);
  for (const [k, note] of Object.entries(edit.reopen ?? {}) as [Category, string][])
    if (isFixed(e.log[k])) e.log[k]!.push({ kind: "Reopened", body: note.trim() });
  doc.entries = doc.entries.filter((x) => Object.keys(x.findings).length || x.extra.length || trimLines(x.note));
  const at = (h: string) => (order.includes(h) ? order.indexOf(h) : Infinity);
  doc.entries.sort((a, b) => at(a.hash) - at(b.hash));
  return write(doc);
}

// Steps with a finding still open, and findings fixed and waiting for the owner's approval.
export function stepsWithFindings(text: string): number {
  return parseReview(text).filter((e) => Object.keys(e.findings).some((k) => !e.fixed?.[k as Category])).length;
}
export function waitingForApproval(text: string): number {
  return parseReview(text).reduce((n, e) => n + Object.keys(e.fixed ?? {}).length, 0);
}
