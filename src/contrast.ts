// Pure colour maths, shared by the runtime contrast check (theme.ts) and the Node-side brand theme derivation.

export const rgb = (c: string): [number, number, number] => {
  const h = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(c.trim())?.[1];
  if (h) {
    const f = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
  }
  const n = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c.trim());
  if (!n) throw new Error(`unsupported colour: ${c}`);
  return [+n[1], +n[2], +n[3]];
};
const lum = (c: string) => {
  const [r, g, b] = rgb(c).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio of two colours (#rgb, #rrggbb or rgb()). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
