/// <reference types="vite/client" />

// Built by bin/scan-plugin.mjs: the Lucide icons the deck's code names, keyed like "ShieldCheck".
declare module "virtual:klappe-icons" {
  const icons: Record<string, import("lucide").IconNode>;
  export default icons;
}

// Built by bin/scan-plugin.mjs: the names the deck's code imports from "klappe/fx" ("*" for a namespace import).
declare module "virtual:klappe-fx" {
  const names: string[];
  export default names;
}

// Built by bin/scan-plugin.mjs: the languages the deck's code names as a literal lang value.
declare module "virtual:klappe-langs" {
  const langs: string[];
  export default langs;
}

// Set by bin/review-plugin.mjs, which runs only in the dev server: true where the review route exists.
interface ImportMetaEnv {
  readonly KLAPPE_REVIEW?: boolean;
}
