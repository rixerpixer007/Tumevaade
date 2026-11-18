import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, expect, test } from "vitest";

let root;
let tools;
let apk;
const fingerprint = "a".repeat(64);
const published = JSON.stringify({ versionCode: 10, versionName: "0.1.6", published: true });
// Stub only the external SDK commands. Exercise the real CLI's validation and file writes.
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "tumevaade-apk-"));
  tools = path.join(root, "sdk/build-tools/37.0.0");
  fs.mkdirSync(tools, { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "release"));
  for (const name of ["release-lib.mjs", "release-android-metadata.mjs", "android-apk.mjs"]) {
    fs.copyFileSync(
      new URL(`../scripts/${name}`, import.meta.url),
      path.join(root, "scripts", name),
    );
  }
  fs.writeFileSync(
    path.join(root, "release/version.properties"),
    "extensionVersion=0.1.7\nandroidVersionName=0.1.7\nandroidVersionCode=11\n",
  );
  fs.writeFileSync(path.join(root, "release/android.json"), published);
  apk = path.join(root, "signed.apk");
  fs.writeFileSync(apk, "fixture APK bytes");
  setTool(
    "aapt",
    "printf '%s\\n' \"package: name='io.github.rixerpixer007.stuudium' versionCode='11' versionName='0.1.7'\"",
  );
  setTool("apksigner", `printf '%s\\n' 'Signer #1 certificate SHA-256 digest: ${fingerprint}'`);
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});
function setTool(name, script) {
  fs.writeFileSync(path.join(tools, name), `#!/bin/sh\n${script}\n`, { mode: 0o700 });
}
function run(certificate = fingerprint) {
  return spawnSync(
    process.execPath,
    [path.join(root, "scripts/release-android-metadata.mjs"), apk],
    {
      env: {
        ...process.env,
        ANDROID_SDK_ROOT: path.join(root, "sdk"),
        ANDROID_SIGNING_CERT_SHA256: certificate,
      },
      encoding: "utf8",
    },
  );
}

test("hashes exact verified bytes and prepares candidate without changing live metadata", () => {
  expect(run().status).toBe(0);
  const output = path.join(root, ".output/release/android");
  const metadata = JSON.parse(fs.readFileSync(path.join(output, "android.json")));
  expect(metadata).toEqual({
    schemaVersion: 1,
    published: true,
    versionCode: 11,
    versionName: "0.1.7",
    releaseUrl: "https://github.com/rixerpixer007/Tumevaade/releases/tag/android-v0.1.7",
    sha256: createHash("sha256").update(fs.readFileSync(apk)).digest("hex"),
  });
  expect(fs.readFileSync(path.join(output, "tumevaade-v0.1.7.apk"))).toEqual(fs.readFileSync(apk));
  expect(fs.readFileSync(path.join(output, "tumevaade-v0.1.7.apk.sha256"), "utf8")).toBe(
    `${metadata.sha256}  tumevaade-v0.1.7.apk\n`,
  );
  expect(fs.readFileSync(path.join(root, "release/android.json"), "utf8")).toBe(published);
});

test("rejects a different signing certificate before producing files", () => {
  expect(run("b".repeat(64)).status).not.toBe(0);
  expect(fs.existsSync(path.join(root, ".output"))).toBe(false);
});

test("rejects debug/wrong-version APKs and invalid signatures", () => {
  setTool(
    "aapt",
    "printf '%s\\n' \"package: name='io.github.rixerpixer007.stuudium.debug' versionCode='11' versionName='0.1.7'\"",
  );
  expect(run().stderr).toContain("application ID/version");
  setTool(
    "aapt",
    "printf '%s\\n' \"package: name='io.github.rixerpixer007.stuudium' versionCode='10' versionName='0.1.6'\"",
  );
  expect(run().stderr).toContain("application ID/version");
  setTool(
    "aapt",
    "printf '%s\\n' \"package: name='io.github.rixerpixer007.stuudium' versionCode='11' versionName='0.1.7'\"",
  );
  setTool("apksigner", "exit 1");
  expect(run().status).not.toBe(0);
  expect(fs.existsSync(path.join(root, ".output"))).toBe(false);
});

test("rejects metadata for an already advertised code", () => {
  fs.writeFileSync(path.join(root, "release/android.json"), JSON.stringify({ versionCode: 11 }));
  expect(run().stderr).toContain("must exceed the published APK");
});

function runSigning() {
  fs.copyFileSync(
    new URL("../scripts/sign-android-release.sh", import.meta.url),
    path.join(root, "scripts/sign-android-release.sh"),
  );
  fs.mkdirSync(path.join(root, ".output/unsigned"), { recursive: true });
  fs.copyFileSync(apk, path.join(root, ".output/unsigned/app-release-unsigned.apk"));
  fs.mkdirSync(path.join(root, "runner-temp"));
  setTool("zipalign", 'cp "$5" "$6"');
  return spawnSync("bash", ["scripts/sign-android-release.sh"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      RUNNER_TEMP: path.join(root, "runner-temp"),
      ANDROID_HOME: path.join(root, "sdk"),
      ANDROID_SDK_ROOT: path.join(root, "sdk"),
      ANDROID_SIGNING_CERT_SHA256: fingerprint,
      ANDROID_KEYSTORE_BASE64: Buffer.from("fixture key bytes").toString("base64"),
      SINU_STUUDIUM_KEYSTORE_PASSWORD: "fixture-password",
      SINU_STUUDIUM_KEY_ALIAS: "fixture-alias",
      SINU_STUUDIUM_KEY_PASSWORD: "",
    },
  });
}

test("signing wrapper prepares APK and removes its temporary key directory on success", () => {
  setTool(
    "apksigner",
    `if [ "$1" = sign ]; then
    test -f "$3" || exit 1
    test "$SINU_STUUDIUM_KEYSTORE_PASSWORD" = fixture-password || exit 1
    test "$SINU_STUUDIUM_KEY_PASSWORD" = fixture-password || exit 1
    case "$*" in *env:SINU_STUUDIUM_KEYSTORE_PASSWORD*) ;; *) exit 1 ;; esac
    while [ "$#" -gt 0 ]; do
      if [ "$1" = --out ]; then shift; output=$1; fi
      input=$1
      shift
    done
    cp "$input" "$output"
  else
    printf '%s\\n' 'Signer #1 certificate SHA-256 digest: ${fingerprint}'
  fi`,
  );
  const result = runSigning();
  expect(result.status, result.stderr).toBe(0);
  expect(fs.readdirSync(path.join(root, "runner-temp"))).toEqual([]);
  expect(fs.readdirSync(path.join(root, ".output/release/android")).sort()).toEqual([
    "android.json",
    "tumevaade-v0.1.7.apk",
    "tumevaade-v0.1.7.apk.sha256",
  ]);
});

test("signing wrapper removes its temporary key directory even when signing fails", () => {
  setTool("apksigner", "exit 1");
  expect(runSigning().status).not.toBe(0);
  expect(fs.readdirSync(path.join(root, "runner-temp"))).toEqual([]);
  expect(fs.existsSync(path.join(root, ".output/release/android"))).toBe(false);
});
