import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readVersions } from "./release-lib.mjs";
import { verifyAndroidApk } from "./android-apk.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const [apkArgument, ...extra] = process.argv.slice(2);
if (!apkArgument || extra.length)
  throw new Error("Usage: npm run release:android:metadata -- <signed.apk>");
const apk = path.resolve(apkArgument);
const versions = readVersions(path.join(root, "release/version.properties"));
const publishedPath = path.join(root, "release/android.json");
const published = JSON.parse(fs.readFileSync(publishedPath, "utf8"));
if (versions.androidVersionCode <= published.versionCode) {
  throw new Error(
    "Bump Android before preparing a release: versionCode must exceed the published APK.",
  );
}
verifyAndroidApk(apk, versions);
const name = `tumevaade-v${versions.androidVersionName}.apk`;
const bytes = fs.readFileSync(apk);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const output = path.join(root, ".output/release/android");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, name), bytes);
fs.writeFileSync(path.join(output, `${name}.sha256`), `${sha256}  ${name}\n`);
fs.writeFileSync(
  path.join(output, "android.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      published: true,
      versionCode: versions.androidVersionCode,
      versionName: versions.androidVersionName,
      releaseUrl: `https://github.com/rixerpixer007/Tumevaade/releases/tag/android-v${versions.androidVersionName}`,
      sha256,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Verified signed APK; release files prepared in ${output}. Public metadata unchanged.`);
