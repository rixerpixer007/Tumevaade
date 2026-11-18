import { createHash } from "node:crypto";
import { validateVersion } from "./release-lib.mjs";

export function createPublishedAndroidMetadata({ tag, versions, apkBytes, assetDigest, current }) {
  const version = tag.replace(/^android-v/, "");
  validateVersion(version);
  if (
    tag !== `android-v${version}` ||
    version !== versions.androidVersionName ||
    !Number.isInteger(versions.androidVersionCode) ||
    versions.androidVersionCode <= 0
  ) {
    throw new Error("Published release tag does not match its source version.");
  }
  const sha256 = createHash("sha256").update(apkBytes).digest("hex");
  if (assetDigest !== `sha256:${sha256}`) {
    throw new Error("Downloaded APK does not match GitHub's release asset digest.");
  }
  const metadata = {
    schemaVersion: 1,
    published: true,
    versionCode: versions.androidVersionCode,
    versionName: version,
    releaseUrl: `https://github.com/rixerpixer007/Tumevaade/releases/tag/${tag}`,
    sha256,
  };
  if (metadata.versionCode < current.versionCode) return null;
  if (metadata.versionCode === current.versionCode) {
    if (
      Object.keys(metadata).length !== Object.keys(current).length ||
      Object.entries(metadata).some(([key, value]) => current[key] !== value)
    ) {
      throw new Error("Published version conflicts with active metadata.");
    }
    return null;
  }
  return metadata;
}
