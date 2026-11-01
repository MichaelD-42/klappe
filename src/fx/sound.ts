import { gsap } from "gsap";
import type { Ctx, Deck, StepAdder } from "../types";
import { STEP_LABEL } from "./media";

// Sound, opt-in per deck (deck.md sound: true): a cue on a step and a music bed under a section. Like video, it starts
// only on a forward play, never on a seek, jump or step back, so seek still equals play on screen; nothing on the
// timeline depends on it. Silent in the self-test and in klappe video, and while muted (M).
let allowed = false;
let muted = false;
let bed: HTMLAudioElement | undefined; // the music bed of the section on screen, playing unless muted

const audible = () => allowed && !muted;
const audio = (url: string, volume = 1, loop = false) =>
  Object.assign(new Audio(url), { preload: "auto", loop, volume: Math.max(0, Math.min(1, volume)) });
const media = (files: Ctx["files"] | undefined, href: string) => files?.media[href.replace(/^\.\//, "")];

// main.ts: on for a deck with sound: true, unless wall-clock motion holds still.
export function allowSound(on: boolean): void {
  allowed = on;
}

// M: mutes, pausing the bed; unmuted, the bed goes on where it was.
export function toggleMute(): void {
  muted = !muted;
  if (muted) bed?.pause();
  else if (allowed) void bed?.play().catch(() => {});
}

export interface CueOpts {
  href: string; // a sound file in media/: "media/whoosh.mp3"
  volume?: number; // 0..1, default 1
  at?: "step"; // with the step's start (a whoosh with the camera flight in); default: where the cue is added
}

// A short sound on a step: it plays once when a forward play of its step reaches the point where it was added.
// Add it before impactShake in the same step for a hit as the shake starts.
export function cue(ctx: Ctx, opts: CueOpts): StepAdder {
  const url = media(ctx.files, opts.href);
  if (url === undefined) ctx.problem(`cue: no file ${opts.href}`);
  const a = url === undefined ? undefined : audio(url, opts.volume);
  return (tl) => {
    const at = opts.at === "step" ? (tl.labels[STEP_LABEL] ?? tl.duration()) : tl.duration();
    if (!a) return;
    let wait: (() => void) | undefined;
    const stop = () => (wait && gsap.ticker.remove(wait), (wait = undefined));
    ctx.onStep(({ play, span }) => {
      stop();
      if (!play || !span || !(span[0] <= at && at < span[1]) || !audible()) return;
      // The step's tweens may wait for a transition: play when the timeline gets there.
      wait = () => {
        if (tl.time() < at) return;
        stop();
        if (!audible()) return;
        a.currentTime = 0;
        void a.play().catch(() => {}); // blocked or a broken file: silence, never a stop
      };
      gsap.ticker.add(wait);
    });
  };
}

// The music beds of section.ts music, as a step listener: a forward step in a section with a bed starts it from
// the top if it is not playing; a step to a section without it fades it out. A seek never starts one.
export function musicBeds(deck: Deck): { problems: string[]; onStep: (e: { play: boolean; scene: string | null }) => void } {
  const problems: string[] = [];
  const of = new Map<string, HTMLAudioElement>();
  for (const s of deck.sections) {
    const m = s.module?.music;
    if (!m) continue;
    const url = media(deck.files, m.href);
    if (url === undefined) {
      problems.push(`section ${s.id}: music: no file ${m.href}`);
      continue;
    }
    const a = audio(url, m.volume, true);
    for (const sc of s.scenes) of.set(sc.id, a);
  }
  return {
    problems,
    onStep({ play, scene }) {
      const want = scene === null ? undefined : of.get(scene);
      if (bed && bed !== want) {
        const old = bed;
        const v = old.volume;
        gsap.to(old, { volume: 0, duration: 0.5, onComplete: () => (old.pause(), (old.volume = v)) });
        bed = undefined;
      }
      if (want && !bed && play && audible()) {
        bed = want;
        want.currentTime = 0;
        void want.play().catch(() => {});
      }
    },
  };
}
