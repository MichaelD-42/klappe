import type { DeckMeta } from "../types";

// shortcut: no full YAML, upgrade to the 'yaml' package if decks need maps

function splitTop(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = ""; // the open quote character, while inside a quoted item
  let cur = "";
  for (const c of s) {
    if (quote) quote = c === quote ? "" : quote;
    else if (c === '"' || c === "'") quote = c;
    else if (c === "[") depth++;
    else if (c === "]") depth--;
    if (c === "," && depth === 0 && !quote) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}

function parseValue(raw: string): unknown {
  const v = raw.trim();
  if (v.startsWith("[") && v.endsWith("]")) return splitTop(v.slice(1, -1)).map(parseValue);
  const q = /^(["'])(.*)\1$/.exec(v);
  if (q) return q[2];
  if (v === "true") return true;
  if (v === "false") return false;
  if (v !== "" && !isNaN(Number(v))) return Number(v);
  return v;
}

export function parseFrontmatter(md: string): { data: Record<string, unknown>; body: string } {
  md = md.replace(/^\uFEFF/, "");
  const m = /^---\r?\n(?:([\s\S]*?)\r?\n)?---\r?\n?([\s\S]*)$/.exec(md);
  if (!m) return { data: {}, body: md };
  const data: Record<string, unknown> = {};
  for (const line of (m[1] ?? "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) data[line.slice(0, i).trim()] = parseValue(line.slice(i + 1));
  }
  return { data, body: m[2] };
}

export function toDeckMeta(data: Record<string, unknown>): { meta: DeckMeta; problems: string[] } {
  const problems: string[] = [];
  const title = typeof data.title === "string" ? data.title : "";
  if (!title) problems.push("deck.md: missing title");
  const theme = typeof data.theme === "string" && data.theme ? data.theme : "calm";
  const intensity = data.intensity === "bold" || data.intensity === "calm" ? data.intensity : theme === "bold" ? "bold" : "calm";
  const sc = Array.isArray(data["shared-canvas"]) ? (data["shared-canvas"] as unknown[]) : [];
  const mixed = sc.some(Array.isArray) && !sc.every(Array.isArray);
  if (mixed) problems.push("deck.md: shared-canvas mixes ids and lists; use [a, b] or [[a, b], [c, d]]");
  const sharedCanvas = (mixed ? [] : sc.every(Array.isArray) ? sc : sc.length ? [sc] : []).map((g) =>
    (g as unknown[]).map(String),
  );
  return {
    meta: {
      title,
      lang: typeof data.lang === "string" ? data.lang : "en",
      theme,
      intensity,
      confidential: data.confidential === true,
      sharedCanvas,
    },
    problems,
  };
}
