import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { afterEach, beforeEach, expect, test } from "vitest";

let root;
const fingerprint = "a".repeat(64);
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "tumevaade-activate-"));
  for (const dir of ["scripts", "release", "bin", "sdk/build-tools/37.0.0"])
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  for (const name of [
    "release-lib.mjs",
    "release-published-lib.mjs",
    "release-activate-android.mjs",
    "android-apk.mjs",
  ])
    fs.copyFileSync(
      new URL(`../scripts/${name}`, import.meta.url),
      path.join(root, "scripts", name),
    );
  fs.writeFileSync(
    path.join(root, "release/version.properties"),
    "extensionVersion=0.1.7\nandroidVersionName=0.1.7\nandroidVersionCode=11\n",
  );
  fs.writeFileSync(path.join(root, "release/android.json"), '{"versionCode":10}');
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.invalid",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.invalid",
      },
    });
  git("init", "--quiet");
  git("add", ".");
  git("commit", "--quiet", "-m", "Release source");
  git("tag", "android-v0.1.7");
  const bytes = Buffer.from("public APK bytes");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const metadata = {
    schemaVersion: 1,
    published: true,
    versionCode: 11,
    versionName: "0.1.7",
    releaseUrl: "https://github.com/rixerpixer007/Tumevaade/releases/tag/android-v0.1.7",
    sha256: digest,
  };
  const assets = [
    ["tumevaade-v0.1.7.apk", bytes],
    ["tumevaade-v0.1.7.apk.sha256", `${digest}  tumevaade-v0.1.7.apk\n`],
    ["android.json", JSON.stringify(metadata)],
  ];
  const assetData = assets.map(([name, bytes], i) => {
    fs.writeFileSync(path.join(root, `asset-${i + 1}`), bytes);
    return { id: i + 1, name, size: Buffer.byteLength(bytes) };
  });
  fs.writeFileSync(
    path.join(root, "release-response.json"),
    JSON.stringify({
      tag_name: "android-v0.1.7",
      draft: false,
      published_at: "2026-11-18",
      prerelease: false,
      assets: assetData,
    }),
  );
  fs.writeFileSync(path.join(root, "event.json"), '{"release":{"id":123}}');
  fs.writeFileSync(
    path.join(root, "bin/gh"),
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.FIXTURE_ROOT;
const args = process.argv.slice(2);
const endpoint = args.find(a => a.startsWith('repos/'));
if (args.includes('PUT')) {
  if (endpoint !== 'repos/rixerpixer007/Tumevaade/contents/release/android.json') process.exit(1);
  fs.copyFileSync(args[args.indexOf('--input') + 1], path.join(root, 'api-update.json'));
  process.stdout.write('{}');
} else if (endpoint.endsWith('/releases/123')) {
  process.stdout.write(fs.readFileSync(path.join(root, 'release-response.json')));
} else if (endpoint.includes('/releases/assets/')) {
  process.stdout.write(fs.readFileSync(path.join(root, 'asset-' + endpoint.split('/').at(-1))));
} else if (endpoint.endsWith('/contents/release/android.json?ref=main')) {
  process.stdout.write(JSON.stringify({ sha: 'original-file-sha', content: Buffer.from('{"versionCode":10}').toString('base64') }));
} else process.exit(1);
`,
    { mode: 0o700 },
  );
  fs.writeFileSync(
    path.join(root, "sdk/build-tools/37.0.0/aapt"),
    `#!/bin/sh\nprintf '%s\\n' "package: name='io.github.rixerpixer007.stuudium' versionCode='11' versionName='0.1.7'"\n`,
    { mode: 0o700 },
  );
  fs.writeFileSync(
    path.join(root, "sdk/build-tools/37.0.0/apksigner"),
    `#!/bin/sh\nprintf '%s\\n' 'Signer #1 certificate SHA-256 digest: ${fingerprint}'\n`,
    { mode: 0o700 },
  );
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
function run(certificate = fingerprint) {
  return spawnSync(process.execPath, [path.join(root, "scripts/release-activate-android.mjs")], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH}`,
      FIXTURE_ROOT: root,
      GITHUB_REPOSITORY: "rixerpixer007/Tumevaade",
      GITHUB_EVENT_PATH: path.join(root, "event.json"),
      ANDROID_SDK_ROOT: path.join(root, "sdk"),
      ANDROID_SIGNING_CERT_SHA256: certificate,
    },
  });
}

test("publication verifies the downloaded release and updates only the expected metadata file on main", () => {
  const result = run();
  expect(result.status, result.stderr).toBe(0);
  const request = JSON.parse(fs.readFileSync(path.join(root, "api-update.json")));
  expect(request.branch).toBe("main");
  expect(request.sha).toBe("original-file-sha");
  const activated = JSON.parse(Buffer.from(request.content, "base64").toString());
  expect(activated.versionCode).toBe(11);
  expect(activated.sha256).toBe(
    createHash("sha256")
      .update(fs.readFileSync(path.join(root, "asset-1")))
      .digest("hex"),
  );
});

test("a tampered public APK or wrong certificate never reaches the metadata update API", () => {
  expect(run("b".repeat(64)).status).not.toBe(0);
  expect(fs.existsSync(path.join(root, "api-update.json"))).toBe(false);
  fs.writeFileSync(path.join(root, "asset-1"), "tampered public APK");
  expect(run().status).not.toBe(0);
  expect(fs.existsSync(path.join(root, "api-update.json"))).toBe(false);
});
