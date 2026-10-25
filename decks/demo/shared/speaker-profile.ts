import { image, qr, text, type BasicHandle, type ImageHandle, type QrHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { gsap } from "gsap";

export interface SpeakerProfileOpts {
  photos: { href: string; alt: string }[]; // one or more; with several, each statement brings the next
  logo?: { href: string; alt: string }; // the company's logo, top right
  linkedin?: string; // a profile link, shown as a QR code on the contact step
  email?: string;
  web?: string;
  statements: number; // how many statement items scene.md has, between the CV and the contact step
}

interface Refs {
  photos: ImageHandle[];
  name: HTMLElement;
  quotes: HTMLElement[];
  who: BasicHandle;
  logo?: ImageHandle;
  cv: BasicHandle;
  qr?: QrHandle;
  reach: BasicHandle;
}

// A speaker profile: a photo, the name (the scene title), the role and company, a short CV, statements one per step,
// and a contact step with a QR code. The words come from scene.md, in this order: the role line, the CV, one item
// per statement, and the contact step's label (the line under the QR code). The rest is opts.
// It lives outside sections/, so the loader does not take it for a scene module.
export function speakerProfile(opts: SpeakerProfileOpts): SceneModule {
  const X = 800; // the text column
  return {
    build(ctx): Refs {
      const doc = ctx.doc!;
      const [who = "", cv = "", ...rest] = doc.steps.map((s) => s.text);
      const said = rest.slice(0, opts.statements);
      const contact = rest[opts.statements] ?? "";
      const photos: ImageHandle[] = opts.photos.map((p) => image(ctx, { ...p, rect: { x: 160, y: 160, w: 560, h: 700 }, fit: "cover" }));
      photos.forEach((p) => (p.el.style.borderRadius = "24px"));
      const name = ctx.html.appendChild(document.createElement("h2"));
      name.textContent = doc.title;
      Object.assign(name.style, { position: "absolute", left: `${X}px`, top: "150px", width: "720px", margin: "0", font: "700 84px/1.1 var(--k-font-heading)", color: "var(--k-fg)" });
      gsap.set(name, { autoAlpha: 0 });
      const quotes = said.map((s) => {
        const q = ctx.html.appendChild(document.createElement("blockquote"));
        q.textContent = `“${s}”`;
        Object.assign(q.style, {
          position: "absolute", left: `${X}px`, top: "560px", width: "960px", margin: "0", paddingLeft: "32px", borderLeft: "6px solid var(--k-accent)",
          font: "600 44px/1.3 var(--k-font)", color: "var(--k-fg)",
        });
        gsap.set(q, { autoAlpha: 0 });
        return q;
      });
      const reach = text(ctx, { text: [opts.email, opts.web].filter(Boolean).join("\n"), x: X + 340, y: 600, w: 620, size: 40, weight: 600 });
      reach.el.style.whiteSpace = "pre-line"; // one contact per line
      return {
        photos,
        name,
        quotes,
        who: text(ctx, { text: who, x: X, y: 260, w: 720, size: 40, color: "--k-muted" }),
        logo: opts.logo && image(ctx, { ...opts.logo, rect: { x: 1560, y: 160, w: 200, h: 80 } }),
        cv: text(ctx, { text: cv, x: X, y: 360, w: 960, size: 34 }),
        qr: opts.linkedin ? qr(ctx, { text: opts.linkedin, x: X, y: 540, size: 280, label: contact }) : undefined,
        reach,
      };
    },
    steps: [
      (tl, r: Refs) => {
        r.photos[0]?.show(tl);
        tl.to(r.name, { autoAlpha: 1, duration: 0.6 }, "<");
        r.who.show(tl);
        r.logo?.show(tl);
      },
      (tl, r: Refs) => r.cv.show(tl),
      // A statement replaces the one before; with several photos, each statement brings the next.
      ...Array.from({ length: opts.statements }, (_, i) => (tl: gsap.core.Timeline, r: Refs) => {
        tl.to(r.quotes[i], { autoAlpha: 1, duration: 0.6 });
        if (i) tl.to(r.quotes[i - 1], { autoAlpha: 0, duration: 0.4 }, "<");
        const n = r.photos.length;
        if (i && n > 1) tl.to(r.photos[i % n].el, { autoAlpha: 1, duration: 0.6 }, "<").to(r.photos[(i - 1) % n].el, { autoAlpha: 0, duration: 0.6 }, "<");
      }),
      (tl, r: Refs) => {
        if (r.quotes.length) tl.to(r.quotes.at(-1)!, { autoAlpha: 0, duration: 0.4 });
        r.qr?.show(tl);
        r.reach.show(tl);
      },
    ],
  };
}
