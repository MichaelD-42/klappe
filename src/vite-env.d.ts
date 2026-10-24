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
