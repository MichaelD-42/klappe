import { t } from "../strings";

// A compact, collapsible panel at the top-left, inside the scene padding while closed, so it never
// covers the media slot or the stage content. Clicks inside do not advance the deck.
export function showProblems(ui: HTMLElement, problems: string[], lang: string): void {
  if (!problems.length) return;
  const box = document.createElement("details");
  box.className = "k-problems";
  box.setAttribute("role", "alert");
  box.dataset.noAdvance = "";
  const summary = document.createElement("summary");
  summary.textContent = `${t("problems", lang)} (${problems.length})`;
  const ul = document.createElement("ul");
  for (const p of problems) ul.append(Object.assign(document.createElement("li"), { textContent: p }));
  box.append(summary, ul);
  ui.append(box);
}
