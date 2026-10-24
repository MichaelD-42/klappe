import { t } from "../strings";

// A compact, collapsible panel at the top-left, inside the scene padding while closed, so it never
// covers the media slot or the stage content. Clicks inside do not advance the deck.
// add() lists a problem raised later; the panel appears with the first one.
export function showProblems(ui: HTMLElement, problems: string[], lang: string): { add(problem: string): void } {
  let box: HTMLDetailsElement | undefined;
  const summary = document.createElement("summary");
  const ul = document.createElement("ul");
  const add = (p: string) => {
    if (!box) {
      box = document.createElement("details");
      box.className = "k-problems";
      box.setAttribute("aria-live", "assertive"); // role="alert" is not allowed on <details>
      box.dataset.noAdvance = "";
      box.append(summary, ul);
      ui.append(box);
    }
    ul.append(Object.assign(document.createElement("li"), { textContent: p }));
    summary.textContent = `${t("problems", lang)} (${ul.children.length})`;
  };
  problems.forEach(add);
  return { add };
}
