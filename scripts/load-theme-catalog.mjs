import { fileURLToPath } from "node:url";
import { build } from "vite";

// Let Node tooling consume the canonical TypeScript catalog on every supported Node version.
export async function loadThemeConfiguration() {
  const result = await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      write: false,
      lib: {
        entry: fileURLToPath(new URL("../src/shared/themes.ts", import.meta.url)),
        formats: ["es"],
      },
    },
  });
  const { code } = result[0].output[0];
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

export async function loadThemeCatalog() {
  return (await loadThemeConfiguration()).THEMES;
}
