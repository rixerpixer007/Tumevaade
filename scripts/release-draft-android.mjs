import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { readVersions } from "./release-lib.mjs";

const versions = readVersions("release/version.properties");
const tag = `android-v${versions.androidVersionName}`;
const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });
const generated = JSON.parse(
  gh([
    "api",
    `repos/${process.env.GITHUB_REPOSITORY}/releases/generate-notes`,
    "-f",
    `tag_name=${tag}`,
    "-f",
    `target_commitish=${process.env.GITHUB_SHA}`,
  ]),
);
const values = {
  changes: generated.body,
  apk: `tumevaade-v${versions.androidVersionName}.apk`,
  version: versions.androidVersionName,
  code: String(versions.androidVersionCode),
};
const notes = fs
  .readFileSync("release/android-notes.md", "utf8")
  .replace(/\{\{(changes|apk|version|code)\}\}/g, (_, key) => values[key]);
fs.writeFileSync(".output/release/android/notes.md", notes);
gh([
  "release",
  "create",
  tag,
  `.output/release/android/${values.apk}`,
  `.output/release/android/${values.apk}.sha256`,
  ".output/release/android/android.json",
  "--target",
  process.env.GITHUB_SHA,
  "--draft",
  "--title",
  `Android ${versions.androidVersionName}`,
  "--notes-file",
  ".output/release/android/notes.md",
]);
console.log(`Draft ready for review: ${tag}`);
