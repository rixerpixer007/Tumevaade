import fs from "node:fs";

export function validateVersion(value) {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) ||
    value.split(".").some((part) => Number(part) > 65535) ||
    value === "0.0.0"
  ) {
    throw new Error("Use three numeric version parts from 0 to 65535, excluding 0.0.0.");
  }
  return value;
}

export function readVersions(file) {
  return parseVersions(fs.readFileSync(file, "utf8"));
}

export function parseVersions(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = /^(extensionVersion|androidVersionName|androidVersionCode)=(\S+)$/.exec(line);
    if (!match || Object.hasOwn(values, match[1]))
      throw new Error(`Invalid version property: ${line}`);
    values[match[1]] = match[2];
  }
  validateVersion(values.extensionVersion);
  validateVersion(values.androidVersionName);
  if (
    !/^[1-9]\d*$/.test(values.androidVersionCode) ||
    Number(values.androidVersionCode) > 2100000000
  ) {
    throw new Error("androidVersionCode must be an integer from 1 to 2100000000.");
  }
  return { ...values, androidVersionCode: Number(values.androidVersionCode) };
}

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  }
  return 0;
}

export function bumpVersions(current, version, target) {
  validateVersion(version);
  if (!["all", "extension", "android"].includes(target))
    throw new Error("Target must be all, extension, or android.");
  const next = { ...current };
  for (const [platform, key] of [
    ["extension", "extensionVersion"],
    ["android", "androidVersionName"],
  ]) {
    if (target !== "all" && target !== platform) continue;
    if (compareVersions(version, current[key]) <= 0)
      throw new Error(`${platform} version must increase from ${current[key]}.`);
    next[key] = version;
    if (platform === "android") {
      if (current.androidVersionCode >= 2100000000)
        throw new Error("Android version code exhausted.");
      next.androidVersionCode++;
    }
  }
  return next;
}

export function formatVersions(values) {
  return (
    "# Source versions. release/android.json describes the last published APK instead.\n" +
    `extensionVersion=${values.extensionVersion}\nandroidVersionName=${values.androidVersionName}\nandroidVersionCode=${values.androidVersionCode}\n`
  );
}
