import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { afterEach, expect, test } from "vitest";
import {
  bumpVersions,
  formatVersions,
  readVersions,
  validateVersion,
} from "../scripts/release-lib.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
const current = { extensionVersion: "0.1.7", androidVersionName: "0.1.6", androidVersionCode: 10 };

test("bumps both platforms, with one increasing Android code", () => {
  expect(bumpVersions(current, "0.1.8", "all")).toEqual({
    extensionVersion: "0.1.8",
    androidVersionName: "0.1.8",
    androidVersionCode: 11,
  });
  expect(bumpVersions(current, "0.1.8", "extension")).toEqual({
    ...current,
    extensionVersion: "0.1.8",
  });
  expect(bumpVersions(current, "0.1.7", "android")).toEqual({
    ...current,
    androidVersionName: "0.1.7",
    androidVersionCode: 11,
  });
});

test("rejects repeated releases, backwards versions, invalid formats and exhausted codes", () => {
  for (const version of ["0.1.7", "0.1.5"])
    expect(() => bumpVersions(current, version, "all")).toThrow();
  for (const version of ["1.2", "01.2.3", "1.2.3-beta", "65536.1.1", "0.0.0"])
    expect(() => validateVersion(version)).toThrow();
  expect(() =>
    bumpVersions({ ...current, androidVersionCode: 2100000000 }, "0.2.0", "android"),
  ).toThrow();
});

test("CLI syncs mirrors, detects drift, and never edits published updater metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tumevaade-release-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "release"));
  for (const name of ["release-lib.mjs", "release-version.mjs"])
    fs.copyFileSync(
      new URL(`../scripts/${name}`, import.meta.url),
      path.join(root, "scripts", name),
    );
  const source = path.join(root, "release/version.properties");
  fs.writeFileSync(source, formatVersions(current));
  const published = JSON.stringify({ versionCode: 10, versionName: "0.1.6", published: true });
  fs.writeFileSync(path.join(root, "release/android.json"), published);
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "0.1.7" }));
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({ version: "0.1.7", packages: { "": { version: "0.1.7" } } }),
  );
  const cli = path.join(root, "scripts/release-version.mjs");
  execFileSync(process.execPath, [cli, "bump", "0.1.8"]);
  expect(readVersions(source).androidVersionCode).toBe(11);
  expect(
    JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"))).packages[""].version,
  ).toBe("0.1.8");
  expect(fs.readFileSync(path.join(root, "release/android.json"), "utf8")).toBe(published);
  fs.writeFileSync(path.join(root, "package.json"), '{"version":"0.0.1"}');
  expect(spawnSync(process.execPath, [cli, "check"]).status).not.toBe(0);
  execFileSync(process.execPath, [cli, "sync"]);
  execFileSync(process.execPath, [cli, "check"]);
  const before = fs.readFileSync(source, "utf8");
  expect(spawnSync(process.execPath, [cli, "bump", "0.1.7"]).status).not.toBe(0);
  expect(fs.readFileSync(source, "utf8")).toBe(before);
  fs.appendFileSync(source, "androidVersionCode=12\n");
  expect(() => readVersions(source)).toThrow();
});
