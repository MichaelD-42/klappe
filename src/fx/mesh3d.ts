import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx } from "../types";

export type Mood = "calm" | "curious" | "careful" | "insight" | "celebrating";
// Colour and seconds per turn of each mood (training storyboard, "Mood palette").
export const MOODS: Record<Mood, { color: string; turn: number }> = {
  calm: { color: "#009A9B", turn: 24 },
  curious: { color: "#2E86C1", turn: 16 },
  careful: { color: "#E8590C", turn: 32 },
  insight: { color: "#AB9759", turn: 20 },
  celebrating: { color: "#69DB7C", turn: 8 },
};
export interface Mesh3dOpts {
  x: number; // centre, scene-local
  y: number;
  size: number; // side of the square the mesh fills
  mood?: Mood; // default calm
  speed?: number; // seconds per turn; overrides the mood's
  density?: number; // dots, default 60
  seed?: number; // default 1
  start?: "mesh" | "dot"; // "dot": one pulsing dot, visible from load; show() grows the mesh out of it
}
type At = number | string;
export interface Mesh3dHandle {
  show(tl: gsap.core.Timeline, at?: At, opts?: { from?: { x: number; y: number } }): void;
  hide(tl: gsap.core.Timeline, at?: At): void;
  mood(tl: gsap.core.Timeline, name: Mood, at?: At): void;
  collapse(tl: gsap.core.Timeline, at?: At): void;
  destroy(): void;
}
export interface P3 {
  x: number;
  y: number;
  z: number;
}

const MAX_BACKING = 2560; // canvas side limit in device pixels (as swarm)
const LINK = 0.5; // link two dots closer than this, on the unit sphere
const PULSE = 1.6; // seconds per pulse of the single dot

// A seeded generator of numbers in [0, 1) (mulberry32): the same seed gives the same sequence.
export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn p by a about the y axis, then by b about the x axis.
export function rotate(p: P3, a: number, b: number): P3 {
  const x = p.x * Math.cos(a) + p.z * Math.sin(a);
  const z1 = -p.x * Math.sin(a) + p.z * Math.cos(a);
  return { x, y: p.y * Math.cos(b) - z1 * Math.sin(b), z: p.y * Math.sin(b) + z1 * Math.cos(b) };
}

// Perspective divide: x' = x·f/(f+z). s is the scale at that depth (near points are larger).
export function project(p: P3, f: number): { x: number; y: number; s: number } {
  const s = f / (f + p.z);
  return { x: p.x * s, y: p.y * s, s };
}

// Random life: on (fade in, hold, fade out), then off, then again. t in seconds, phase 0..1.
function life(t: number, period: number, phase: number): number {
  const u = (t / period + phase) % 1;
  return u < 0.15 ? u / 0.15 : u < 0.7 ? 1 : u < 0.85 ? (0.85 - u) / 0.15 : 0;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function mesh3d(ctx: Ctx, opts: Mesh3dOpts): Mesh3dHandle {
  const { x, y, size } = opts;
  const n = Math.max(1, opts.density ?? 60);
  const dotStart = opts.start === "dot";
  const reduced = !!ctx.reducedMotion;
  const r = rng(opts.seed ?? 1);

  // Dots on a shell of the unit sphere. Dot 0 is the one that stays after collapse.
  const pts: (P3 & { period: number; phase: number; fade: number })[] = [];
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rad = 0.75 + 0.25 * r();
    const q = Math.sqrt(1 - u * u) * rad;
    pts.push({ x: q * Math.cos(th), y: u * rad, z: q * Math.sin(th), period: 4 + 5 * r(), phase: r(), fade: 0.8 * r() });
  }
  // Rotation keeps distances, so the link set is fixed at build.
  const links: { a: number; b: number; period: number; phase: number }[] = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      if (Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y, pts[a].z - pts[b].z) < LINK)
        links.push({ a, b, period: 5 + 6 * r(), phase: r() });

  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-k-ignore", ""); // runs on its own ticker, outside the step timeline
  Object.assign(canvas.style, {
    position: "absolute",
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    pointerEvents: "none",
  });
  const cam = Math.min(1920 / ctx.rect.w, 1080 / ctx.rect.h);
  const scale = Math.min((globalThis.devicePixelRatio || 1) * cam, MAX_BACKING / size);
  canvas.width = canvas.height = Math.round(size * scale);
  ctx.html.append(canvas);
  gsap.set(canvas, { autoAlpha: dotStart ? 1 : 0 });
  const c2d = canvas.getContext("2d");

  // Step state, tweened by the timeline only, so a seek lands on the right look. The ticker reads it.
  let mood = MOODS[opts.mood ?? "calm"];
  let turn = opts.speed ?? mood.turn;
  const [r0, g0, b0] = gsap.utils.splitColor(mood.color) as number[];
  const st = { form: 0, collapse: 0, r: r0, g: g0, b: b0, turn, fx: 0, fy: 0 };

  const R = size * 0.45; // a dot on the unit sphere projects at most 1.06 R from the centre (F = 3 R), inside size / 2
  const F = 3 * R;
  const dotR = size / 70;
  let t = 0;
  let a = 0.6; // a tilted start pose, also the frozen pose under reduced motion
  let b = 0.4;
  let last = "";
  // Set from show/hide tween progress only (a seek lands right); no style read per frame.
  // shortcut: a mesh on a canvas the stepper hid keeps drawing; hide() it on scene exit if that costs.
  let visible = dotStart;

  const draw = () => {
    if (!c2d) return;
    if (!visible || (!dotStart && st.form === 0)) return;
    const sig = `${st.form}|${st.collapse}|${st.r}|${st.g}|${st.b}`;
    if (reduced && sig === last) return;
    last = sig;
    const spread = st.form * st.form * (3 - 2 * st.form);
    const c = st.collapse;
    c2d.setTransform(scale, 0, 0, scale, (size / 2) * scale, (size / 2) * scale);
    c2d.clearRect(-size / 2, -size / 2, size, size);
    c2d.fillStyle = c2d.strokeStyle = `rgb(${st.r | 0}, ${st.g | 0}, ${st.b | 0})`;
    // Screen pose and alpha of each dot.
    const pose = pts.map((p, i) => {
      const q = project(rotate({ x: p.x * R, y: p.y * R, z: p.z * R }, a, b), F);
      const depth = clamp((q.s - 0.75) / 0.75); // 0 far, 1 near
      let px = st.fx + (q.x - st.fx) * spread;
      let py = st.fy + (q.y - st.fy) * spread;
      let al: number;
      if (i === 0) {
        px *= 1 - c;
        py *= 1 - c;
        al = dotStart ? 1 : st.form;
      } else al = st.form * life(t, p.period, p.phase) * (1 - clamp((c - p.fade) / 0.2));
      return { x: px, y: py, s: q.s, depth, al: al * (0.35 + 0.65 * depth) };
    });
    c2d.lineWidth = size / 400;
    for (const l of links) {
      const p = pose[l.a];
      const q = pose[l.b];
      const al = Math.min(p.al, q.al) * life(t, l.period, l.phase) * 0.6;
      if (al <= 0.01) continue;
      c2d.globalAlpha = al;
      c2d.beginPath();
      c2d.moveTo(p.x, p.y);
      c2d.lineTo(q.x, q.y);
      c2d.stroke();
    }
    // The single dot: after collapse, or the start dot before show. It grows to the full size and pulses.
    const single = Math.max(c, dotStart ? 1 - st.form : 0);
    pose.forEach((p, i) => {
      if (p.al <= 0.01) return;
      let rad = dotR * p.s;
      let al = p.al;
      if (i === 0 && single > 0) {
        const beat = reduced ? 0 : Math.sin((t / PULSE) * Math.PI * 2);
        rad += single * (dotR * 1.5 + beat * dotR * 0.5 - (rad - dotR));
        al += single * (1 - 0.25 * (beat + 1) / 2 - al);
      }
      c2d.globalAlpha = al;
      c2d.beginPath();
      c2d.arc(p.x, p.y, rad, 0, Math.PI * 2);
      c2d.fill();
    });
  };
  const tick = (_time: number, dt: number) => {
    if (!reduced) {
      const s = Math.min(dt, 100) / 1000; // a long frame (tab in background) does not jump the pose
      t += s;
      a += (s * Math.PI * 2) / st.turn;
      b += (s * Math.PI * 2) / (st.turn * 2.7); // second axis, slower, so the mesh tumbles
    }
    draw();
  };
  gsap.ticker.add(tick);

  return {
    show(tl, at, o = {}) {
      // Dots spread from the point, scene-local, else from the centre (or the start dot).
      const fx = !dotStart && o.from ? o.from.x - x : 0;
      const fy = !dotStart && o.from ? o.from.y - y : 0;
      tl.set(canvas, { autoAlpha: 1 }, at);
      tl.fromTo(st, { form: 0, fx, fy }, {
        form: 1, fx, fy, duration: motion.camera, ease: "power2.out", immediateRender: false,
        onUpdate(this: gsap.core.Tween) {
          visible = dotStart || this.progress() > 0;
        },
      }, "<");
    },
    hide(tl, at) {
      tl.fromTo(canvas, { autoAlpha: 1 }, {
        autoAlpha: 0, duration: motion.step, immediateRender: false,
        onUpdate(this: gsap.core.Tween) {
          visible = this.progress() < 1;
        },
      }, at);
    },
    mood(tl, name, at) {
      const next = MOODS[name];
      if (!next) throw new Error(`mesh3d: no mood "${name}" (${Object.keys(MOODS).join(", ")})`);
      const [r1, g1, b1] = gsap.utils.splitColor(next.color) as number[];
      const [rf, gf, bf] = gsap.utils.splitColor(mood.color) as number[];
      const nextTurn = opts.speed ?? next.turn;
      // The previous mood is known here: adders run in step order at build.
      tl.fromTo(st, { r: rf, g: gf, b: bf, turn }, { r: r1, g: g1, b: b1, turn: nextTurn, duration: motion.step, immediateRender: false }, at);
      mood = next;
      turn = nextTurn;
    },
    collapse(tl, at) {
      tl.fromTo(st, { collapse: 0 }, { collapse: 1, duration: motion.camera, ease: "power1.inOut", immediateRender: false }, at);
    },
    destroy() {
      gsap.ticker.remove(tick);
      canvas.remove();
    },
  };
}
