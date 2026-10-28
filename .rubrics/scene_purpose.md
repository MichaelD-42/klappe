---
dimension: scene_purpose
version: 1
applies_to: [deck]
reviewer: content
levels: [clear, weak, unclear, unassessable]
rule-clear: [none, pass]
rule-weak: [Minor, owner]
rule-unclear: [Important, owner]
rule-unassessable: [Minor, owner]
---

# Scene purpose

Judge each scene the diff adds or changes as someone in the room would see it: the deck's audience, who has not read the storyboard. Matching the storyboard is not enough; a scene can match it word for word and still make no point.

Read the scene's `scene.md`, its speaker notes and the screenshots. Ask: after this scene, what does the room know or believe that it did not before?

## clear

You can say the scene's one point in one sentence, and the steps build toward it. Nothing on screen repeats an earlier scene or another day.
Evidence: the point in one sentence.

## weak

The point is there but buried: the scene repeats something the deck already said, a step adds nothing to the point, or the room needs the speaker notes to get it. A cut or a merge would lose little.
Evidence: the point as you read it, and the step or the earlier scene that weakens it.

## unclear

You cannot say what the scene is for, or you can only describe what it shows, not what it means. Owners say this as "I do not understand what this section is about" or "remove, it adds nothing".
Evidence: what the scene shows, and why that is not a point.

## unassessable

No screenshot and no `scene.md` text reached you for the scene.
Evidence: say what is missing.

## Output

One line per changed scene, after the `VERDICT:` line:
`RUBRIC scene_purpose: <level> — <scene id> — <evidence>`

The owner decides what to cut. Do not propose a rewrite; say what is missing.
