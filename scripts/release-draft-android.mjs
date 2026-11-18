import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { readVersions } from "./release-lib.mjs";

const versions = readVersions("release/version.properties");
const tag = `android-v${versions.androidVersionName}`;
const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });
const apk = `tumevaade-v${versions.androidVersionName}.apk`;
const downloadUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/releases/download/${tag}/${apk}`;
const downloadButtonUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${process.env.GITHUB_SHA}/assets/readme/download.svg`;
const values = { downloadUrl, downloadButtonUrl };
const notes = fs
  .readFileSync("release/android-notes.md", "utf8")
  .replace(/\{\{(downloadUrl|downloadButtonUrl)\}\}/g, (_, key) => values[key]);
fs.writeFileSync(".output/release/android/notes.md", notes);
gh([
  "release",
  "create",
  tag,
  `.output/release/android/${apk}`,
  "--target",
  process.env.GITHUB_SHA,
  "--draft",
  "--title",
  `Android v${versions.androidVersionName}`,
  "--notes-file",
  ".output/release/android/notes.md",
]);
console.log(`Draft ready for review: ${tag}`);
