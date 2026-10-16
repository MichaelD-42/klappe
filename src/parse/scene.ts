import type { SceneDoc, StepDoc } from "../types";
import { blocks } from "./blocks";
import { idFromFolder } from "./ids";

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
    else if (b.type === "item") steps.push({ text: b.text, notes: "", kind: "step" });
    else if (b.type === "h3" && b.text.endsWith("?")) {
      const answer = bs[i + 1]?.type === "paragraph" ? bs[++i].text : "";
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
