import { t } from "../strings";

export function showProblems(ui: HTMLElement, problems: string[], lang: string): void {
  if (!problems.length) return;
  const box = document.createElement("section");
  box.className = "k-problems";
  box.setAttribute("role", "alert");
  const h = document.createElement("h2");
  h.textContent = t("problems", lang);
  const ul = document.createElement("ul");
  for (const p of problems) ul.append(Object.assign(document.createElement("li"), { textContent: p }));
  box.append(h, ul);
  ui.append(box);
}
