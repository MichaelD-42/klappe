// The timing estimate behind `klappe outline` and the speaker view's rehearsal: notes at a speaking pace.
const WPM = 130; // speaking pace for the notes
const MIN_STEP_S = 15; // a step without a note still takes a moment to show and say

export const words = (s: string) => (s.match(/\S+/g) ?? []).length;
// shortcut: notes at a fixed pace, every step at least MIN_STEP_S; exercises and timers are not counted. Upgrade
// when a deck needs per-scene durations.
export const stepSeconds = (notes: string) => Math.max(MIN_STEP_S, (words(notes) / WPM) * 60);
export const noteSeconds = (notes: string) => (words(notes) / WPM) * 60;
// A scene's planned time: its own notes and each of its steps.
export const sceneSeconds = (scene: { notes: string; steps: { notes: string }[] }) =>
  noteSeconds(scene.notes) + scene.steps.reduce((n, st) => n + stepSeconds(st.notes), 0);
