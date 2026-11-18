import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bumpVersions, formatVersions, readVersions } from "./release-lib.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "release/version.properties");
const [command, version, target = "all", ...extra] = process.argv.slice(2);
if (
  extra.length ||
  !["check", "sync", "bump"].includes(command) ||
  (command !== "bump" && version !== undefined) ||
  (command === "bump" && !version)
) {
  throw new Error("Usage: release-version.mjs check|sync|bump <version> [all|extension|android]");
}
const current = readVersions(source);
const next = command === "bump" ? bumpVersions(current, version, target) : current;
const mirrors = ["package.json", "package-lock.json"].map((name) => {
  const file = path.join(root, name);
  const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
  const stale =
    metadata.version !== next.extensionVersion ||
    (name === "package-lock.json" && metadata.packages[""].version !== next.extensionVersion);
  metadata.version = next.extensionVersion;
  if (name === "package-lock.json") metadata.packages[""].version = next.extensionVersion;
  return { file, metadata, stale };
});
const published = JSON.parse(fs.readFileSync(path.join(root, "release/android.json"), "utf8"));
if (
  next.androidVersionCode < published.versionCode ||
  (next.androidVersionCode === published.versionCode &&
    next.androidVersionName !== published.versionName)
) {
  throw new Error("Android source version must not conflict with or predate published metadata.");
}
if (command === "check") {
  if (mirrors.some(({ stale }) => stale))
    throw new Error("Version mirrors are stale. Run npm run version:sync.");
} else {
  // Validate all inputs before writing any files. No git, tags, or updater changes.
  if (command === "bump") fs.writeFileSync(source, formatVersions(next));
  for (const { file, metadata, stale } of mirrors) {
    if (stale) fs.writeFileSync(file, JSON.stringify(metadata, null, 2) + "\n");
  }
}
console.log(
  `Extension ${next.extensionVersion}; Android ${next.androidVersionName} (${next.androidVersionCode}).`,
);
