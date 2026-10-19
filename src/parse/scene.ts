import type { SceneDoc, StepDoc } from "../types";
import { blocks } from "./blocks";
import { idFromFolder } from "./ids";

// [label](href "title") or ![alt](href "title"), in a list item's raw inline Markdown.
const LINK = /(!?)\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)/g;
const VIDEO = /^(?:https?:)?\/\/(?:[\w-]+\.)*(?:youtube\.com|youtu\.be|vimeo\.com)(?:[/?#]|$)|\.(?:mp4|webm)(?:[?#].*)?$/i;
const CHART = /^(?:\.\/)?data\/[^/?#]+\.(?:csv|json)$/i;

// The first image, video or chart link in a step. Its link shows as its label; other links stay as written.
function withMedia(text: string): StepDoc {
  let media: StepDoc["media"];
  const shown = text.replace(LINK, (all, bang: string, alt: string, href: string, title?: string) => {
    const kind = bang ? "image" : VIDEO.test(href) ? "video" : CHART.test(href) ? "chart" : undefined;
    if (!kind || media) return all;
    media = { kind, href, alt, ...(title === undefined ? {} : { title }) };
    return alt;
  });
  return { text: shown, notes: "", kind: "step", ...(media ? { media } : {}) };
}

export function parseScene(md: string, folder: string): { scene: SceneDoc; problems: string[] } {
  const problems: string[] = [];
  const { id, order } = idFromFolder(folder);
  let title = "";
  let notes = "";
  const steps: StepDoc[] = [];
  const bs = blocks(md);
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (b.type === "h2" && !title) title = b.text;
    else if (b.type === "item") steps.push(withMedia(b.text));
    else if (b.type === "h3" && b.text.endsWith("?")) {
      if (bs[i + 1]?.type === "quote") problems.push(`${folder}/scene.md: a note sits between '### ${b.text}' and its answer; the answer is dropped`);
      const answer =bs[i + 1]?.type === "paragraph" ? bs[++i].text : "";
      const q = (kind: StepDoc["kind"], text: string): StepDoc => ({ text, notes: "", kind });
      steps.push(q("shout-enter", b.text), q("shout-hold", b.text), q("shout-fade", b.text), q("shout-answer", answer));
    } else if (b.type === "quote") {
      if (steps.length) steps[steps.length - 1].notes = b.text;
      else notes = b.text;
    }
  }
  if (!title) problems.push(`${folder}/scene.md: missing ## title`);
  if (!steps.length) steps.push({ text: title, notes: "", kind: "step" });
  return { scene: { id, order, title, notes, steps }, problems };
}
