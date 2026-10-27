import { parseGroups } from "../fx/code";
import type { Part, SceneDoc, StepDoc } from "../types";
import { blocks } from "./blocks";
import { idFromFolder } from "./ids";

// [label](href "title") or ![alt](href "title"), in a list item's raw inline Markdown.
const LINK = /(!?)\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)/g;
const VIDEO = /^(?:https?:)?\/\/(?:[\w-]+\.)*(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com)(?:[/?#]|$)|\.(?:mp4|webm)(?:[?#].*)?$/i;
const CHART = /^(?:\.\/)?data\/[^/?#]+\.(?:csv|json)$/i;
const GROUPS = /^\{([\d,\- |]+)\}$/;
const AGENDA = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s+(.+?)\s*(←)?$/;
const CHECK = /^\[([ xX])\]\s+/;

// The first image, video or chart link in a step. Its link shows as its label; other links stay as written.
// An image after a video link is the video's offline fallback and does not show in the text.
function withMedia(text: string): StepDoc {
  let media: StepDoc["media"];
  const shown = text.replace(LINK, (all, bang: string, alt: string, href: string, title?: string) => {
    if (bang && media?.kind === "video" && !media.fallback) return (media.fallback = href), "";
    const kind = bang ? "image" : VIDEO.test(href) ? "video" : CHART.test(href) ? "chart" : undefined;
    if (!kind || media) return all;
    media = { kind, href, alt, ...(title === undefined ? {} : { title }) };
    return alt;
  });
  return { text: shown.trim(), notes: "", kind: "step", ...(media ? { media } : {}) };
}

export function parseScene(md: string, folder: string): { scene: SceneDoc; problems: string[] } {
  const problems: string[] = [];
  const { id, order } = idFromFolder(folder);
  let title = "";
  let notes = "";
  const steps: StepDoc[] = [];
  const bs = blocks(md);
  let fence: SceneDoc["fence"];
  let parts: Part[] = []; // the fence's parts, matched in order to the items after it
  let fenceAt = 0; // where its unmatched parts go: after the last matched item
  // Only time-range items: one agenda step.
  const items = bs.filter((b) => b.type === "item");
  const rows = items.map((b) => AGENDA.exec(b.text));
  const agenda = rows.every(Boolean) && rows.length > 0;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (b.type === "h2" && !title) title = b.text;
    else if (b.type === "fence") {
      if (fence) {
        problems.push(`${folder}/scene.md: one code, console or chat block per scene`);
        continue;
      }
      const [lang = "", ...rest] = (b.info ?? "").trim().split(/\s+/);
      const src = b.text.replace(/\n$/, "");
      const g = GROUPS.exec(rest.join(" "));
      fence = { lang, src, groups: g ? parseGroups(g[1]) : [[]] };
      if (lang === "console") {
        const n = src.split("\n").filter((l) => l.startsWith("$ ")).length;
        if (!n) problems.push(`${folder}/scene.md: console block has no "$ " command`);
        parts = Array.from({ length: n }, (_, command) => ({ kind: "console", command }));
      } else if (lang === "chat") {
        const n = src.split("\n").filter((l) => l.trim()).length;
        if (!n) problems.push(`${folder}/scene.md: chat block has no message`);
        parts = Array.from({ length: n }, (_, message) => ({ kind: "chat", message }));
      } else parts = fence.groups.map((_, group) => ({ kind: "code", group }));
      fenceAt = steps.length;
    } else if (b.type === "item" && agenda) {
      if (b !== items[0]) continue;
      const all = rows.map((r) => ({ from: r![1], to: r![2], title: r![3], current: !!r![4] }));
      steps.push({ text: all.map((r) => r.title).join(", "), notes: "", kind: "step", part: { kind: "agenda", rows: all } });
    } else if (b.type === "item" && parts.length) {
      steps.push({ ...withMedia(b.text), part: parts.shift() });
      fenceAt = steps.length;
    } else if (b.type === "item") {
      const box = CHECK.exec(b.text);
      if (box) steps.push({ ...withMedia(b.text.slice(box[0].length)), part: { kind: "check", done: box[1] !== " " } });
      else steps.push(withMedia(b.text));
    }
    else if (b.type === "h3" && b.text.endsWith("?")) {
      if (bs[i + 1]?.type === "quote")
        problems.push(`${folder}/scene.md: a note sits between '### ${b.text}' and its answer; the answer is dropped`);
      const answer = bs[i + 1]?.type === "paragraph" ? bs[++i].text : "";
      const q = (kind: StepDoc["kind"], text: string): StepDoc => ({ text, notes: "", kind });
      steps.push(q("shout-enter", b.text), q("shout-fade", b.text), q("shout-answer", answer));
    } else if (b.type === "quote") {
      const add = (n: string) => (n ? `${n}\n\n${b.text}` : b.text); // several notes on one step stay, in order
      if (steps.length) steps[steps.length - 1].notes = add(steps[steps.length - 1].notes);
      else notes = add(notes);
    }
    if (b.type === "item" && b.note && steps.length) steps[steps.length - 1].notes = b.note;
  }
  // More groups or commands than items: the rest are steps with no text.
  steps.splice(fenceAt, 0, ...parts.map((part) => ({ text: "", notes: "", kind: "step" as const, part })));
  if (!title) problems.push(`${folder}/scene.md: missing ## title`);
  if (!steps.length) steps.push({ text: title, notes: "", kind: "step" });
  return { scene: { id, order, title, notes, steps, ...(fence ? { fence } : {}) }, problems };
}
