import type { Ctx } from "../types";

// Every origin a chart's data or a stat's `source` records, once, in build order (deck order). Not a klappe/fx export:
// endRoll reads the list, and the charts and stats fill it.
export function addSource(ctx: Ctx, source: string | undefined): void {
  if (source && !ctx.deck.sources.includes(source)) ctx.deck.sources.push(source);
}
