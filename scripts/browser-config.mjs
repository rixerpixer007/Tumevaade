import { createHash } from "node:crypto";
import { chmod, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export const projectRoot = path.resolve(import.meta.dirname, "..");
export function getExtensionDirectory(build = process.env.TUMEVADE_BROWSER_BUILD ?? "development") {
  if (!["development", "production"].includes(build)) {
    throw new Error("TUMEVADE_BROWSER_BUILD must be development or production.");
  }
  return path.join(
    projectRoot,
    build === "development" ? ".output/chrome-mv3-dev" : ".output/chrome-mv3",
  );
}
export const browserDirectory = path.join(projectRoot, ".local/browser");
export const browserSession = `tumevaade-${createHash("sha256").update(projectRoot).digest("hex").slice(0, 8)}`;

export async function privateDirectory(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  return directory;
}

export async function readBuiltManifest(directory = getExtensionDirectory()) {
  try {
    return JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
  } catch (cause) {
    throw new Error(
      directory.endsWith("-dev")
        ? "Start npm run dev and keep it running before opening the testing browser."
        : "Build the extension first with npm run build.",
      { cause },
    );
  }
}

export function launchOptions(headless = true, directory = getExtensionDirectory()) {
  return {
    channel: "chromium",
    headless,
    args: [
      // Keep session-only cookies in this dedicated profile across browser restarts.
      "--restore-last-session",
      `--disable-extensions-except=${directory}`,
      `--load-extension=${directory}`,
    ],
  };
}
