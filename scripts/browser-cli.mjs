import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  browserDirectory,
  browserSession,
  getExtensionDirectory,
  launchOptions,
  privateDirectory,
  projectRoot,
  readBuiltManifest,
} from "./browser-config.mjs";

const [command = "--help", ...rest] = process.argv.slice(2);
const opening = command === "open" || command === "login";
const args = ["cli", `-s=${browserSession}`];

if (opening) {
  const extensionDirectory = getExtensionDirectory();
  await readBuiltManifest(extensionDirectory);
  console.log(`Testing extension: ${extensionDirectory}`);
  if (extensionDirectory.endsWith("-dev")) {
    try {
      const response = await fetch("http://localhost:3000/@vite/client", {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok || !(await response.text()).includes("WebSocket"))
        throw new Error("Vite is unavailable");
    } catch (cause) {
      throw new Error(
        "Start npm run dev in this worktree and keep it running. The development server must be available on localhost:3000.",
        { cause },
      );
    }
  }
  await privateDirectory(browserDirectory);
  const profile = await privateDirectory(path.join(browserDirectory, "profile"));
  const output = await privateDirectory(path.join(browserDirectory, "output"));
  const configPath = path.join(browserDirectory, "cli.config.json");
  await writeFile(
    configPath,
    JSON.stringify({
      browser: {
        browserName: "chromium",
        userDataDir: profile,
        launchOptions: launchOptions(command !== "login", extensionDirectory),
        contextOptions: { viewport: { width: 1440, height: 900 } },
      },
      outputDir: output,
      outputMode: "file",
      console: { level: "warning" },
    }),
    { mode: 0o600 },
  );
  args.push(
    "open",
    command === "login" ? "https://torg.ope.ee/" : (rest.shift() ?? "about:blank"),
    `--config=${configPath}`,
    `--profile=${profile}`,
    ...rest,
  );
} else {
  args.push(command, ...rest);
}

// Use the pinned local CLI; do not invoke npx or install anything implicitly.
const child = spawn(
  process.execPath,
  [path.join(projectRoot, "node_modules/playwright/cli.js"), ...args],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
