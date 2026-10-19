import type { Ctx, Rect, StepAdder } from "../types";

export interface ImageOpts {
  href: string; // as in the Markdown link: "media/x.png"
  alt: string;
  rect: Rect;
}
export interface VideoOpts {
  href: string; // a local "media/x.mp4", a direct link, or a YouTube or Vimeo link
  title: string;
  rect: Rect;
}

export function image(ctx: Ctx, opts: ImageOpts): { show: StepAdder } {
  throw new Error("image: not built yet");
}

export function video(ctx: Ctx, opts: VideoOpts): { show: StepAdder } {
  throw new Error("video: not built yet");
}
