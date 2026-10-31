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

// deck.md tempo: a factor on the step, camera and auto-hold times.
const TEMPO: Record<string, number> = { slow: 1.4, normal: 1, fast: 0.75 };
// deck.md frame: the stage size in scene px. A landscape frame keeps 1080 high, so text sizes mean the same.
const FRAMES: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "4:3": { w: 1440, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

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
  // CSS order: one value for all sides, [y, x], [top, x, bottom] or [top, right, bottom, left].
  const sa = data["safe-area"];
  const nums = (Array.isArray(sa) ? sa : [sa]).map(Number);
  const safeArea = sa === undefined ? undefined : nums.length >= 1 && nums.length <= 4 && nums.every((n) => n >= 0)
    ? ([nums[0], nums[1] ?? nums[0], nums[2] ?? nums[0], nums[3] ?? nums[1] ?? nums[0]] as [number, number, number, number])
    : undefined;
  if (sa !== undefined && !safeArea) problems.push("deck.md: safe-area needs 1 to 4 numbers of 0 or more, for example [48, 64]");
  const tempo = TEMPO[String(data.tempo ?? "normal")];
  if (tempo === undefined) problems.push("deck.md: tempo is slow, normal or fast");
  const frame = FRAMES[String(data.frame ?? "16:9")];
  if (!frame) problems.push("deck.md: frame is 16:9, 4:3, 1:1 or 9:16");
  return {
    meta: {
      title,
      lang: typeof data.lang === "string" ? data.lang : "en",
      theme,
      intensity,
      confidential: data.confidential === true,
      sharedCanvas,
      ...(safeArea && { safeArea }),
      frame: frame ?? FRAMES["16:9"],
      ...(typeof data.duration === "number" && data.duration > 0 && { duration: data.duration }),
      tempo: tempo ?? 1,
    },
    problems,
  };
}
