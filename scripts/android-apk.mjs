import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function verifyAndroidApk(
  apk,
  versions,
  expectedCertificate = process.env.ANDROID_SIGNING_CERT_SHA256,
) {
  const sdk =
    process.env.ANDROID_SDK_ROOT ||
    process.env.ANDROID_HOME ||
    path.join(os.homedir(), "Library/Android/sdk");
  const toolsRoot = path.join(sdk, "build-tools");
  const toolsVersion = fs
    .readdirSync(toolsRoot)
    .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .at(-1);
  if (!toolsVersion) throw new Error("Install Android SDK build-tools first.");
  const tools = path.join(toolsRoot, toolsVersion);
  const javaHome =
    process.env.JAVA_HOME || "/Applications/Android Studio.app/Contents/jbr/Contents/Home";
  const env = { ...process.env, JAVA_HOME: javaHome };
  const badging = execFileSync(path.join(tools, "aapt"), ["dump", "badging", apk], {
    encoding: "utf8",
    env,
  });
  const packageLine = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(
    badging,
  );
  if (
    !packageLine ||
    packageLine[1] !== "io.github.rixerpixer007.stuudium" ||
    Number(packageLine[2]) !== versions.androidVersionCode ||
    packageLine[3] !== versions.androidVersionName
  ) {
    throw new Error("APK application ID/version does not match the Android release source.");
  }
  const signing = execFileSync(path.join(tools, "apksigner"), ["verify", "--print-certs", apk], {
    encoding: "utf8",
    env,
  });
  // Optional continuity check against the fingerprint recorded from the permanent key.
  if (expectedCertificate) {
    const certificates = [
      ...signing.matchAll(/^Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)$/gim),
    ];
    const normalized = expectedCertificate.replace(/:/g, "").toLowerCase();
    if (
      !/^[a-f0-9]{64}$/.test(normalized) ||
      certificates.length !== 1 ||
      certificates[0][1].toLowerCase() !== normalized
    ) {
      throw new Error("APK signing certificate differs from ANDROID_SIGNING_CERT_SHA256.");
    }
  }
}
