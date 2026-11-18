import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseVersions, readVersions, validateVersion } from "./release-lib.mjs";
import { validatePublishedAndroid } from "./release-published-lib.mjs";
import { verifyAndroidApk } from "./android-apk.mjs";

const repo = "rixerpixer007/Tumevaade";
if (process.env.GITHUB_REPOSITORY !== repo) throw new Error("Unexpected release repository.");
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const releaseId = event.release?.id ?? Number(process.env.RELEASE_ID);
if (!Number.isSafeInteger(releaseId) || releaseId <= 0) throw new Error("Invalid release ID.");
const gh = (args, options = {}) => execFileSync("gh", args, { encoding: "utf8", ...options });
const release = JSON.parse(gh(["api", `repos/${repo}/releases/${releaseId}`]));
if (release.draft || !release.published_at) throw new Error("Release is not published.");
if (release.prerelease) {
  console.log("Prerelease: stable update metadata remains unchanged.");
  process.exit(0);
}
const tag = release.tag_name;
const version = tag.replace(/^android-v/, "");
validateVersion(version);
if (tag !== `android-v${version}`) throw new Error("Unexpected release tag.");
if (!process.env.ANDROID_SIGNING_CERT_SHA256)
  throw new Error("Configure the expected signing certificate fingerprint first.");
// The release must belong to main history; inspect data from the tag, never execute its scripts.
execFileSync("git", ["merge-base", "--is-ancestor", `refs/tags/${tag}`, "HEAD"]);
const versions = parseVersions(
  execFileSync("git", ["show", `refs/tags/${tag}:release/version.properties`], {
    encoding: "utf8",
  }),
);
const source = readVersions("release/version.properties");
if (versions.androidVersionCode > source.androidVersionCode)
  throw new Error("Release version is ahead of main.");
const output = path.resolve(".output/release/published");
fs.mkdirSync(output, { recursive: true });
const apkName = `tumevaade-v${version}.apk`;
for (const name of [apkName, `${apkName}.sha256`, "android.json"]) {
  const assets = release.assets.filter((asset) => asset.name === name);
  const limit = name === apkName ? 200 * 1024 * 1024 : 8192;
  if (assets.length !== 1 || assets[0].size <= 0 || assets[0].size > limit)
    throw new Error(`Missing or invalid release asset: ${name}`);
  const descriptor = fs.openSync(path.join(output, name), "w");
  try {
    gh(
      [
        "api",
        `repos/${repo}/releases/assets/${assets[0].id}`,
        "-H",
        "Accept: application/octet-stream",
      ],
      { encoding: null, stdio: ["ignore", descriptor, "pipe"] },
    );
  } finally {
    fs.closeSync(descriptor);
  }
}
const candidate = JSON.parse(fs.readFileSync(path.join(output, "android.json"), "utf8"));
// Read the latest file/sha from GitHub; API update is atomic and refuses concurrent edits.
const remote = JSON.parse(gh(["api", `repos/${repo}/contents/release/android.json?ref=main`]));
const current = JSON.parse(Buffer.from(remote.content, "base64").toString("utf8"));
const shouldActivate = validatePublishedAndroid({
  tag,
  metadata: candidate,
  versions,
  apkBytes: fs.readFileSync(path.join(output, apkName)),
  checksum: fs.readFileSync(path.join(output, `${apkName}.sha256`), "utf8"),
  current,
});
verifyAndroidApk(path.join(output, apkName), versions);
if (!shouldActivate) {
  console.log("Release is already active or has been superseded; no metadata change.");
  process.exit(0);
}
const request = path.join(output, "activate-request.json");
fs.writeFileSync(
  request,
  JSON.stringify({
    message: `release: activate Android ${version}`,
    branch: "main",
    sha: remote.sha,
    content: Buffer.from(JSON.stringify(candidate, null, 2) + "\n").toString("base64"),
  }),
);
gh(["api", "--method", "PUT", `repos/${repo}/contents/release/android.json`, "--input", request]);
console.log(`Activated Android ${version} from verified public release assets.`);
