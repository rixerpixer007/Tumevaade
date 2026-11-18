import { createHash } from "node:crypto";
import { validateVersion } from "./release-lib.mjs";

export function validatePublishedAndroid({ tag, metadata, versions, apkBytes, checksum, current }) {
  const version = tag.replace(/^android-v/, "");
  validateVersion(version);
  if (
    tag !== `android-v${version}` ||
    metadata.schemaVersion !== 1 ||
    metadata.published !== true ||
    metadata.versionName !== version ||
    metadata.versionName !== versions.androidVersionName ||
    metadata.versionCode !== versions.androidVersionCode ||
    metadata.releaseUrl !== `https://github.com/rixerpixer007/Tumevaade/releases/tag/${tag}`
  ) {
    throw new Error("Published release metadata does not match its tag and source version.");
  }
  const digest = createHash("sha256").update(apkBytes).digest("hex");
  if (metadata.sha256 !== digest || checksum.trim() !== `${digest}  tumevaade-v${version}.apk`) {
    throw new Error("Published APK/checksum does not match update metadata.");
  }
  if (metadata.versionCode < current.versionCode) return false;
  if (metadata.versionCode === current.versionCode) {
    if (
      Object.keys(metadata).length !== Object.keys(current).length ||
      Object.entries(metadata).some(([key, value]) => current[key] !== value)
    )
      throw new Error("Published version conflicts with active metadata.");
    return false;
  }
  return true;
}
