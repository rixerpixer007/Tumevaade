import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { afterEach, expect, test } from "vitest";
import { formatVersions } from "../scripts/release-lib.mjs";
import { validatePublishedAndroid } from "../scripts/release-published-lib.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
const versions = { extensionVersion: "0.1.7", androidVersionName: "0.1.7", androidVersionCode: 11 };
const apkBytes = Buffer.from("published APK bytes");
const sha256 = createHash("sha256").update(apkBytes).digest("hex");
const candidate = {
  schemaVersion: 1,
  published: true,
  versionCode: 11,
  versionName: "0.1.7",
  releaseUrl: "https://github.com/rixerpixer007/Tumevaade/releases/tag/android-v0.1.7",
  sha256,
};
const args = {
  tag: "android-v0.1.7",
  metadata: candidate,
  versions,
  apkBytes,
  checksum: `${sha256}  tumevaade-v0.1.7.apk\n`,
  current: { versionCode: 10 },
};

test("activation accepts exact published files and never downgrades newer metadata", () => {
  expect(validatePublishedAndroid(args)).toBe(true);
  expect(validatePublishedAndroid({ ...args, current: candidate })).toBe(false);
  expect(validatePublishedAndroid({ ...args, current: { versionCode: 12 } })).toBe(false);
});

test("activation rejects mismatched bytes, checksum, tag, source, URL and conflicting active release", () => {
  const cases = [
    { apkBytes: Buffer.from("modified APK") },
    { checksum: "wrong" },
    { tag: "android-v0.1.8" },
    { versions: { ...versions, androidVersionCode: 12 } },
    { metadata: { ...candidate, releaseUrl: "https://example.com/download" } },
    { metadata: { ...candidate, published: false } },
    { current: { ...candidate, sha256: "b".repeat(64) } },
  ];
  for (const change of cases)
    expect(() => validatePublishedAndroid({ ...args, ...change })).toThrow();
});

function fixture(previous = { ...versions, androidVersionName: "0.1.6", androidVersionCode: 10 }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tumevaade-detect-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "release"));
  for (const name of ["release-lib.mjs", "release-detect-android.mjs"])
    fs.copyFileSync(
      new URL(`../scripts/${name}`, import.meta.url),
      path.join(root, "scripts", name),
    );
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_AUTHOR_NAME: "Test",
        GIT_AUTHOR_EMAIL: "test@example.invalid",
        GIT_COMMITTER_NAME: "Test",
        GIT_COMMITTER_EMAIL: "test@example.invalid",
      },
    }).trim();
  git("init", "--quiet");
  fs.writeFileSync(path.join(root, "release/android.json"), JSON.stringify({ versionCode: 10 }));
  if (previous)
    fs.writeFileSync(path.join(root, "release/version.properties"), formatVersions(previous));
  git("add", ".");
  git("commit", "--quiet", "-m", "Previous source");
  const before = git("rev-parse", "HEAD");
  const event = path.join(root, "event.json");
  const output = path.join(root, "output.txt");
  fs.writeFileSync(event, JSON.stringify({ before }));
  return {
    root,
    git,
    output,
    run(current, eventName = "push") {
      fs.writeFileSync(path.join(root, "release/version.properties"), formatVersions(current));
      fs.writeFileSync(output, "");
      return spawnSync(process.execPath, [path.join(root, "scripts/release-detect-android.mjs")], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: eventName,
          GITHUB_EVENT_PATH: event,
          GITHUB_OUTPUT: output,
        },
      });
    },
  };
}

test("push detector ignores extension-only bumps and compares the whole pushed range", () => {
  const f = fixture();
  expect(
    f.run({
      ...versions,
      extensionVersion: "0.1.8",
      androidVersionName: "0.1.6",
      androidVersionCode: 10,
    }).status,
  ).toBe(0);
  expect(fs.readFileSync(f.output, "utf8")).toContain("changed=false");
  // Intermediate commit represents a multi-commit push; event.before still anchors the full push.
  f.git("add", ".");
  f.git("commit", "--quiet", "-m", "Extension only");
  expect(f.run(versions).status).toBe(0);
  expect(fs.readFileSync(f.output, "utf8")).toContain("changed=true");
  expect(f.run({ ...versions, androidVersionCode: 10 }).status).not.toBe(0);
});

test("initial rollout does not rebuild the already published Android version", () => {
  const f = fixture(null);
  expect(f.run({ ...versions, androidVersionName: "0.1.6", androidVersionCode: 10 }).status).toBe(
    0,
  );
  expect(fs.readFileSync(f.output, "utf8")).toContain("changed=false");
  expect(f.run(versions).status).toBe(0);
  expect(fs.readFileSync(f.output, "utf8")).toContain("changed=true");
});

test("manual retry accepts an unreleased version and rejects an already active version", () => {
  const f = fixture();
  expect(f.run(versions, "workflow_dispatch").status).toBe(0);
  expect(fs.readFileSync(f.output, "utf8")).toContain("changed=true");
  expect(f.run({ ...versions, androidVersionCode: 10 }, "workflow_dispatch").status).not.toBe(0);
});
