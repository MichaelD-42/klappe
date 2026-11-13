// Translations: decks/<id>/lang/<code>.md maps the source deck's texts to another language. A ## heading names
// a scope (deck, a section id, or <section>/<scene>), each > quote is a source text and the text under it is its
// translation. A <!-- was: … --> line between them marks a translation written for an older source text.
import type { Deck } from "../types";

export interface LangEntry {
  source: string;
  text: string;
  was?: string;
}
export type Lang = Map<string, Map<string, LangEntry>>; // scope → key → entry

// Keys compare with runs of whitespace as one space: a reflowed note still matches.
export const key = (s: string) => s.replace(/\s+/g, " ").trim();
const WAS = /^<!-- was: ([\s\S]*?) -->$/;

export function parseLang(md: string): Lang {
  const lang: Lang = new Map();
  let scope: Map<string, LangEntry> | undefined;
  let entry: { quote: string[]; ended?: boolean; was?: string; text: string[] } | undefined;
  const close = () => {
    if (scope && entry?.quote.length) {
      const source = entry.quote.join("\n").trim();
      scope.set(key(source), { source, text: entry.text.join("\n").trim(), ...(entry.was !== undefined && { was: entry.was }) });
    }
    entry = undefined;
  };
  for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
    const h = /^## (.+?)\s*$/.exec(line);
    if (h) {
      close();
      scope = lang.get(h[1]) ?? new Map();
      lang.set(h[1], scope);
    } else if (line.startsWith(">")) {
      if (entry?.ended) close(); // a line that is not a quote ended the last one: this is the next text
      entry ??= { quote: [], text: [] };
      entry.quote.push(line.replace(/^> ?/, ""));
    } else if (entry) {
      entry.ended = true;
      if (WAS.test(line.trim()) && !entry.text.some((l) => l.trim())) entry.was = WAS.exec(line.trim())![1];
      else entry.text.push(line);
    }
  }
  close();
  return lang;
}

// Every translatable text of the deck through fn(scope, text), in deck order; fn's return value replaces it.
export function eachText(deck: Deck, fn: (scope: string, text: string) => string): void {
  const tr = (scope: string, s: string) => (s.trim() ? fn(scope, s) : s);
  deck.meta.title = tr("deck", deck.meta.title);
  for (const sec of deck.sections) {
    sec.title = tr(sec.id, sec.title);
    sec.notes = tr(sec.id, sec.notes);
    for (const sc of sec.scenes) {
      const at = `${sec.id}/${sc.id}`;
      sc.title = tr(at, sc.title);
      sc.notes = tr(at, sc.notes);
      if (sc.table) {
        sc.table.columns = sc.table.columns.map((c) => tr(at, c));
        for (const r of sc.table.rows) {
          r.label = tr(at, r.label);
          r.cells = r.cells.map((c) => (typeof c === "string" ? tr(at, c) : c));
        }
      }
      if (sc.fence?.lang === "chat") sc.fence.src = sc.fence.src.split("\n").map((l) => tr(at, l)).join("\n");
      for (const st of sc.steps) {
        if (st.part?.kind === "agenda") {
          for (const r of st.part.rows) r.title = tr(at, r.title);
          st.text = st.part.rows.map((r) => r.title).join(", "); // as parseScene joins them
        } else if (st.part?.kind === "compare") st.text = sc.table!.rows[st.part.row].label;
        else st.text = tr(at, st.text);
        st.notes = tr(at, st.notes);
        if (st.media) {
          st.media.alt = tr(at, st.media.alt);
          if (st.media.title) st.media.title = tr(at, st.media.title);
        }
      }
    }
  }
}

// The source texts by scope, each once per scope, in deck order: what a lang file translates.
export function langTexts(deck: Deck): [string, string][] {
  const seen = new Set<string>();
  const out: [string, string][] = [];
  eachText(deck, (scope, s) => {
    const k = `${scope}\n${key(s)}`;
    if (!seen.has(k)) seen.add(k), out.push([scope, s]);
    return s;
  });
  return out;
}

// Translates the deck in place into code. Returns the deck problems; warnings and translate go onto the deck.
export function translateDeck(deck: Deck, code: string, md: string): string[] {
  const lang = parseLang(md);
  const problems: string[] = [];
  const scopes = new Set(["deck", ...deck.sections.flatMap((s) => [s.id, ...s.scenes.map((c) => `${s.id}/${c.id}`)])]);
  for (const s of lang.keys()) if (!scopes.has(s)) problems.push(`lang/${code}.md: '## ${s}' names no section or scene`);
  const warnings: string[] = [];
  const where = (scope: string) => (scope === "deck" ? "deck.md" : `#/${scope}`);
  const said = new Set<string>();
  const warn = (w: string) => (said.has(w) ? undefined : (said.add(w), warnings.push(w)));
  const find = (scope: string, s: string) => lang.get(scope)?.get(key(s));
  const use = (scope: string, s: string, e: LangEntry | undefined) => {
    const short = (x: string) => JSON.stringify(x.length > 60 ? `${x.slice(0, 57)}...` : x);
    if (!e?.text) return warn(`${where(scope)}: no ${code} translation for ${short(s)}`), undefined;
    if (e.was !== undefined) warn(`${where(scope)}: stale ${code} translation for ${short(s)} (it was written for ${short(e.was)})`);
    return e.text;
  };
  eachText(deck, (scope, s) => use(scope, s, find(scope, s)) ?? s);
  deck.langWarnings = warnings;
  // For ctx.t: the first scope in chain that has the text; a miss is warned about on the first.
  deck.translate = (chain, s) => {
    if (!s.trim()) return s;
    const at = chain.find((c) => find(c, s)?.text) ?? chain[0];
    return use(at, s, find(at, s)) ?? s;
  };
  deck.meta.lang = code;
  return problems;
}

// lang/<code>.md for the texts, keeping what old already translates. A text whose source changed takes the
// translation of an old entry in its scope that matches no current text, in order, marked stale.
export function writeLang(code: string, old: string, texts: [string, string][]): string {
  const prev = parseLang(old);
  const current = new Set(texts.map(([s, x]) => `${s}\n${key(x)}`));
  const orphans = new Map([...prev].map(([s, m]) => [s, [...m.values()].filter((e) => e.text && !current.has(`${s}\n${key(e.source)}`))]));
  const quote = (s: string) => s.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n");
  let out = `# ${code}\n`;
  let scope = "";
  for (const [s, x] of texts) {
    if (s !== scope) out += `\n## ${(scope = s)}\n`;
    const kept = prev.get(s)?.get(key(x));
    const e = kept ?? (() => {
      const o = orphans.get(s)?.shift();
      return o && { source: x, text: o.text, was: o.was ?? o.source };
    })();
    out += `\n${quote(x)}\n`;
    if (e?.was !== undefined) out += `\n<!-- was: ${key(e.was)} -->\n`;
    if (e?.text) out += `\n${e.text}\n`;
  }
  return out;
}
