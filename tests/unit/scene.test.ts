import { describe, it, expect } from "vitest";
import { parseScene } from "../../src/parse/scene";
import { parseSection } from "../../src/parse/section";

// Verbatim from docs/storyteller-init-prompt.md, section 4, Example B.
const CLARIFICATION_MD = `## Clarification

- The camera follows the stream to Clarification.
- A person picks up the stack of open questions and walks to the customer.
- Questions and answers appear as speech bubbles.
- The stack of questions shrinks to zero.
- The person walks back. The stream moves on.

### What is still left for humans to do?

The conversations that build trust.
`;

describe("parseScene", () => {
  it("parses the Clarification scene", () => {
    const { scene, problems } = parseScene(CLARIFICATION_MD, "30-clarification");
    expect(problems).toEqual([]);
    expect(scene.id).toBe("clarification");
    expect(scene.order).toBe(30);
    expect(scene.title).toBe("Clarification");
    expect(scene.steps.map((s) => s.kind)).toEqual([
      "step", "step", "step", "step", "step",
      "shout-enter", "shout-fade", "shout-answer",
    ]);
    expect(scene.steps[0].text).toBe("The camera follows the stream to Clarification.");
    expect(scene.steps[5].text).toBe("What is still left for humans to do?");
    expect(scene.steps[7].text).toBe("The conversations that build trust.");
  });
  it("puts notes on the step above, or on the scene", () => {
    expect(parseScene("## A\n\n- one\n\n> say this\n", "10-a").scene.steps[0].notes).toBe("say this");
    expect(parseScene("## A\n\n> intro\n\n- one\n", "10-a").scene.notes).toBe("intro");
  });
  it("takes a quote nested in an item as that step's note, paragraphs kept", () => {
    const { steps } = parseScene("## A\n\n- one\n\n  > say this\n  >\n  > then that\n\n- two\n", "10-a").scene;
    expect(steps.map((s) => [s.text, s.notes])).toEqual([["one", "say this\n\nthen that"], ["two", ""]]);
  });
  it("reads an ordered list as steps", () => {
    expect(parseScene("## A\n\n1. one\n2. two\n", "10-a").scene.steps.map((s) => s.text)).toEqual(["one", "two"]);
  });
  it("joins nested list content into text", () => {
    expect(parseScene("## A\n\n- one\n  - two\n", "10-a").scene.steps[0].text).toBe("one two");
  });
  it("gives a scene with no steps one step with the title", () => {
    expect(parseScene("## Solo\n", "10-solo").scene.steps).toEqual([
      { text: "Solo", notes: "", kind: "step" },
    ]);
  });
  it("reports a missing title and handles CRLF", () => {
    expect(parseScene("- x\n", "10-a").problems).toContain("10-a/scene.md: missing ## title");
    const { scene } = parseScene("## A\r\n\r\n- one\r\n- two\r\n", "10-a");
    expect(scene.steps.map((s) => s.text)).toEqual(["one", "two"]);
  });
});

describe("parseSection", () => {
  it("reads title and notes", () => {
    const { section, problems } = parseSection("# Intro\n\n> hello\r\n", "10-intro");
    expect(problems).toEqual([]);
    expect(section).toEqual({ id: "intro", order: 10, title: "Intro", notes: "hello" });
  });
  it("reports a missing title", () => {
    expect(parseSection("text", "10-x").problems).toContain("10-x/section.md: missing # title");
  });
});

describe("parseScene media", () => {
  const media = (item: string) => parseScene(`## A\n\n- ${item}\n`, "10-a").scene.steps[0];
  it("detects an image", () => {
    expect(media("![A desk](media/desk.png)").media).toEqual({ kind: "image", href: "media/desk.png", alt: "A desk" });
  });
  it("keeps an image title", () => {
    expect(media('![A desk](media/desk.png "An engineer at a desk")').media).toEqual({
      kind: "image", href: "media/desk.png", alt: "A desk", title: "An engineer at a desk",
    });
  });
  it("detects video links", () => {
    for (const href of [
      "https://www.youtube.com/watch?v=x", "https://youtu.be/x", "https://vimeo.com/1",
      "media/clip.mp4", "https://example.com/a.webm?t=3", "https://www.youtube-nocookie.com/embed/x",
    ])
      expect(media(`[Demo](${href})`).media, href).toEqual({ kind: "video", href, alt: "Demo" });
  });
  it("detects chart data links", () => {
    expect(media("[Sales](data/sales.csv)").media).toEqual({ kind: "chart", href: "data/sales.csv", alt: "Sales" });
    expect(media("[Sales](data/sales.json)").media?.kind).toBe("chart");
  });
  it("shows the link label as the step text", () => {
    expect(media("See [Sales](data/sales.csv) here").text).toBe("See Sales here");
  });
  it("takes an image right after a video link in the same step as its fallback", () => {
    const s = media("[Talk](https://youtu.be/x)\n  ![Still](media/still.jpeg)");
    expect(s.media).toEqual({ kind: "video", href: "https://youtu.be/x", alt: "Talk", fallback: "media/still.jpeg" });
    expect(s.text).toBe("Talk");
  });
  it("leaves a plain link as text", () => {
    const s = media("[klappe](https://example.com/docs)");
    expect(s.media).toBeUndefined();
    expect(s.text).toBe("[klappe](https://example.com/docs)");
  });
});

describe("question followed by a note", () => {
  it("reports a problem when a blockquote sits between the question and its answer", () => {
    const { problems, scene } = parseScene("## T\n\n### Why?\n\n> a note\n\nThe answer.\n", "10-t");
    expect(problems).toEqual([expect.stringContaining("10-t/scene.md: a note sits between '### Why?'")]);
    expect(scene.steps.at(-1)?.text).toBe("");
  });
});

describe("notes, edge cases", () => {
  it("keeps every note of a step, in order", () => {
    expect(parseScene("## A\n\n- one\n\n> first\n\n> second\n", "10-a").scene.steps[0].notes).toBe("first\n\nsecond");
    expect(parseSection("# S\n\n> first\n\n> second\n", "10-s").section.notes).toBe("first\n\nsecond");
  });
  it("takes a quote nested in a list item as that step's note", () => {
    const { steps } = parseScene("## A\n\n- one\n\n  > say this\n- two\n", "10-a").scene;
    expect(steps.map((s) => [s.text, s.notes])).toEqual([["one", "say this"], ["two", ""]]);
  });
  it("keeps the paragraphs of a note apart", () => {
    expect(parseScene("## A\n\n- one\n\n> first line\n>\n> second paragraph\n", "10-a").scene.steps[0].notes).toBe(
      "first line\n\nsecond paragraph",
    );
  });
});
