import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "wxt";

import { getEarlyActivationScript } from "./src/platforms/webextension/early-activation";
import { STUUDIUM_MATCHES } from "./src/shared/sites";
import { THEMES } from "./src/shared/themes";

export default defineConfig({
  srcDir: "src",
  manifestVersion: 3,
  hooks: {
    async "entrypoints:found"(wxt, entrypoints) {
      // Keep synchronous document_start bundles without maintaining one source per theme.
      const directory = path.join(wxt.config.wxtDir, "theme-activation");
      await mkdir(directory, { recursive: true });
      for (const theme of THEMES) {
        const name = getEarlyActivationScript(theme.id).replace(/\.js$/, "");
        const inputPath = path.join(directory, `${name}.ts`);
        await writeFile(
          inputPath,
          `import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";\n` +
            `import { activateEarlyTheme } from "../../src/platforms/webextension/early-activation";\n` +
            `export default defineUnlistedScript(() => activateEarlyTheme(${JSON.stringify(theme.id)}));\n`,
        );
        entrypoints.push({ name, inputPath, type: "unlisted-script" });
      }
    },
  },
  dev: {
    server: {
      port: 3000,
      strictPort: true,
    },
  },
  manifest: {
    name: "Tumevaade",
    description:
      "Tumevaade on TORG Stuudiumi mitteametlik brauserilaiendus, mis lisab kohandatava kujunduse.",
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
    minimum_chrome_version: "96",
    permissions: ["storage", "scripting"],
    host_permissions: [...STUUDIUM_MATCHES],
    action: {
      default_title: "Ava Tumevaate seaded",
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
        48: "icons/icon-48.png",
        128: "icons/icon-128.png",
      },
    },
  },
  webExt: {
    disabled: true,
  },
  zip: {
    artifactTemplate: "{{name}}-{{version}}-{{browser}}.zip",
    compressionLevel: 9,
  },
});
