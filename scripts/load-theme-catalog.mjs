import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { transformWithOxc } from "vite";

// The standalone catalog must load before WXT generates its TypeScript configuration.
export async function loadThemeConfiguration() {
  const source = new URL("../src/shared/themes.ts", import.meta.url);
  const { code } = await transformWithOxc(fs.readFileSync(source, "utf8"), fileURLToPath(source), {
    tsconfig: false,
  });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

export async function loadThemeCatalog() {
  return (await loadThemeConfiguration()).THEMES;
}
