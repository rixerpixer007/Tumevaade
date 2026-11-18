import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

test("draft uses Android v title, Estonian manual notes, direct download, and only the APK asset", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tumevaade-draft-"));
  try {
    for (const directory of ["scripts", "release", "bin", ".output/release/android"])
      fs.mkdirSync(path.join(root, directory), { recursive: true });
    for (const file of [
      "scripts/release-draft-android.mjs",
      "scripts/release-lib.mjs",
      "release/android-notes.md",
    ])
      fs.copyFileSync(new URL(`../${file}`, import.meta.url), path.join(root, file));
    fs.writeFileSync(
      path.join(root, "release/version.properties"),
      "extensionVersion=0.1.8\nandroidVersionName=0.1.8\nandroidVersionCode=11\n",
    );
    fs.writeFileSync(
      path.join(root, "bin/gh"),
      `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[0] !== 'release' || args[1] !== 'create') process.exit(1);
fs.writeFileSync('capture.json', JSON.stringify({ args, body: fs.readFileSync(args[args.indexOf('--notes-file') + 1], 'utf8') }));
`,
      { mode: 0o700 },
    );
    const result = spawnSync(process.execPath, ["scripts/release-draft-android.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH}`,
        GITHUB_REPOSITORY: "rixerpixer007/Tumevaade",
        GITHUB_SHA: "a".repeat(40),
      },
    });
    expect(result.status, result.stderr).toBe(0);
    const { args, body } = JSON.parse(fs.readFileSync(path.join(root, "capture.json")));
    expect(args[args.indexOf("--title") + 1]).toBe("Android v0.1.8");
    expect(args.slice(0, 4)).toEqual([
      "release",
      "create",
      "android-v0.1.8",
      ".output/release/android/tumevaade-v0.1.8.apk",
    ]);
    expect(args).toContain("--draft");
    expect(args.some((arg) => /\.sha256$|android\.json$/.test(arg))).toBe(false);
    expect(body).toContain("## Muudatused\n\n<!-- Lisa siia muudatused punktidena. -->");
    expect(body).toContain(
      "[⬇️ Laadi APK alla](https://github.com/rixerpixer007/Tumevaade/releases/download/android-v0.1.8/tumevaade-v0.1.8.apk)",
    );
    expect(body).not.toMatch(/SHA-?256|What's new|Installation|\{\{/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
