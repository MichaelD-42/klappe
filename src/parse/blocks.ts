import MarkdownIt from "markdown-it";

const md = new MarkdownIt();
type Token = ReturnType<typeof md.parse>[number];

export interface Block {
  type: "h1" | "h2" | "h3" | "paragraph" | "item" | "quote" | "fence";
  text: string;
  info?: string; // a fence's info string: "ts {1-2|4}"
  note?: string; // an item's nested quote: the note of its step
}

const clean = (s: string) => s.replace(/\r/g, "").trim();

// Paragraphs of a note: each inline token is one paragraph.
const paras = (ts: Token[]) => ts.filter((x) => x.type === "inline").map((x) => clean(x.content)).join("\n\n");

// Flattens top-level markdown into blocks; nested content joins into the parent's text, but a quote
// nested in a list item becomes that item's note.
export function blocks(src: string): Block[] {
  const toks = md.parse(src.replace(/\r\n?/g, "\n"), {});
  const out: Block[] = [];
  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    if (t.type === "fence" && t.level === 0) {
      out.push({ type: "fence", text: t.content, info: t.info });
      i++;
      continue;
    }
    if (t.level !== 0 || t.nesting !== 1) {
      i++;
      continue;
    }
    let j = i + 1;
    while (!(toks[j].level === 0 && toks[j].nesting === -1)) j++;
    const inner = toks.slice(i + 1, j);
    const text = (ts: typeof inner) => clean(ts.filter((x) => x.type === "inline").map((x) => x.content).join(" "));
    if (t.type === "heading_open") out.push({ type: t.tag as "h1", text: text(inner) });
    else if (t.type === "paragraph_open") out.push({ type: "paragraph", text: text(inner) });
    else if (t.type === "blockquote_open") out.push({ type: "quote", text: paras(inner) });
    else if (t.type === "bullet_list_open" || t.type === "ordered_list_open") {
      let k = 0;
      while (k < inner.length) {
        if (inner[k].type === "list_item_open" && inner[k].level === 1) {
          let e = k + 1;
          while (!(inner[e].type === "list_item_close" && inner[e].level === 1)) e++;
          const body = inner.slice(k + 1, e);
          const q = body.findIndex((x) => x.type === "blockquote_open");
          const qe = q < 0 ? -1 : body.findIndex((x, n) => n > q && x.type === "blockquote_close" && x.level === body[q].level);
          const note = q < 0 ? "" : paras(body.slice(q + 1, qe));
          const rest = q < 0 ? body : [...body.slice(0, q), ...body.slice(qe + 1)];
          out.push({ type: "item", text: text(rest), ...(note ? { note } : {}) });
          k = e;
        }
        k++;
      }
    }
    i = j + 1;
  }
  return out;
}
