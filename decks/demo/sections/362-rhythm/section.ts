import type { SectionModule } from "klappe/types";

// A light run in a dark deck: only this section's scenes and its stage background change.
export default {
  tokens: {
    "--k-bg": "#ffffff",
    "--k-fg": "#0f1b2d",
    "--k-muted": "#3d4a5e",
    "--k-surface": "#e6ebf2",
    "--k-line": "#6b7a90",
    "--k-accent": "#0b5fd0",
  },
} satisfies SectionModule;
