import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("theme catalog loads on a clean checkout before WXT generates tsconfig", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tumevaade-bootstrap-"));
  try {
    fs.mkdirSync(path.join(root, "scripts"));
    fs.mkdirSync(path.join(root, "src/shared"), { recursive: true });
    for (const name of [
      "scripts/load-theme-catalog.mjs",
      "src/shared/themes.ts",
      "tsconfig.json",
    ]) {
      fs.copyFileSync(new URL(`../${name}`, import.meta.url), path.join(root, name));
    }
    fs.symlinkSync(
      fileURLToPath(new URL("../node_modules", import.meta.url)),
      path.join(root, "node_modules"),
      "dir",
    );
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import { loadThemeConfiguration } from './scripts/load-theme-catalog.mjs';
      const { THEMES, DEFAULT_THEME_ID } = await loadThemeConfiguration();
      console.log(JSON.stringify({ ids: THEMES.map(theme => theme.id), defaultId: DEFAULT_THEME_ID }));
    `,
      ],
      { cwd: root, encoding: "utf8" },
    );
    const result = JSON.parse(output);
    expect(result.ids).toContain("graphite-mint");
    expect(result.ids).toContain("light-mint");
    expect(result.ids).toContain(result.defaultId);
    expect(fs.existsSync(path.join(root, ".wxt"))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
