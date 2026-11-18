import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { parseVersions, readVersions } from "./release-lib.mjs";

const current = readVersions("release/version.properties");
let changed = true;
if (process.env.GITHUB_EVENT_NAME === "push") {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (!/^[a-f0-9]{40}$/.test(event.before) || /^0+$/.test(event.before)) {
    throw new Error(
      "Cannot compare Android versions without the previous main commit. Use manual retry.",
    );
  }
  const files = execFileSync(
    "git",
    ["ls-tree", "--name-only", event.before, "release/version.properties"],
    { encoding: "utf8" },
  );
  if (files.trim()) {
    const previous = parseVersions(
      execFileSync("git", ["show", `${event.before}:release/version.properties`], {
        encoding: "utf8",
      }),
    );
    changed =
      previous.androidVersionName !== current.androidVersionName ||
      previous.androidVersionCode !== current.androidVersionCode;
    if (changed && current.androidVersionCode <= previous.androidVersionCode)
      throw new Error("An Android bump must increase versionCode.");
  } else {
    // Initial rollout of the source file only releases an Android version newer than live metadata.
    const live = JSON.parse(fs.readFileSync("release/android.json", "utf8"));
    changed = current.androidVersionCode > live.versionCode;
  }
}
const live = JSON.parse(fs.readFileSync("release/android.json", "utf8"));
if (changed && current.androidVersionCode <= live.versionCode)
  throw new Error("Android release must be newer than published metadata.");
fs.appendFileSync(
  process.env.GITHUB_OUTPUT,
  `changed=${changed}\nversion=${current.androidVersionName}\n`,
);
console.log(
  changed
    ? `Prepare Android ${current.androidVersionName}.`
    : "Android version unchanged; no release build.",
);
