import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { drawOn } from "./draw";

// One change to the history: a commit on a branch, a new branch from another's tip, a merge, a rebase, a tag on
// a branch's tip, a cherry-pick of one commit (by its label) onto a branch, a squash merge, a checkout (HEAD).
export type GitOp =
  | { commit: string; label: string }
  | { branch: string; from: string }
  | { merge: string; into: string; label?: string }
  | { rebase: string; onto: string }
  | { tag: string; on: string }
  | { cherryPick: string; onto: string }
  | { squash: string; into: string; label?: string }
  | { checkout: string };
export type GitGraphOpts = { ops: GitOp[] } & Rect;
export interface GitGraphHandle {
  next: StepAdder;
  show: StepAdder;
}

export interface GitCommit { id: string; label: string; lane: number; parents: string[]; op: number; gone?: number; copyOf?: string; x: number; y: number }
export interface GitLane { name: string; op: number; y: number }
export interface GitTag { name: string; commit: string; op: number }
// head[k]: the commit HEAD points at after op k; undefined until the first checkout.
export interface GitLayout { commits: GitCommit[]; lanes: GitLane[]; tags: GitTag[]; lit: string[][]; head: (string | undefined)[]; colW: number; problems: string[] }

const SVG = "http://www.w3.org/2000/svg";
const NAME_W = 220; // the branch names' column at the left
const MAX_COL = 200;
const MIN_COL = 110; // a column narrower than this cannot hold a label at the floor
const MAX_LANE = 180;
const MIN_LANE = 110; // a dot, its label below and room for the curve to the next lane
const DOT = 36;
const FONT = 20; // legibility floor, scene px (14.2 px at 1366)
const LANES = 6; // one series colour each
const PILL = 36; // a tag's or HEAD's height and gap: pills on one commit stack this far apart

// Replays the ops into commits on lanes, one column per commit in the order they are made, a rebase's copies
// after everything before it. Ids are "c0", "c1", … in that order. Pure, for tests.
export function gitLayout(ops: GitOp[], rect: Rect): GitLayout {
  type Branch = { lane: number; tip?: string; own: string[] };
  const branches = new Map<string, Branch>();
  const commits: Omit<GitCommit, "x" | "y">[] = [];
  const lit: string[][] = [];
  const tags: GitTag[] = [];
  const head: (string | undefined)[] = [];
  let cur: string | undefined; // the branch checked out
  const problems: string[] = [];
  const lane = (name: string, op: number) => {
    branches.set(name, { lane: branches.size, own: [] });
    lanes.push({ name, op });
    return branches.get(name)!;
  };
  const lanes: Omit<GitLane, "y">[] = [];
  const known = (name: string) => branches.get(name) ?? void problems.push(`gitGraph: no branch "${name}"`);
  const add = (b: Branch, label: string, parents: string[], op: number, copyOf?: string) => {
    const id = `c${commits.length}`;
    commits.push({ id, label, lane: b.lane, parents, op, ...(copyOf ? { copyOf } : {}) });
    b.tip = id;
    b.own.push(id);
    return id;
  };
  const play = (o: GitOp, k: number) => {
    if ("commit" in o) {
      // The first commit makes the first branch; every other branch comes from a branch op.
      const b = branches.get(o.commit) ?? (branches.size ? known(o.commit) : lane(o.commit, k));
      lit.push(b ? [add(b, o.label, b.tip ? [b.tip] : [], k)] : []);
    } else if ("branch" in o) {
      const from = known(o.from);
      if (branches.has(o.branch)) problems.push(`gitGraph: branch "${o.branch}" already exists`);
      else if (from && !from.tip) problems.push(`gitGraph: "${o.from}" has no commit to branch from`);
      else if (from) lane(o.branch, k).tip = from.tip;
      lit.push(from?.tip ? [from.tip] : []);
    } else if ("tag" in o) {
      const b = known(o.on);
      if (b && !b.tip) problems.push(`gitGraph: "${o.on}" has no commit to tag`);
      if (b?.tip) tags.push({ name: o.tag, commit: b.tip, op: k });
      lit.push(b?.tip ? [b.tip] : []);
    } else if ("cherryPick" in o) {
      const onto = known(o.onto);
      const src = [...commits].reverse().find((c) => c.label === o.cherryPick && c.gone === undefined); // the latest of that name
      if (!src) problems.push(`gitGraph: no commit "${o.cherryPick}" to cherry-pick`);
      if (!src || !onto?.tip) return void lit.push([]);
      lit.push([add(onto, `${src.label}′`, [onto.tip], k, src.id)]);
    } else if ("checkout" in o) {
      const b = known(o.checkout);
      if (b) cur = o.checkout;
      lit.push(b?.tip ? [b.tip] : []);
    } else if ("squash" in o) {
      // One commit on the target with the branch's work in it: its only parent is the target's tip.
      const [src, dst] = [known(o.squash), known(o.into)];
      if (!src?.tip || !dst?.tip) return void lit.push([]);
      lit.push([add(dst, o.label ?? `squash ${o.squash}`, [dst.tip], k, src.tip)]);
      src.own = [];
    } else if ("merge" in o) {
      const [src, dst] = [known(o.merge), known(o.into)];
      if (!src?.tip || !dst?.tip) return void lit.push([]);
      lit.push([add(dst, o.label ?? `merge ${o.merge}`, [dst.tip, src.tip], k)]);
      src.own = []; // now part of the target: a later rebase has nothing of them to replay
    } else {
      const [b, onto] = [known(o.rebase), known(o.onto)];
      if (!b || !onto?.tip) return void lit.push([]);
      const old = b.own;
      if (!old.length) problems.push(`gitGraph: rebase of "${o.rebase}" onto "${o.onto}" has nothing to replay`);
      b.own = [];
      b.tip = onto.tip;
      for (const id of old) {
        const c = commits.find((q) => q.id === id)!;
        if (c.parents.length > 1) problems.push(`gitGraph: rebase of "${o.rebase}" replays a merge; gitGraph draws only plain commits there`);
        c.gone = k;
        add(b, `${c.label}′`, [b.tip!], k, id);
      }
      lit.push([...b.own]);
    }
  };
  ops.forEach((o, k) => {
    play(o, k);
    head.push(cur && branches.get(cur)?.tip);
  });
  if (branches.size > LANES) problems.push(`gitGraph: ${branches.size} branches; at most ${LANES}`);
  const colW = Math.min(MAX_COL, (rect.w - NAME_W) / Math.max(1, commits.length));
  const laneH = Math.min(MAX_LANE, rect.h / Math.max(1, lanes.length));
  if (colW < MIN_COL) problems.push(`gitGraph: ${commits.length} commits do not fit in ${rect.w}px`);
  if (laneH < MIN_LANE) problems.push(`gitGraph: ${lanes.length} branches do not fit in ${rect.h}px`);
  const y = (l: number) => rect.y + (rect.h - lanes.length * laneH) / 2 + (l + 0.5) * laneH; // the lanes centred in h
  return {
    commits: commits.map((c, i) => ({ ...c, x: rect.x + NAME_W + (i + 0.5) * colW, y: y(c.lane) })),
    lanes: lanes.map((l, i) => ({ ...l, y: y(i) })),
    tags,
    lit,
    head,
    colW,
    problems,
  };
}

// A git history drawn one op per step: commits as dots on one lane per branch in its series colour, lines to
// their parents, the branch names at the left. The newest commits (or a new branch's base) are ringed in
// --k-accent until the next op. A rebase fades the old commits out while their copies (label′) fly to the
// target's tip; a cherry-pick's copy flies the same way and leaves its original. A tag is a pill over its commit.
export function gitGraph(ctx: Ctx, opts: GitGraphOpts): GitGraphHandle {
  const lay = gitLayout(opts.ops, opts);
  lay.problems.forEach((p) => ctx.problem(p));
  const byId = new Map(lay.commits.map((c) => [c.id, c]));
  const colour = (lane: number) => `var(--k-series-${(lane % LANES) + 1})`;

  const names = lay.lanes.map((l, i) => {
    const el = ctx.html.appendChild(document.createElement("div"));
    el.textContent = l.name;
    el.dataset.kGitBranch = l.name;
    Object.assign(el.style, {
      position: "absolute", left: `${opts.x}px`, top: `${l.y}px`, translate: "0 -50%", maxWidth: `${NAME_W - 32}px`, padding: "4px 14px",
      border: `3px solid ${colour(i)}`, borderRadius: "10px", color: "var(--k-fg)", font: `600 ${FONT + 4}px/1.2 var(--k-font)`,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box",
    });
    gsap.set(el, { autoAlpha: 0 });
    return el;
  });

  // One line per parent: level along a lane, an S-curve between lanes. A merge's line from its second parent
  // takes that parent's colour, as git tools draw it; the others take the child's.
  const edges = lay.commits.flatMap((c) =>
    c.parents.map((pid, i) => {
      const p = byId.get(pid)!;
      const el = document.createElementNS(SVG, "path");
      const m = (c.x - p.x) / 2;
      el.setAttribute("d", p.y === c.y ? `M ${p.x} ${p.y} L ${c.x} ${c.y}` : `M ${p.x} ${p.y} C ${p.x + m} ${p.y}, ${c.x - m} ${c.y}, ${c.x} ${c.y}`);
      Object.assign(el.style, { fill: "none", stroke: colour(i ? p.lane : c.lane), strokeWidth: "5", strokeLinecap: "round" });
      ctx.svg.append(el);
      gsap.set(el, { autoAlpha: 0 });
      return { el, from: pid, to: c.id };
    }),
  );

  const dots = new Map(lay.commits.map((c) => {
    const el = ctx.html.appendChild(document.createElement("div"));
    el.dataset.kGitCommit = c.id;
    Object.assign(el.style, { position: "absolute", left: `${c.x - DOT / 2}px`, top: `${c.y - DOT / 2}px`, width: `${DOT}px`, height: `${DOT}px`, zIndex: "2" });
    const dot = el.appendChild(document.createElement("div"));
    Object.assign(dot.style, { position: "absolute", inset: "0", borderRadius: "50%", background: colour(c.lane), border: "4px solid var(--k-bg)", boxSizing: "border-box" });
    const ring = el.appendChild(document.createElement("div"));
    Object.assign(ring.style, { position: "absolute", inset: "-9px", borderRadius: "50%", border: "4px solid var(--k-accent)" });
    const label = el.appendChild(document.createElement("div"));
    label.textContent = c.label;
    Object.assign(label.style, {
      // On a --k-bg patch, so a line into a commit passes behind the label instead of through it.
      position: "absolute", left: "50%", top: `${DOT + 6}px`, translate: "-50% 0", width: "max-content", maxWidth: `${lay.colW - 12}px`, padding: "0 6px",
      boxSizing: "border-box", background: "var(--k-bg)", borderRadius: "6px", color: "var(--k-fg)", font: `500 ${FONT}px/1.2 var(--k-font)`,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    });
    // A rebase copy waits where its original is, so it can fly from there.
    const src = c.copyOf ? byId.get(c.copyOf)! : c;
    gsap.set(el, { autoAlpha: 0, x: src.x - c.x, y: src.y - c.y });
    gsap.set(ring, { autoAlpha: 0 });
    return [c.id, { el, ring, label }] as const;
  }));

  // A tag: a pill over the commit it marks, shown with its op.
  const tagEls = lay.tags.map((g, i) => {
    const c = byId.get(g.commit)!;
    const below = lay.tags.slice(0, i).filter((o) => o.commit === g.commit).length; // earlier tags on it: stack above them
    const el = ctx.html.appendChild(document.createElement("div"));
    el.textContent = g.name;
    el.dataset.kGitTag = g.name;
    Object.assign(el.style, {
      position: "absolute", left: `${c.x}px`, top: `${c.y - DOT / 2 - 14 - below * PILL}px`, translate: "-50% -100%", padding: "2px 10px", zIndex: "2",
      border: "2px solid var(--k-line)", borderRadius: "6px", background: "var(--k-surface)", color: "var(--k-fg)",
      font: `600 ${FONT}px/1.2 var(--k-font)`, whiteSpace: "nowrap",
    });
    gsap.set(el, { autoAlpha: 0 });
    return { el, op: g.op };
  });

  // HEAD: a pill over the commit it points at, above that commit's tags; it moves when it changes.
  const headAt = (k: number) => {
    const id = lay.head[k];
    if (!id) return undefined;
    const c = byId.get(id)!;
    const n = lay.tags.filter((g) => g.commit === id && g.op <= k).length;
    return { x: c.x, y: c.y - DOT / 2 - 14 - n * PILL };
  };
  const first = lay.head.findIndex(Boolean);
  const headEl = first < 0 ? undefined : ctx.html.appendChild(document.createElement("div"));
  if (headEl) {
    headEl.textContent = "HEAD";
    headEl.dataset.kGitHead = "";
    Object.assign(headEl.style, {
      position: "absolute", left: "0", top: "0", padding: "2px 10px", zIndex: "2",
      border: "2px solid var(--k-accent)", borderRadius: "6px", background: "var(--k-bg)", color: "var(--k-fg)",
      font: `700 ${FONT}px/1.2 var(--k-font)`, whiteSpace: "nowrap",
    });
    gsap.set(headEl, { autoAlpha: 0, xPercent: -50, yPercent: -100, ...headAt(first) }); // not CSS translate: GSAP folds it into x, y
  }
  let headWas: { x: number; y: number } | undefined; // where the ops added so far left HEAD

  let k = 0;
  let checked = false;
  let ringed: string[] = [];
  const op = (tl: gsap.core.Timeline) => {
    if (!checked) {
      checked = true;
      for (const c of lay.commits) {
        const l = dots.get(c.id)!.label;
        if (l.scrollWidth > l.clientWidth + 1) ctx.problem(`gitGraph: label "${c.label}" too long`);
      }
    }
    if (k >= opts.ops.length) return ctx.problem("gitGraph: next() after the last op");
    const at = tl.duration();
    const o = opts.ops[k];
    const added = lay.commits.filter((c) => c.op === k);
    const gone = lay.commits.filter((c) => c.gone === k);
    const lit = lay.lit[k] ?? [];
    const rings = (ids: string[]) => ids.map((id) => dots.get(id)!.ring);
    const settle = ringed.filter((id) => !lit.includes(id));
    if (settle.length) tl.to(rings(settle), { autoAlpha: 0, duration: motion.step }, at);
    lay.lanes.forEach((l, i) => l.op === k && tl.to(names[i], { autoAlpha: 1, duration: motion.step }, at));
    tagEls.forEach((g) => g.op === k && tl.to(g.el, { autoAlpha: 1, duration: motion.step }, at));
    const h = headAt(k);
    if (headEl && h) {
      if (!headWas) tl.to(headEl, { autoAlpha: 1, duration: motion.step }, at);
      else if (h.x !== headWas.x || h.y !== headWas.y) tl.to(headEl, { ...h, duration: motion.step, ease: "power2.inOut" }, at);
      headWas = h;
    }
    let t = at;
    // Copies (a rebase's, a cherry-pick's) show where their originals are, then fly; a rebase's originals and
    // their lines fade first.
    const flying = added.some((c) => c.copyOf);
    if (flying) {
      const dead = new Set(gone.map((c) => c.id));
      if (gone.length) tl.to([...gone.map((c) => dots.get(c.id)!.el), ...edges.filter((e) => dead.has(e.to) || dead.has(e.from)).map((e) => e.el)], { autoAlpha: 0, duration: motion.step }, at);
      tl.to(added.map((c) => dots.get(c.id)!.el), { autoAlpha: 1, duration: 0.01 }, at);
      tl.to(added.map((c) => dots.get(c.id)!.el), { x: 0, y: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.1 }, at + 0.2);
      t = at + 0.9 + 0.1 * added.length;
    }
    for (const c of added) {
      const ins = edges.filter((e) => e.to === c.id).map((e) => e.el);
      if (ins.length) {
        tl.set(ins, { autoAlpha: 1 }, t);
        drawOn(ins, { duration: 0.4, each: 0, at: t })(tl);
      }
      if (!flying) tl.to(dots.get(c.id)!.el, { autoAlpha: 1, duration: 0.3 }, t + (ins.length ? 0.25 : 0));
      else t += 0.15;
    }
    const fresh = lit.filter((id) => !ringed.includes(id));
    if (fresh.length) tl.to(rings(fresh), { autoAlpha: 1, duration: motion.step }, at + ("branch" in o ? 0 : 0.3));
    ringed = lit;
    k++;
  };

  return {
    next: op,
    show(tl) {
      while (k < opts.ops.length) op(tl);
    },
  };
}
