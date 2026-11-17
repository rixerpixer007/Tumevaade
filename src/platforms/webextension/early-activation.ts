import type { ThemeId } from "../../shared/themes";

const EARLY_ACTIVATION_SCRIPT_BY_THEME = {
  "graphite-mint": "activation-graphite-mint.js",
  "graphite-blue": "activation-graphite-blue.js",
  "obsidian-red": "activation-obsidian-red.js",
  "velvet-mauve": "activation-velvet-mauve.js",
  "midnight-amber": "activation-midnight-amber.js",
  "monochrome-dark": "activation-monochrome-dark.js",
  "light-mint": "activation-light-mint.js",
  "light-blue": "activation-light-blue.js",
  sand: "activation-sand.js",
  "light-mauve": "activation-light-mauve.js",
  "monochrome-light": "activation-monochrome-light.js",
} as const satisfies Record<ThemeId, string>;

export function getEarlyActivationScript(themeId: ThemeId): string {
  return EARLY_ACTIVATION_SCRIPT_BY_THEME[themeId];
}
